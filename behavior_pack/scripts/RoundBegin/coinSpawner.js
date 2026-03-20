import { world, system } from "@minecraft/server";
import { getCoinAmountObjective, getObjectiveScore } from "../scoreboards";

// ==========================================
// CONFIGURATION & VARIABLES
// ==========================================

const CONFIG = {
    DIMENSION_ID              : "overworld",
    ENTITY_TYPE               : "game:coin",
    MAX_COINS_PLAYER          : 9,
    SPAWN_INTERVAL            : 60,
    ANIMATION_DURATION_TICKS  : 2,
		MIN_PLAYER_DISTANCE				: 10,
		MAX_SPAWN_ATTEMPTS				: 10,
    MAGIC_STRINGS: {
        SCOREBOARD      	: "scoreboard players add @s coin_amount 1",
        COLLECTED_SOUND		: "coin_collect",
        COLLECTED_TAG   	: "collected",
        COLLECTED_EVENT 	: "collected_event",
        WARNING_SOUND   	: "mob.villager.no",
        WARNING_TEXT    	: "§c§lYou cannot carry any more coins!"
    },
    LOCATIONS: [
        { x: 27,  y: 65, z: -316 }, { x: 152, y: 70, z: -295 },
        { x: 166, y: 68, z: -197 }, { x: 140, y: 55, z: -177 },
        { x: 181, y: 64, z: -93  }, { x: -57, y: 67, z: -467 },
        { x: -110, y: 64, z: -535 }, { x: -61, y: 66, z: -681 },
        { x: -9,  y: 69, z: -769 }, { x: 40,  y: 66, z: -693 }
    ]
};

const DIMENSION = world.getDimension(CONFIG.DIMENSION_ID);

let coinAmountObjective;
let intervalId = 0;
let isInitialized = false;

// ==========================================
// INITIALIZATION
// ==========================================

function initialFunction() {
    coinAmountObjective = getCoinAmountObjective();

    // Security Check
    if (!coinAmountObjective) return;
    
    isInitialized = true;
    return;
}

// Run when world loads
system.run(initialFunction);

// If scoreboard objective is not loaded, this loop will define them
let scoreSecurityInterval = system.runInterval(() => {
    if (!isInitialized) {
        initialFunction();
    } else system.clearRun(scoreSecurityInterval);
}, 40);

// ==========================================
// FUNCTIONS
// ==========================================

export function startCoinSpawner() {
    if (intervalId !== 0) return;

    intervalId = system.runInterval(spawnRandomCoin, CONFIG.SPAWN_INTERVAL);
}

function spawnRandomCoin() {
	let randomIndex;
	let targetLoc;
	let nearbyPlayers;

	let attempts = 0;

	do {
		randomIndex = Math.floor(Math.random() * CONFIG.LOCATIONS.length);
    targetLoc = CONFIG.LOCATIONS[randomIndex];

		nearbyPlayers = getNearbyCoinPlayers(targetLoc);

		attempts++;
	} while (nearbyPlayers.length > 0 && attempts < CONFIG.MAX_SPAWN_ATTEMPTS);

	// Guard Clause: Ensure there are no players nearby the final selected location
	if (nearbyPlayers.length > 0) return;

    try {
        // Check if there is a coin on targeted location
        const existingCoins = getExistingCoin(targetLoc);

        // Check if there is coin on specified location
        if (existingCoins.length > 0) return;

        DIMENSION.spawnEntity(CONFIG.ENTITY_TYPE, targetLoc);
				world.sendMessage(`Coin location: ${targetLoc.x} ${targetLoc.y} ${targetLoc.z}`)

    } catch (e) {
        // In case chunk is not loaded
        forceSpawn(targetLoc);
    }
}

function forceSpawn(targetLoc) {
    const uniqueName = getUniqueName();
    
    DIMENSION.runCommand(`tickingarea add circle ${targetLoc.x} ${targetLoc.y} ${targetLoc.z} 2 ${uniqueName}`)
        .then(() => {
            system.runTimeout(() => {
                try {
                    const existingCoins = getExistingCoin(targetLoc);
                    if (existingCoins.length > 0) return;
                    
                    DIMENSION.spawnEntity(CONFIG.ENTITY_TYPE, targetLoc);
										world.sendMessage(`Coin location: ${targetLoc.x} ${targetLoc.y} ${targetLoc.z}`)
                } catch (spawnError) {
                    console.warn(`Still couldn't spawn: ${spawnError}`);
                } finally {
                    DIMENSION.runCommand(`tickingarea remove ${uniqueName}`);
                }
            }, 20);
        })
        .catch((err) => {
             console.warn(`Ticking Area Error: ${err}`);
             DIMENSION.runCommand(`tickingarea remove ${uniqueName}`);
        });
}

function collectCoin(player, target) {
    player.runCommand(CONFIG.MAGIC_STRINGS.SCOREBOARD);
    player.addLevels(1);
    player.playSound(CONFIG.MAGIC_STRINGS.COLLECTED_SOUND);

    target.addTag(CONFIG.MAGIC_STRINGS.COLLECTED_TAG);
    target.triggerEvent(CONFIG.MAGIC_STRINGS.COLLECTED_EVENT); 

    system.runTimeout(() => {
        if (target.isValid()) {
            target.remove();
        }
    }, CONFIG.ANIMATION_DURATION_TICKS);
}

function getExistingCoin(targetLoc) {
    return DIMENSION.getEntities({
                type: CONFIG.ENTITY_TYPE,
                location: targetLoc,
                maxDistance: 1,
                closest: 1
        });
}

function getNearbyCoinPlayers(location) {
	return DIMENSION.getPlayers({
		location: location,
		maxDistance: CONFIG.MIN_PLAYER_DISTANCE,
		closest: 1
	});
}

function getUniqueName() {
    const uniqueTime = Date.now().toString(36);
    const randomSuffix = Math.floor(Math.random() * 36).toString(36);

    return `c_load_${uniqueTime}${randomSuffix}`;
}

export function resetCoinIntervalId() {
        intervalId = 0;
}

export function getCoinId() {
    return intervalId;
}

// ==========================================
// EVENT LISTENER
// ==========================================

world.afterEvents.playerInteractWithEntity.subscribe((event) => {
    const { player, target } = event;

    if (target.typeId !== CONFIG.ENTITY_TYPE || target.hasTag(CONFIG.MAGIC_STRINGS.COLLECTED_TAG)) return;

    if (!coinAmountObjective) return;

    let currentScore = getObjectiveScore(coinAmountObjective, player.scoreboardIdentity) ?? 0;

    if (currentScore >= CONFIG.MAX_COINS_PLAYER) {
        player.playSound(CONFIG.MAGIC_STRINGS.WARNING_SOUND, { volume: 0.8, pitch: 0.8 });
        player.sendMessage(CONFIG.MAGIC_STRINGS.WARNING_TEXT);
        return;
    }

    collectCoin(player, target);
});