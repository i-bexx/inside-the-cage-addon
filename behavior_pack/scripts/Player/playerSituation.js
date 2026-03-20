import { world, system } from "@minecraft/server";

import { getAmmoObjective, getUsedToxicBombObjective, getObjectiveScore } from "../scoreboards";
import { getAllPlayers } from "../getPlayersArray";

// =============================================================================
// CONFIGURATION AND CONSTANTS
// =============================================================================
const CONFIG = {
    DIMENSION: "overworld",
    TAGS: {
        IN_GAME: "in_game",
    },
    ITEMS: {
        KNIFE: "game:knife",
        GUN: "game:gun",
        WATER_ARMOR: "p:in_water",
        STRAFE_LEFT: "p:move_left",
        STRAFE_RIGHT: "p:move_right",
        BLOOD_PARTICLE: "game:blood",
        TOXIC_PARTICLE: "game:toxic",
        DEAD_ENTITY: "game:hostile_dead",
    },
    BLOCKS: {
        WATER: "minecraft:water",
        FLOWING_WATER: "minecraft:flowing_water",
    },
    THRESHOLDS: {
        STRAFE_SPEED: 0.2,
        AMMO_LOW: 3,
    }
};

const DIMENSION = world.getDimension(CONFIG.DIMENSION);

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

let objectives = {
    ammo: null,
    toxic: null,
    isInitialized: false
};

function initialFunction() {
    try {
        objectives.ammo = getAmmoObjective();
        objectives.toxic = getUsedToxicBombObjective();

        if (objectives.ammo && objectives.toxic) {
            objectives.isInitialized = true;
            return true;
        }
    } catch (e) {}
    return false;
}

// =============================================================================
// LOGIC HANDLERS
// =============================================================================

function handleStrafeAnimation(player) {
    // --------- GUARD CLAUSE ---------
    if (player.getDynamicProperty("camUsing")) return;

    const rotation = player.getRotation().y * (Math.PI / 180);
    const v = player.getVelocity();
    
    const strafeSpeed = v.x * Math.cos(rotation) + v.z * Math.sin(rotation);
    
    let targetItem = null;
    if (strafeSpeed > CONFIG.THRESHOLDS.STRAFE_SPEED) {
        targetItem = CONFIG.ITEMS.STRAFE_LEFT;
    } else if (strafeSpeed < -CONFIG.THRESHOLDS.STRAFE_SPEED) {
        targetItem = CONFIG.ITEMS.STRAFE_RIGHT;
    }

    updateEquipment(player, "Legs", targetItem);
}

function handleCombatLogic(player) {
    // --------- GUARD CLAUSE ---------
    if (!player.scoreboardIdentity) return;

    const mainHand = getEquipment(player, "Mainhand");
    
    // --- Clear Offhand ---
    const isHoldingWeapon = mainHand?.typeId === CONFIG.ITEMS.KNIFE || mainHand?.typeId === CONFIG.ITEMS.GUN;

    if (isHoldingWeapon) updateEquipment(player, "Offhand", null);
    

    // --- Toxic Bomb Logic ---
    const bombScore = getObjectiveScore(objectives.toxic, player.scoreboardIdentity);
    if (bombScore === 1) {
        player.runCommand(`execute at @s run particle ${CONFIG.ITEMS.TOXIC_PARTICLE} ~ ~ ~`);
        player.runCommand("execute at @s run kill @e[type=game:hostile,r=15]");
    }

    // --- Ammo UI Logic ---
    if (mainHand?.typeId === CONFIG.ITEMS.GUN) {
        const ammo = getObjectiveScore(objectives.ammo, player.scoreboardIdentity);
        
        if (ammo > 0) {
					const color = ammo > CONFIG.THRESHOLDS.AMMO_LOW ? "§h" : "§c"; 
					player.runCommand(`title @s actionbar §lAmmo: > ${color}${ammo} §f<`);    
        }
        
    }
}

// =============================================================================
// 5. MAIN LOOP
// =============================================================================

system.run(initialFunction);


const initInterval = system.runInterval(() => {
    if (objectives.isInitialized) {
        system.clearRun(initInterval);
    } else {
        initialFunction();
    }
}, 40);

// --------- GAME LOOP ---------
system.runInterval(() => {
    if (!objectives.isInitialized) return;

    const players = getAllPlayers();
    for (const player of players) {
        handleStrafeAnimation(player);
        handleCombatLogic(player);
    }
});

// =============================================================================
// 6. EVENT LISTENERS
// =============================================================================

world.afterEvents.entityHitEntity.subscribe((event) => {
    const { damagingEntity, hitEntity } = event;
    
    if (damagingEntity.typeId !== "minecraft:player") return;

    const mainHand = getEquipment(damagingEntity, "Mainhand");

    if (mainHand?.typeId === CONFIG.ITEMS.KNIFE && hitEntity.typeId !== CONFIG.ITEMS.DEAD_ENTITY) {
        const particleLoc = { 
            x: hitEntity.location.x, 
            y: hitEntity.location.y + 1, 
            z: hitEntity.location.z 
        };

        damagingEntity.runCommand("playsound knife_slice @s");
        DIMENSION.spawnParticle(CONFIG.ITEMS.BLOOD_PARTICLE, particleLoc);
    }
});


// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getEquipment(player, slotName) {
    const component = player.getComponent("minecraft:equippable");
    return component?.getEquipment(slotName);
}


function updateEquipment(player, slotName, targetItemId) {
    const currentItem = getEquipment(player, slotName)?.typeId;

    // Optimization: Exit if the player already has the correct item
    if (currentItem === targetItemId) return;

    // Convert simple slot name to command format
    let commandSlot = "";
    if (slotName === "Chest") commandSlot = "slot.armor.chest";
    else if (slotName === "Legs") commandSlot = "slot.armor.legs";
    else if (slotName === "Offhand") commandSlot = "slot.weapon.offhand";
    else return;

    if (targetItemId) {
        player.runCommand(`replaceitem entity @s ${commandSlot} 1 ${targetItemId}`);
    } 
    else if (currentItem && (currentItem.startsWith("p:") || slotName === "Offhand")) {
        player.runCommand(`replaceitem entity @s ${commandSlot} 1 air`);
    }
}