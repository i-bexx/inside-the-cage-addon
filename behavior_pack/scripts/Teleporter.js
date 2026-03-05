import { world, system } from "@minecraft/server";
import { MessageFormData, FormCancelationReason } from "@minecraft/server-ui";


// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================

const CONFIG = {
    entityType: "game:teleporter",
    tagPrefix: "TeleporterID:",
    cooldownTime: 7000,
    checkInterval: 20  
};

const DIMENSION = world.getDimension("overworld");
const cooldowns = new Map();

// ==========================================
// MAIN SYSTEM
// ==========================================

system.runInterval(() => {
    try {
        const unlinkedEntities = getUnlinkedEntities();

        // Process them in pairs
        while (unlinkedEntities.length >= 2) {
            const entityA = unlinkedEntities.pop();
            const entityB = unlinkedEntities.pop();

            if (!entityA || !entityB) break;

            // Generate a unique ID based on Entity A
            const linkId = generateUniqueLinkTag(entityA);

            // Apply tags to both entities
            entityA.addTag(linkId);
            entityA.addTag("linked");

            entityB.addTag(linkId);
            entityB.addTag("linked");
        }
    } catch (e) {
        console.warn("Teleporter matching error:", e);
    }
}, CONFIG.checkInterval);

function teleportPlayer(player, targetEntity) {
    const now = Date.now();
    const lastTeleport = cooldowns.get(player.id) || 0;

    // Cooldown Check
    if (now < lastTeleport) {
        const remaining = Math.ceil((lastTeleport - now) / 1000);

        player.sendMessage(`§cTeleporter is cooling down. Please wait ${remaining} seconds.`);
        player.runCommand("playsound note.bass @s");
        return;
    }

    player.tryTeleport(targetEntity.location);
    
    // Update Cooldown
    cooldowns.set(player.id, now + CONFIG.cooldownTime);
}

// ==========================================
// EVENTS
// ==========================================

world.afterEvents.playerInteractWithEntity.subscribe(({ player, target }) => {
    if (target.typeId !== CONFIG.entityType) return;
    if (player.typeId !== "minecraft:player") return;

    const partner = getPartner(target);

    if (!partner) {
        player.sendMessage("§cNo partner found for this teleporter (It might be unloaded or destroyed).");
        player.runCommand("playsound note.bass @s");
        return;
    }

    // If partner exists, show the UI
    showTeleportUI(player, partner);
});


world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
    if (deadEntity.typeId !== CONFIG.entityType) return;

    // Find the partner of the dead entity
    const partner = getPartner(deadEntity);

    // If a partner exists, remove its tags so it becomes "unlinked".
    // This allows it to find a NEW partner in the next loop.
    if (partner) {
        const linkTag = getLinkTag(partner);
        if (linkTag) partner.removeTag(linkTag);
        partner.removeTag("linked");
    }
});

// ==========================================
// UI FUNCTIONS
// ==========================================

function showTeleportUI(player, targetEntity) {
    new MessageFormData()
        .title("Teleporter")
        .body("Do you want to teleport?")
        .button1("No")
        .button2("Yes")
        .show(player).then(({ cancelationReason, canceled, selection }) => {
            if (canceled || cancelationReason === FormCancelationReason.UserBusy) return;

            // Button 2 (Yes) corresponds to selection index 1
            if (selection === 1) {
                teleportPlayer(player, targetEntity);
            }
        });
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * @returns {Entity[]} Array of unlinked entities
 */

function getUnlinkedEntities() {
    return DIMENSION.getEntities({
        type: CONFIG.entityType,
        excludeTags: ["linked"]
    });
}

/**
 * @param {Entity} entity
 * @returns {Entity} Matched teleporter
 */

function getPartner(entity) {
    const linkTag = getLinkTag(entity);
    if (!linkTag) return null;

    const partners = DIMENSION.getEntities({
        type: CONFIG.entityType,
        tags: [linkTag]
    });

    // Returns the other pair
    return partners.find(p => p.id !== entity.id);
}

/**
 * @param {Entity} entity
 * @returns {Id} Id
 */

function generateUniqueLinkTag(entity) {
    const compressedId = parseInt(entity.id).toString(36);
    return `${CONFIG.tagPrefix}${compressedId}`;

}

/**
 * @param {Entity} entity
 * @returns {Tag} Matched tag
 */

function getLinkTag(entity) {
    return entity.getTags().find(tag => tag.startsWith(CONFIG.tagPrefix));
}

export function getTeleportCooldown() { return cooldowns; }