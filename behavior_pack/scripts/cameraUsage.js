import { world, system } from "@minecraft/server";
import { ItemStack, ItemLockMode, EntityComponentTypes, EquipmentSlot } from "@minecraft/server";

import { getPlayersInRound } from "./utils";
import { PlayerCache } from "./Player/playerCache";
import { getSoulsFreedObjective, getSanityObjective, getValueParticipant, getObjectiveScore } from "./scoreboards";

// =============================================================
// CONFIGURATION & CONSTANTS
// =============================================================

const CONFIG = {
    ITEMS: {
        CAMERA: "ibexx_itc:camera",
        CAMERA_OFF: "ibexx_itc:camera_turn_off",
        WARNING: "ibexx_itc:turnoffcamwarning"
    },
    EVENTS: {
        STATIC: "static_event",
        STATIC_MOVEMENT: "static_movement_event",
        STATIC_NO_SIGNAL: "camera_no_signal_event",
        STATIC_LOW_SANITY: "static_low_sanity_event",
        INIT_LOCK: "initializationBeforeLockingTheCamEvent",

        SLOWNESS: "slowness_event",
        NORMAL: "normal_event"
    },
    COMMANDS: {
        STOP_SHUTTER: "stopsound @s ibexx_itc:camera_shutter",
        STOP_STATIC: "stopsound @s ibexx_itc:static_low_sanity"
    },
    SOUNDS: {
        INIT_SOUND: "ibexx_itc:initializationBeforeLockingTheCam"
    },
    PROPERTIES: {
        IS_USING: "camUsing",
        TOLD_WARNING: "toldPlayerTurnOffCam",
        WILL_GET_NO_SIGNAL: "nowPlayerWillGetNoSignal",
        CAN_TURN_OFF: "canTurnOffCam",
        INIT_BEFORE_LOCK: "initializationBeforeLockingTheCam"
    },
    THRESHOLDS: {
        LOW_SANITY: 33,
        UNLOCK_MIN: 4,
        UNLOCK_MAX: 5
    }
};

// =============================================================
// GLOBAL VARIABLES
// =============================================================

let soulsFreedValue = 0;
let timeoutId = undefined;

// If player does not turn on the camera in the given time, function will force them to
export function initiateCam() {
    if (timeoutId !== undefined) return;

    timeoutId = system.runTimeout(() => {
        soulsFreedValue = getObjectiveScore(getSoulsFreedObjective(), getValueParticipant());

        // If game is in end-phase (4 or 5 souls), do not force camera usage.
        if (soulsFreedValue === CONFIG.THRESHOLDS.UNLOCK_MIN || soulsFreedValue === CONFIG.THRESHOLDS.UNLOCK_MAX) return;

        const players = getPlayersInRound();

        for (const player of players) {
            const isUsingCam = PlayerCache.get(player.id)?.camUsing;

            // Skip if player is already using the camera
            if (isUsingCam) continue;

            const sanityValue = getObjectiveScore(getSanityObjective(), player.scoreboardIdentity);
            const staminaValue = PlayerCache.get(player.id)?.stamina;

            // Force camera usage
            cameraUsed(player, sanityValue, staminaValue);
        }
    }, 500);
}

/**
 * Main logic when the camera is activated.
 * Handles events, visual effects, and determines if the camera can be turned off.
 */
export function cameraUsed(player, sanityValue, staminaValue) {
    let toldPlayerTurnOffCam = player.getDynamicProperty(CONFIG.PROPERTIES.TOLD_WARNING);
    let willPlayerGetNoSignalNow = player.getDynamicProperty(CONFIG.PROPERTIES.WILL_GET_NO_SIGNAL);
    let initializationBeforeLockingTheCam = player.getDynamicProperty(CONFIG.PROPERTIES.INIT_BEFORE_LOCK);
    let isStaminaEmpty = staminaValue === 0;

    // Check if the camera can be unlocked (Souls = 4 or 5)
    let canPlayerTurnOffCam = player.getDynamicProperty(CONFIG.PROPERTIES.CAN_TURN_OFF);

    // Remove the camera item from inventory and mark as using
    clearCameraItem(player);
    const cache = PlayerCache.get(player.id);
    if (cache) cache.camUsing = true;

    // --- VISUAL EFFECTS LOGIC ---
    if (!toldPlayerTurnOffCam) { 
        // Scenario 1: First time using camera
        player.triggerEvent(CONFIG.EVENTS.STATIC);
        player.playAnimation("camera_start_anim");
    } else if (willPlayerGetNoSignalNow) { 
        // Scenario 2: Triggers "No Signal" event
        player.triggerEvent(CONFIG.EVENTS.STATIC_NO_SIGNAL);
    } else if (sanityValue <= CONFIG.THRESHOLDS.LOW_SANITY) { 
        // Scenario 3: Low Sanity
        player.triggerEvent(CONFIG.EVENTS.STATIC_LOW_SANITY);
    } else {
        // Scenario 4: Standard usage
        player.triggerEvent(CONFIG.EVENTS.STATIC);
    }

    // Give the player speed based on their stamina
    isStaminaEmpty ? player.triggerEvent(CONFIG.EVENTS.SLOWNESS) : player.triggerEvent(CONFIG.EVENTS.STATIC_MOVEMENT);

    if (canPlayerTurnOffCam) { 
        // If allowed, give the 'Turn Off' item in hotbar slot 8
        setHotbarSlot8Item(player, CONFIG.ITEMS.CAMERA_OFF);
    }
    
    // --- SPECIAL ANIMATION (Before Locking) ---
    if (initializationBeforeLockingTheCam) {
        player.triggerEvent(CONFIG.EVENTS.INIT_LOCK);
        player.playSound(CONFIG.SOUNDS.INIT_SOUND);
        
        system.runTimeout(() => {
            if (!player || !player.isValid) return;
            
            player.triggerEvent(CONFIG.EVENTS.STATIC);
            player.setDynamicProperty(CONFIG.PROPERTIES.INIT_BEFORE_LOCK, false);
        }, 6);
    }
}

/**
 * Logic for turning the camera off.
 * Clears effects and restores the original camera item.
 */
export function cameraDeactivated(player, turnedoffAutomatically = false) {
    const stamina = PlayerCache.get(player.id)?.stamina;
    let isStaminaEmpty = stamina === 0;

    const stopCameraEffects = [
        CONFIG.COMMANDS.STOP_SHUTTER,
        CONFIG.COMMANDS.STOP_STATIC
    ];

    if (!turnedoffAutomatically) {
        clearCameraItem(player);
        setHotbarSlot8Item(player, CONFIG.ITEMS.CAMERA);
    }
    stopCameraEffects.forEach(cmd => player.runCommand(cmd));

    // Reset player state
    player.triggerEvent(CONFIG.EVENTS.NORMAL);
    const cache = PlayerCache.get(player.id);
    if (cache) cache.camUsing = false;

    if (isStaminaEmpty) player.triggerEvent(CONFIG.EVENTS.SLOWNESS);

    // Handle warning flags
    let didPlayerGetWarning = player.getDynamicProperty(CONFIG.PROPERTIES.TOLD_WARNING);

    if (didPlayerGetWarning && !turnedoffAutomatically) {
        const equippable = player.getComponent(EntityComponentTypes.Equippable);
        if (equippable.getEquipment(EquipmentSlot.Chest)?.typeId === CONFIG.ITEMS.WARNING) {
            equippable.setEquipment(EquipmentSlot.Chest, undefined);
        }
        player.setDynamicProperty(CONFIG.PROPERTIES.WILL_GET_NO_SIGNAL, true);
    }
}

// =============================================================
// INVENTORY HELPERS
// =============================================================

function clearCameraItem(player) {
    const container = player.getComponent(EntityComponentTypes.Inventory).container;
    const camSearch = new ItemStack(CONFIG.ITEMS.CAMERA, 1);
    camSearch.lockMode = ItemLockMode.inventory; // Must match the locked camera!

    const slot = container.find(camSearch);
    if (slot !== undefined) container.setItem(slot, undefined);
}

function setHotbarSlot8Item(player, typeId) {
    const container = player.getComponent(EntityComponentTypes.Inventory).container;
    const item = new ItemStack(typeId, 1);
    item.lockMode = ItemLockMode.inventory;
    container.setItem(8, item);
}

// =============================================================
// EVENT LISTENERS
// =============================================================

// Detect if player is using a camera item
world.afterEvents.itemUse.subscribe(({source, itemStack}) => {
    if (itemStack.typeId === CONFIG.ITEMS.CAMERA) {
        const sanityValue = getObjectiveScore(getSanityObjective(), source.scoreboardIdentity);
        const staminaValue = PlayerCache.get(source.id)?.stamina;

        cameraUsed(source, sanityValue, staminaValue);
        stopInitiateCam();

    } else if (itemStack.typeId === CONFIG.ITEMS.CAMERA_OFF) {
        cameraDeactivated(source);
    }
});

export function stopInitiateCam() {
    if (timeoutId == undefined) return;
    system.clearRun(timeoutId);
    timeoutId = undefined;
}
