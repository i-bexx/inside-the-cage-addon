import { world, system } from "@minecraft/server";

import { PlayerCache } from "../Player/playerCache";
import { getSanityObjective, getObjectiveScore } from "../scoreboards";

// --- CONSTANTS ---
const DYNAMIC_PROPS = {
    IS_LOOKING: "is_looking",
    CAM_USING: "camUsing",
    CAM_INIT: "initializationBeforeLockingTheCam"
};

const EVENTS = {
    STATIC_TRUE_1: "static_true_event1",
    STATIC_TRUE_2: "static_true_event2",
    STATIC_TRUE_3: "static_true_event3",
    SLOWNESS: "slowness_event",
    STATIC_LOW_SANITY: "static_low_sanity_event",
    STATIC: "static_event",
    NORMAL: "normal_event",
    STATIC_MOVEMENT: "static_movement_event"
};

const SOUNDS = {
    STATIC_1: "static1",
    STATIC_2: "static2",
    STATIC_3: "static3"
};

let dimension;


let listOfPlayersLooking = new Map();
let listOfPlayersPlayingStatic = new Map();

export function playerLookingControl(player, nullEntity) {
    if (!nullEntity) return;

    const cache = PlayerCache.get(player.id);
    if (!cache) return;
    
    const linkedStalker = cache.stalkerEntity;
    if (!linkedStalker || !linkedStalker.isValid) return;
    const linkedStalkerLoc = linkedStalker.location;
    const nullEntityLoc = nullEntity.location

    const dx = linkedStalkerLoc.x - nullEntityLoc.x;
    const dy = linkedStalkerLoc.y - nullEntityLoc.y;
    const dz = linkedStalkerLoc.z - nullEntityLoc.z;
    const distance = Math.hypot(dx, dy, dz);

    const newIsLooking = (distance <= 10);
    const oldIsLooking = cache.isLooking;

    if (oldIsLooking !== newIsLooking) {
        cache.isLooking = newIsLooking;
        
        if (newIsLooking) handleStaticEffect(player);
        else playerStoppedLooking(player);
    }
}

function handleStaticEffect(player) {
    if (!player || !player.isValid) return;

    const playerStats = getPlayerStats();
    const isUsingCam = PlayerCache.get(player.id)?.camUsing;
    const initializationBeforeLockingTheCam = player.getDynamicProperty(DYNAMIC_PROPS.CAM_INIT);

    if (isUsingCam && !initializationBeforeLockingTheCam) {
        playerStats.sanity = getObjectiveScore(getSanityObjective(), player.scoreboardIdentity);
        const sanityValue = playerStats.sanity;

        if (sanityValue <= 100 && sanityValue > 66) player.triggerEvent(EVENTS.STATIC_TRUE_1);
        else if (sanityValue <= 66 && sanityValue > 33) player.triggerEvent(EVENTS.STATIC_TRUE_2);
        else if (sanityValue <= 33 && sanityValue >= 0) player.triggerEvent(EVENTS.STATIC_TRUE_3);
        
        if (listOfPlayersLooking.get(player.id) == undefined) playerIsLooking(player, sanityValue);
    }
}

function playerStoppedLooking(player) {
    if (!player || !player.isValid) return;

    // 1. GUARANTEE CLEANUP FIRST
    const staticIntervalId = listOfPlayersPlayingStatic.get(player.id);
    if (staticIntervalId !== undefined) {
        system.clearRun(staticIntervalId);
    }
    
    listOfPlayersPlayingStatic.delete(player.id);
    listOfPlayersLooking.delete(player.id);

    try {
        player.setDynamicProperty(DYNAMIC_PROPS.IS_LOOKING, false);
        
        const playerStats = getPlayerStats();
        playerStats.stamina = PlayerCache.get(player.id)?.stamina;
        playerStats.sanity = getObjectiveScore(getSanityObjective(), player.scoreboardIdentity);

        const stamina = playerStats.stamina;
        const sanity = playerStats.sanity;
        const isUsingCam = PlayerCache.get(player.id)?.camUsing;

        if (stamina <= 0) player.triggerEvent(EVENTS.SLOWNESS);
        else if (isUsingCam) player.triggerEvent(EVENTS.STATIC_MOVEMENT);

		if (isUsingCam) {
            if (sanity <= 33) player.triggerEvent(EVENTS.STATIC_LOW_SANITY);
            else player.triggerEvent(EVENTS.STATIC);
        } else {
            player.triggerEvent(EVENTS.NORMAL);
        }

        player.runCommand(`stopsound @s ${SOUNDS.STATIC_1}`);
        player.runCommand(`stopsound @s ${SOUNDS.STATIC_2}`);
        player.runCommand(`stopsound @s ${SOUNDS.STATIC_3}`);
        player.runCommand("camerashake stop @s");
    } catch (e) {
        console.warn("Error in playerStoppedLooking: " + e);
    }
}

function playerIsLooking(player, sanity) {
    if (!player || !player.isValid) return;

    listOfPlayersLooking.set(player.id, 1);
    player.setDynamicProperty(DYNAMIC_PROPS.IS_LOOKING, true);

		player.triggerEvent(EVENTS.SLOWNESS);
    
    // Determine the right function to call to prevent code duplication
    let effectFunction = undefined;

    if (sanity <= 100 && sanity > 66) effectFunction = sanityStable;
    else if (sanity <= 66 && sanity > 33) effectFunction = sanityNormal;
    else if (sanity <= 33 && sanity >= 0) effectFunction = sanityPoor;

    if (!effectFunction) return;

    // Trigger initially
    effectFunction(player);

    // Static intervals setup
    const doesStaticIntervalExist = listOfPlayersPlayingStatic.get(player.id);
    if (doesStaticIntervalExist) {
        system.clearRun(doesStaticIntervalExist);
    }
    
    const staticIntervalId = system.runInterval(() => {
        // Validation check is crucial inside the interval
        if (!player || !player.isValid) {
            system.clearRun(staticIntervalId);
            return;
        }
        effectFunction(player);
    }, 100);
    
    listOfPlayersPlayingStatic.set(player.id, staticIntervalId);
}

function sanityStable(player) {
    if (!player || !player.isValid || !player.hasTag("in_game")) return;
    player.playSound(SOUNDS.STATIC_1, {volume: 0.3});
    player.runCommand("camerashake add @s[tag=in_game] 0.3 8 rotational");
}

function sanityNormal(player) {
    if (!player || !player.isValid || !player.hasTag("in_game")) return;
    player.playSound(SOUNDS.STATIC_2, {volume: 0.3});
    player.runCommand("camerashake add @s[tag=in_game] 0.3 8 rotational");
}

function sanityPoor(player) {
    if (!player || !player.isValid || !player.hasTag("in_game")) return;
    player.playSound(SOUNDS.STATIC_3, {volume: 0.3});
    player.runCommand("camerashake add @s[tag=in_game] 0.3 8 rotational");
}


function getPlayerStats() {
    return {
        stamina: 10,
        sanity: 100
    };
}

export function listOfPlayersLookingMap() { return listOfPlayersLooking; }

export function listOfPlayersPlayingStaticMap() { return listOfPlayersPlayingStatic; }

export function setGlobalVariables() {
    dimension = world.getDimension("overworld");
}