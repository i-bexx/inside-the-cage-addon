import { world, system } from "@minecraft/server";

import { getPlayersInRound } from "./getPlayersArray";
import { getSoulsFreedObjective, getSanityObjective, getStaminaObjective, getValueParticipant, getObjectiveScore } from "./Scoreboards";

// =============================================================
// CONFIGURATION & CONSTANTS
// =============================================================

const CONFIG = {
    ITEMS: {
        CAMERA: "game:camera",
        CAMERA_OFF: "game:camera_turn_off"
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
        CLEAR_CAM: "clear @s game:camera",
        REPLACE_OFF: "replaceitem entity @s slot.hotbar 8 game:camera_turn_off 1",
        STOP_SHUTTER: "stopsound @s camera_shutter",
        STOP_STATIC: "stopsound @s static_low_sanity",
        PLAY_INIT_SOUND: "playsound initializationBeforeLockingTheCam @s",
        CLEAR_WARNING: "clear @s game:turnoffcamwarning"
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

let soulsFreedObjective;
let sanityObjective;
let staminaObjective;
let valueParticipant;

let soulsFreedValue = 0;
let timeoutId = 0;
let isInitialized = false; // Flag to track if the system is ready

// Runs immediately when the world loads to initialize scoreboards.
function initialFunction() {
	if (isInitialized) return;
	
	try {
		soulsFreedObjective = getSoulsFreedObjective();
    sanityObjective = getSanityObjective();
    staminaObjective = getStaminaObjective();

    // Safety Check: Ensure all objectives exist
    if (!(soulsFreedObjective && sanityObjective && staminaObjective)) return; 
    
    valueParticipant = getValueParticipant();

    // Safety Check: Ensure participant exists
    if (!valueParticipant) return;
    
		isInitialized = true;

    soulsFreedValue = getObjectiveScore(soulsFreedObjective, valueParticipant);
	} catch(e) {}
}

// Run initialization immediately
system.run(initialFunction);

// If scoreboard objective or participant is not loaded, this loop will define them
let scoreSecurityInterval = system.runInterval(() => {
    if (!isInitialized) {
        initialFunction();
        return;
    } else system.clearRun(scoreSecurityInterval);
}, 40);

// If player does not turn on the camera in the given time, function will force them to
export function initiateCam() {
    timeoutId = system.runTimeout(() => {
        soulsFreedValue = getObjectiveScore(soulsFreedObjective, valueParticipant);

        // If game is in end-phase (4 or 5 souls), do not force camera usage.
        if (soulsFreedValue === CONFIG.THRESHOLDS.UNLOCK_MIN || soulsFreedValue === CONFIG.THRESHOLDS.UNLOCK_MAX) return;

        const players = getPlayersInRound();

        for (const player of players) {
            const isUsingCam = player.getDynamicProperty(CONFIG.PROPERTIES.IS_USING);

            // Skip if player is already using the camera
            if (isUsingCam) continue;

            const sanityValue = getObjectiveScore(sanityObjective, player.scoreboardIdentity);
            const staminaValue = getObjectiveScore(staminaObjective, player.scoreboardIdentity);

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
    player.runCommand(CONFIG.COMMANDS.CLEAR_CAM);
    player.setDynamicProperty(CONFIG.PROPERTIES.IS_USING, true);

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
        // If allowed, give the 'Turn Off' item
        player.runCommand(CONFIG.COMMANDS.REPLACE_OFF);
    }
    
    // --- SPECIAL ANIMATION (Before Locking) ---
    if (initializationBeforeLockingTheCam) {
        player.triggerEvent(CONFIG.EVENTS.INIT_LOCK);
        player.runCommand(CONFIG.COMMANDS.PLAY_INIT_SOUND);
        
        system.runTimeout(() => {
            if (player.isValid()) {
								player.triggerEvent(CONFIG.EVENTS.STATIC);
                player.setDynamicProperty(CONFIG.PROPERTIES.INIT_BEFORE_LOCK, false);
            }
        }, 18);
    }
}

/**
 * Logic for turning the camera off.
 * Clears effects and restores the original camera item.
 */
function cameraDeused(player) {
    const stamina = getObjectiveScore(staminaObjective, player.scoreboardIdentity);
    let isStaminaEmpty = stamina === 0;

    // Execute all turn-off commands defined in CONFIG
    // Using explicit commands here to ensure clarity
    const turnOffCommands = [
        CONFIG.COMMANDS.CLEAR_CAM, // Just in case
        `replaceitem entity @s slot.hotbar 8 ${CONFIG.ITEMS.CAMERA} 1`, // Give camera back
        CONFIG.COMMANDS.STOP_SHUTTER,
        CONFIG.COMMANDS.STOP_STATIC
    ];

    turnOffCommands.forEach(cmd => player.runCommand(cmd));

    // Reset player state
    player.triggerEvent(CONFIG.EVENTS.NORMAL);
    player.setDynamicProperty(CONFIG.PROPERTIES.IS_USING, false);

    if (isStaminaEmpty) player.triggerEvent(CONFIG.EVENTS.SLOWNESS);

    // Handle warning flags
    let didPlayerGetWarning = player.getDynamicProperty(CONFIG.PROPERTIES.TOLD_WARNING);

    if (didPlayerGetWarning) {
        player.runCommand(CONFIG.COMMANDS.CLEAR_WARNING);
        player.setDynamicProperty(CONFIG.PROPERTIES.WILL_GET_NO_SIGNAL, true);
    }
}

// =============================================================
// EVENT LISTENERS
// =============================================================

// Detect if player is using a camera item
world.afterEvents.itemUse.subscribe(({source, itemStack}) => {
    if (itemStack.typeId === CONFIG.ITEMS.CAMERA) {
        const sanityValue = getObjectiveScore(sanityObjective, source.scoreboardIdentity);
        const staminaValue = getObjectiveScore(staminaObjective, source.scoreboardIdentity);

        cameraUsed(source, sanityValue, staminaValue);

    } else if (itemStack.typeId === CONFIG.ITEMS.CAMERA_OFF) {
        cameraDeused(source);
    }
});

export function getInitiateCamId() {
    return timeoutId;
}