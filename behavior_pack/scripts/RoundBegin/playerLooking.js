import { world, system } from "@minecraft/server";

import { getPlayersInRound } from "../getPlayersArray";
import { getStalkerMatchIdObjective, getSanityObjective, getStaminaObjective, getObjectiveScore } from "../scoreboards";

// --- CONSTANTS ---
const GAME_ENTITIES = {
    NULL: "game:null",
    STALKER_CURSOR: "game:stalker_cursor"
};

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

const DIMENSION = world.getDimension("overworld");

let nullEntity;

let aaValueObjective;
let sanityObjective;
let staminaObjective;

let playerStates = new Map();
let listOfPlayersLooking = new Map();
let listOfPlayersPlayingStatic = new Map();

let isInitialized = false;
let intervalId = 0;

function initialFunction() {
    if (isInitialized) return;
    
    try {
        aaValueObjective = getStalkerMatchIdObjective();
    		sanityObjective = getSanityObjective();
    		staminaObjective = getStaminaObjective();
    
    // Safety check
    if (!aaValueObjective || !sanityObjective || !staminaObjective) return;
    
        isInitialized = true;
    } catch(e) {  }
}

// Run immediately to check for the scoreboard
system.run(initialFunction);

// If scoreboard objective or participant is not loaded, this loop will define them
let scoreSecurityInterval = system.runInterval(() => {
        if (!isInitialized) {
                initialFunction();
                return;
        } else system.clearRun(scoreSecurityInterval);
}, 40);

function isPlayerLookingAtEntity(player) {

    let state = playerStates.get(player.id);
    if (state) return state;

    const isLookingObject = {
        isLooking: false
    };

    state = new Proxy({ ...isLookingObject }, {
        set(target, key, value) {
            if (target[key] === value) return true;

            target[key] = value;

            if (key === "isLooking") {
                if (value) {
                    handleStaticEffect(player);
                } else {
                    playerStoppedLooking(player);
                }
            }
            return true;
        }
    });
    playerStates.set(player.id, state);
    return state;
}

export function playerLookingControl() {
    nullEntity = DIMENSION.getEntities({ type: GAME_ENTITIES.NULL })[0];

    intervalId = system.runInterval(() => {
        const players = getPlayersInRound();
        const stalkers = DIMENSION.getEntities({ type: GAME_ENTITIES.STALKER_CURSOR });

        if (stalkers.length === 0) return;

        // Track players actively looking RIGHT NOW
        const playersLookingNow = new Set();

        for (const stalker of stalkers) {
            const matchedPlayer = getMatchingPlayer(players, stalker, aaValueObjective);

            const dx = stalker.location.x - nullEntity.location.x;
            const dy = stalker.location.y - nullEntity.location.y;
            const dz = stalker.location.z - nullEntity.location.z;
            
            const distance = Math.hypot(dx, dy, dz);

            const state = isPlayerLookingAtEntity(matchedPlayer);

            if (state && distance <= 10) {
                state.isLooking = true;
                playersLookingNow.add(matchedPlayer.id);
            }
        }

        // Force-stop anyone who was looking before, but isn't anymore
        for (const [playerId, state] of playerStates.entries()) {
            if (state.isLooking && !playersLookingNow.has(playerId)) {
                const player = players.find(p => p.id === playerId);
                
                if (player && player.isValid()) {
                    // Triggers playerStoppedLooking via Proxy
                    state.isLooking = false; 
                } else {
                    // EMERGENCY CLEANUP: Player disconnected mid-stare!
                    const interval = listOfPlayersPlayingStatic.get(playerId);
                    if (interval !== undefined) system.clearRun(interval);
                    
                    listOfPlayersPlayingStatic.delete(playerId);
                    listOfPlayersLooking.delete(playerId); // Clean up the state to avoid memory leaks
                }
            }
        }
    }, 2);
}

function handleStaticEffect(player) {
    if (!player || !player.isValid()) return;

    const playerStats = getPlayerStats();
    const isUsingCam = player.getDynamicProperty(DYNAMIC_PROPS.CAM_USING);
    const initializationBeforeLockingTheCam = player.getDynamicProperty(DYNAMIC_PROPS.CAM_INIT);

    if (isUsingCam && !initializationBeforeLockingTheCam) {
        playerStats.sanity = getObjectiveScore(sanityObjective, player.scoreboardIdentity);
        const sanityValue = playerStats.sanity;

        // Switched to triggerEvent for consistency and better performance
        if (sanityValue <= 100 && sanityValue > 66) {
            player.triggerEvent(EVENTS.STATIC_TRUE_1);
        } else if (sanityValue <= 66 && sanityValue > 33) {
            player.triggerEvent(EVENTS.STATIC_TRUE_2);
        } else if (sanityValue <= 33 && sanityValue >= 0) {
            player.triggerEvent(EVENTS.STATIC_TRUE_3);
        }
        
        if (listOfPlayersLooking.get(player.id) == null) {
            playerIsLooking(player, sanityValue);
        }
    }
}

function playerStoppedLooking(player) {
    if (!player || !player.isValid()) return;

    // 1. GUARANTEE CLEANUP FIRST
    const staticIntervalId = listOfPlayersPlayingStatic.get(player.id);
    if (staticIntervalId !== undefined) {
        system.clearRun(staticIntervalId);
    }
    
    listOfPlayersPlayingStatic.delete(player.id);
    listOfPlayersLooking.delete(player.id);

    try {
        // 2. EXECUTE VOLATILE LOGIC
        player.setDynamicProperty(DYNAMIC_PROPS.IS_LOOKING, false);
        
        const playerStats = getPlayerStats();
        playerStats.stamina = getObjectiveScore(staminaObjective, player.scoreboardIdentity);
        playerStats.sanity = getObjectiveScore(sanityObjective, player.scoreboardIdentity);

        const stamina = playerStats.stamina;
        const sanity = playerStats.sanity;
        const isUsingCam = player.getDynamicProperty(DYNAMIC_PROPS.CAM_USING);

        if (stamina <= 0) {
						player.triggerEvent(EVENTS.SLOWNESS);
				} else if (isUsingCam) {
						player.triggerEvent(EVENTS.STATIC_MOVEMENT);
				}

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
    if (!player || !player.isValid()) return;

    listOfPlayersLooking.set(player.id, 1);
    player.setDynamicProperty(DYNAMIC_PROPS.IS_LOOKING, true);

		player.triggerEvent(EVENTS.SLOWNESS);
    
    // Determine the right function to call to prevent code duplication
    let effectFunction = null;

    if (sanity <= 100 && sanity > 66) {
        effectFunction = sanityStable;
    } else if (sanity <= 66 && sanity > 33) {
        effectFunction = sanityNormal;
    } else if (sanity <= 33 && sanity >= 0) {
        effectFunction = sanityPoor;
    }

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
        if (!player || !player.isValid()) {
            system.clearRun(staticIntervalId);
            return;
        }
        effectFunction(player);
    }, 100);
    
    listOfPlayersPlayingStatic.set(player.id, staticIntervalId);
}

function sanityStable(player) {
    if (!player || !player.isValid()) return;
    player.runCommand(`playsound ${SOUNDS.STATIC_1} @s[tag=in_game]`);
    player.runCommand("camerashake add @s[tag=in_game] 0.3 8 rotational");
}

function sanityNormal(player) {
    if (!player || !player.isValid()) return;
    player.runCommand(`playsound ${SOUNDS.STATIC_2} @s[tag=in_game]`);
    player.runCommand("camerashake add @s[tag=in_game] 0.3 8 rotational");
}

function sanityPoor(player) {
    if (!player || !player.isValid()) return;
    player.runCommand(`playsound ${SOUNDS.STATIC_3} @s[tag=in_game]`);
    player.runCommand("camerashake add @s[tag=in_game] 0.3 8 rotational");
}

function getMatchingPlayer(players, aaEntity, aaValueObjective) {
    return players.find(p => {
        if (!p.isValid() || !p.scoreboardIdentity || !aaEntity.scoreboardIdentity) return false;
        const playerScore = getObjectiveScore(aaValueObjective, p.scoreboardIdentity);
        const aaScore = getObjectiveScore(aaValueObjective, aaEntity.scoreboardIdentity);
        return playerScore === aaScore;
    });
}

function getPlayerStats() {
    return {
        stamina: 10,
        sanity: 100
    };
}

export function getPlayerLookingId() {
    return intervalId;
}

export function listOfPlayersLookingMap() {
    return listOfPlayersLooking;
}

export function playerStatesOfPlayerLookingMap() {
    return playerStates;
}

export function listOfPlayersPlayingStaticMap() {
    return listOfPlayersPlayingStatic;
}