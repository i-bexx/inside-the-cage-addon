import { world } from "@minecraft/server";

import { getAmmoObjective, getObjectiveScore } from "../scoreboards";

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
        DEAD_ENTITY: "game:ghost_dead",
    },
    THRESHOLDS: {
        AMMO_LOW: 3,
    }
};


export const MAIN_HAND_CACHE = new Map();
const equipmentCache = new Map();
let dimension;


export function handleCombatLogic(player, playerState) {
    const mainHandTypeId = playerState.mainHandTypeId;
    
    // --- Clear Offhand ---
    const isHoldingWeapon = mainHandTypeId === CONFIG.ITEMS.KNIFE || mainHandTypeId === CONFIG.ITEMS.GUN;

    if (isHoldingWeapon) updateEquipment(player, "Offhand", null);

    // --- Ammo UI Logic ---
    if (mainHandTypeId === CONFIG.ITEMS.GUN) {
        const ammo = getObjectiveScore(getAmmoObjective(), player.scoreboardIdentity);
        
        if (ammo > 0) {
            const color = ammo > CONFIG.THRESHOLDS.AMMO_LOW ? "§h" : "§c"; 
            player.runCommand(`title @s actionbar §lAmmo: > ${color}${ammo} §f<`);    
        }
        
    }
}


world.afterEvents.itemUse.subscribe(({itemStack, source}) => {
    if (itemStack.typeId != "game:gun" || (source.getItemCooldown("gun") < 11 && getObjectiveScore(getAmmoObjective(), source.scoreboardIdentity) > 0))
        return;
    source.setProperty("property:is_shooting", true);
});

world.afterEvents.playerHotbarSelectedSlotChange.subscribe((event) => {
    const item = event.itemStack;
    MAIN_HAND_CACHE.set(event.player.id, item ? item.typeId : null);
});



function updateEquipment(player, slotName, targetItemId) {
    let cache = equipmentCache.get(player.id);
    if (!cache) {
        cache = {};
        equipmentCache.set(player.id, cache);
    }

    let currentItem = cache[slotName];

    if (currentItem === undefined) {
        const comp = player.getComponent("minecraft:equippable");
        currentItem = comp?.getEquipment(slotName)?.typeId || null;
        cache[slotName] = currentItem;
    }

    const target = targetItemId || null;

    if (currentItem === target) return;

    let commandSlot = "";
    if (slotName === "Chest") commandSlot = "slot.armor.chest";
    else if (slotName === "Legs") commandSlot = "slot.armor.legs";
    else if (slotName === "Offhand") commandSlot = "slot.weapon.offhand";
    else return;

    if (target) {
        player.runCommand(`replaceitem entity @s ${commandSlot} 1 ${target} 1 0 {"minecraft:item_lock": {"mode": "lock_in_inventory"}}`);
    } 
    else if (currentItem && (currentItem.startsWith("p:") || slotName === "Offhand")) {
        player.runCommand(`replaceitem entity @s ${commandSlot} 1 air`);
    }

    // Yeni durumu RAM'e kaydet
    cache[slotName] = target;
}

export function setGlobalVariables() { dimension = world.getDimension(CONFIG.DIMENSION); }