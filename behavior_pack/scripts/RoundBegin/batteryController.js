import { world, system } from "@minecraft/server";
import { getPlayersInRound } from "../getPlayersArray";

// =============================================================
// CONFIGURATION AND CONSTANTS
// =============================================================

const BATTERY_CONFIG = {
    // Time Settings (In Ticks)
    TIME: {
        UPDATE_INTERVAL: 10,
        DRAIN_DURATION_DEFAULT: 6000,
        DRAIN_DURATION_UPGRADED: 8000,
        CRITICAL_WARNING: 4500,
        HUD_ANIMATION: 40
    },
    // Battery Values
    LEVELS: {
        MAX: 4,                    // Maximum battery
        MIN: -1,                   // Fully drained (Static effect)
        CRITICAL: 0,               // Critical level
        DEFAULT: 4                 // Default when player joins
    },
    // Dynamic Property Names
    PROPERTIES: {
        LEVEL: "batteryLevel",
        IS_DRAINING: "batteryIsDraining",
        IS_FULLY_DRAINED: "batteryIsFullyDrained",
        IS_COLLECTED: "batteryIsCollected",
        IS_UPGRADED: "batteryIsUpgraded"
    },
    // In-Game Event Names
    EVENTS: {
        NO_SIGNAL: "camera_no_signal_event",
        NOT_FULL: "battery_is_not_full_event",
        FULL: "battery_is_full_event",
        STATIC_START: "static_event",
        STATIC_MOVEMENT: "static_movement_event"
    },
    // Item and Command Names
    ITEMS: {
        ENTITY_ID: "game:battery",
        HUD_SLOT: "slot.armor.head",
        // Item names
        PREFIX_INCREASE: "battery:increase",
        PREFIX_DECREASE: "battery:decrease",
        PREFIX_CRITICAL: "battery:isCritical",
        // Offset for texture calculation (5 - battery value)
        TEXTURE_OFFSET: 5 
    }
};

// =============================================================
// VARIABLES AND MAPS
// =============================================================

let intervalId = 0;

// Maps
const playerStates = new Map();
const playerDrainingBattery = new Map();
const playerIsBatteryCritical = new Map();

// =============================================================
// STATE MANAGEMENT
// =============================================================

function getBatteryState(player) {
    let state = playerStates.get(player.id)
    if (state) return state;

    let batteryState = {
        batteryIsDrainingOfPlayer: undefined,
        batteryIsFullyDrainedOfPlayer: false
    }
    
    state = new Proxy({ ...batteryState }, {
        set(target, key, value) {
            // Proxy Protection: Do nothing if the value is the same
            if (target[key] === value) return true;
            
            target[key] = value;

            let batteryIsDrainingOfPlayer = target["batteryIsDrainingOfPlayer"];
            let batteryIsFullyDrainedOfPlayer = target["batteryIsFullyDrainedOfPlayer"];

            if (!batteryIsDrainingOfPlayer && !batteryIsFullyDrainedOfPlayer) {
                batteryDrain(player);
            } else if (batteryIsFullyDrainedOfPlayer) {
                player.runCommand(`clear @s ${BATTERY_CONFIG.ITEMS.PREFIX_CRITICAL}`);
                player.triggerEvent(BATTERY_CONFIG.EVENTS.NO_SIGNAL);
            }
            return true;
        }
    })
    playerStates.set(player.id, state)
    return state;
}

// =============================================================
// MAIN CONTROL LOOP
// =============================================================

export function Battery_control() {
    if (intervalId !== 0) return;
  
    intervalId = system.runInterval(() => {
        const players = getPlayersInRound();

        for (const player of players) {
            if (!player || !player.isValid()) continue;

            let batteryState = getBatteryState(player);
            // Reading Dynamic Properties (Coming from Config)
            batteryState.batteryIsFullyDrainedOfPlayer = player.getDynamicProperty(BATTERY_CONFIG.PROPERTIES.IS_FULLY_DRAINED);
            batteryState.batteryIsDrainingOfPlayer = player.getDynamicProperty(BATTERY_CONFIG.PROPERTIES.IS_DRAINING);
        }
    }, BATTERY_CONFIG.TIME.UPDATE_INTERVAL);
}

// =============================================================
// BATTERY LOGIC
// =============================================================

function batteryDrain(player) {
    if (playerDrainingBattery.has(player.id)) {
        system.clearRun(playerDrainingBattery.get(player.id));
    }
    let drainDuration = player.getDynamicProperty(BATTERY_CONFIG.PROPERTIES.IS_UPGRADED) ? BATTERY_CONFIG.TIME.DRAIN_DURATION_UPGRADED : BATTERY_CONFIG.TIME.DRAIN_DURATION_DEFAULT;
    player.setDynamicProperty(BATTERY_CONFIG.PROPERTIES.IS_DRAINING, true);

    // başlangıçta sayaç hemen bitiyor sonra tekrar çalışmıyor
    let timeoutId = system.runTimeout(() => {
        if (!player || !player.isValid()) return;

        let oldBatteryLevel = player.getDynamicProperty(BATTERY_CONFIG.PROPERTIES.LEVEL) ?? BATTERY_CONFIG.LEVELS.DEFAULT;

        if (oldBatteryLevel > 0) {
            decreaseBatteryHud(player, oldBatteryLevel);
        }
        if (oldBatteryLevel === BATTERY_CONFIG.LEVELS.MAX) {
            player.triggerEvent(BATTERY_CONFIG.EVENTS.NOT_FULL);
        }

        let newBatteryLevel = oldBatteryLevel - 1;
        // Lower limit check (Should not drop below -1)
        let decidedBatteryLevel = Math.max(newBatteryLevel, BATTERY_CONFIG.LEVELS.MIN);

        if (newBatteryLevel === BATTERY_CONFIG.LEVELS.CRITICAL) {
            batteryIsCritical(player);
        }
        if (decidedBatteryLevel === BATTERY_CONFIG.LEVELS.MIN) {
            player.setDynamicProperty(BATTERY_CONFIG.PROPERTIES.IS_FULLY_DRAINED, true);
        }

        player.setDynamicProperty(BATTERY_CONFIG.PROPERTIES.LEVEL, decidedBatteryLevel);
        player.setDynamicProperty(BATTERY_CONFIG.PROPERTIES.IS_DRAINING, false);
    }, drainDuration);
    
    playerDrainingBattery.set(player.id, timeoutId);
}

function pickupBattery(player) {
    // Cleanup Operations
    if (playerDrainingBattery.has(player.id)) {
        system.clearRun(playerDrainingBattery.get(player.id));
    }
    
    if (playerIsBatteryCritical.has(player.id)) {
        system.clearRun(playerIsBatteryCritical.get(player.id));
        playerIsBatteryCritical.delete(player.id);
        player.runCommand(`clear @s ${BATTERY_CONFIG.ITEMS.PREFIX_CRITICAL}`);
    }
    
    const isBatteryFullyDrained = player.getDynamicProperty(BATTERY_CONFIG.PROPERTIES.IS_FULLY_DRAINED);
    if (isBatteryFullyDrained) {
        player.setDynamicProperty(BATTERY_CONFIG.PROPERTIES.IS_FULLY_DRAINED, false);
        player.triggerEvent(BATTERY_CONFIG.EVENTS.STATIC_START);
        player.triggerEvent(BATTERY_CONFIG.EVENTS.STATIC_MOVEMENT);
    }
    
    player.setDynamicProperty(BATTERY_CONFIG.PROPERTIES.IS_COLLECTED, false);
    player.setDynamicProperty(BATTERY_CONFIG.PROPERTIES.IS_DRAINING, false);

    // Math Operations
    let oldBatteryLevel = player.getDynamicProperty(BATTERY_CONFIG.PROPERTIES.LEVEL) ?? 0;
    // Upper limit check (Should not exceed 4)
    let decidedBatteryLevel = Math.min(oldBatteryLevel + 1, BATTERY_CONFIG.LEVELS.MAX);

    player.setDynamicProperty(BATTERY_CONFIG.PROPERTIES.LEVEL, decidedBatteryLevel);
    
    // UI Update
    if (decidedBatteryLevel === BATTERY_CONFIG.LEVELS.MAX) {
        player.triggerEvent(BATTERY_CONFIG.EVENTS.FULL);
    }

    const textureId = BATTERY_CONFIG.ITEMS.TEXTURE_OFFSET - decidedBatteryLevel;
    const itemCommand = `replaceitem entity @s ${BATTERY_CONFIG.ITEMS.HUD_SLOT} 1 ${BATTERY_CONFIG.ITEMS.PREFIX_INCREASE}${textureId}`;
    const clearCommand = `clear @s ${BATTERY_CONFIG.ITEMS.PREFIX_INCREASE}${textureId}`;

    player.runCommand(itemCommand);
    
    system.runTimeout(() => {
        if (!player || !player.isValid()) return;
        
        player.runCommand(clearCommand);
    }, BATTERY_CONFIG.TIME.HUD_ANIMATION);
}

function decreaseBatteryHud(player, batteryLevel) {
    const textureId = BATTERY_CONFIG.ITEMS.TEXTURE_OFFSET - batteryLevel;
    const itemCommand = `replaceitem entity @s ${BATTERY_CONFIG.ITEMS.HUD_SLOT} 1 ${BATTERY_CONFIG.ITEMS.PREFIX_DECREASE}${textureId}`;
    const clearCommand = `clear @s ${BATTERY_CONFIG.ITEMS.PREFIX_DECREASE}${textureId}`;

    player.runCommand(itemCommand);

    system.runTimeout(() => {
        if (!player || !player.isValid()) return;

        player.runCommand(clearCommand);
    }, BATTERY_CONFIG.TIME.HUD_ANIMATION);
}

function batteryIsCritical(player) {
    if (playerIsBatteryCritical.has(player.id)) return;

    let batteryCriticalId = system.runTimeout(() => {
        if (!player || !player.isValid()) return;
        
        player.runCommand(`replaceitem entity @s ${BATTERY_CONFIG.ITEMS.HUD_SLOT} 1 ${BATTERY_CONFIG.ITEMS.PREFIX_CRITICAL}`);
        playerIsBatteryCritical.delete(player.id);
    }, BATTERY_CONFIG.TIME.CRITICAL_WARNING);
    
    playerIsBatteryCritical.set(player.id, batteryCriticalId);
}

// =============================================================
// INTERACTION AND EXPORTS
// =============================================================

world.afterEvents.playerInteractWithEntity.subscribe(({ player, target }) => {
    if (target.typeId === BATTERY_CONFIG.ITEMS.ENTITY_ID) {
        let batteryLevel = player.getDynamicProperty(BATTERY_CONFIG.PROPERTIES.LEVEL) ?? BATTERY_CONFIG.LEVELS.MAX;
        
        if (batteryLevel < BATTERY_CONFIG.LEVELS.MAX) {
            // If battery is fully drained (-1), start from 0 so adding +1 makes it 1.
            if (batteryLevel === BATTERY_CONFIG.LEVELS.MIN) {
                player.setDynamicProperty(BATTERY_CONFIG.PROPERTIES.LEVEL, 0);
            }
            pickupBattery(player);
        }
    }
});

export function resetBatteryIntervalId() {
    intervalId = 0;
}

export function getBatteryId() { return intervalId; }
export function playerStatesOfBatteryMap() { return playerStates; }
export function playerDrainingBatteryCountdownMap() { return playerDrainingBattery; }
export function playerIsBatteryCriticalCountdownMap() { return playerIsBatteryCritical; }