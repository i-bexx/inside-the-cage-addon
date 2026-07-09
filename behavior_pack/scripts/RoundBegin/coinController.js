import { world, system } from "@minecraft/server";

import { loadTickingArea, removeTickingArea, sleep } from "../utils";
import { getCoinAmountObjective, getObjectiveScore } from "../scoreboards";

// ==========================================
// CONFIGURATION & VARIABLES
// ==========================================

const CONFIG = {
    DIMENSION_ID              : "overworld",
    ENTITY_TYPE               : "game:coin",
    MAX_COINS_PLAYER          : 9,
    SPAWN_INTERVAL            : 120,
    RECEIVE_INTERVAL          : 60,
    ANIMATION_DURATION_TICKS  : 2,
	MAX_PLAYER_DISTANCE		  : 10,
    MAX_COIN_DISTANCE         : 5,
    MAGIC_STRINGS: {
        SCOREBOARD      	: "scoreboard players add @s coin_amount 1",
        RECIPE_MESSAGE_GIVE : "recipe give @s game:coin_max_recipe",
        RECIPE_MESSAGE_TAKE : "recipe take @s game:coin_max_recipe",
        COLLECTED_SOUND		: "coin_collect",
        COLLECTED_TAG   	: "collected",
        COLLECTED_EVENT 	: "collected_event",
        DISAPPEAR_EVENT     : "disappear_event",
        WARNING_SOUND   	: "mob.villager.no",
        WARNING_TEXT    	: "§c§lYou cannot carry any more coins!",
        NOTIFICATION_SOUND  : "notification"
    },
    LOCATIONS: [
        { x: 27,  y: 65, z: -316 }, { x: 152, y: 70, z: -295 },
        { x: 166, y: 68, z: -197 }, { x: 140, y: 55, z: -177 },
        { x: 181, y: 64, z: -93  }, { x: -57, y: 67, z: -467 },
        { x: -110, y: 64, z: -535 }, { x: -61, y: 66, z: -681 },
        { x: -9,  y: 69, z: -769 }, { x: 40,  y: 66, z: -693 }
    ]
};

let dimension;
let tickingAreaLocations = [];

let isSpawnIntervalActive = false;
let isReceiveIntervalActive = false;
let coinSpawnIntervalId = undefined;
let coinReceiveIntervalId = undefined;

let lastRecipeToastTime = new Map();

// ==========================================
// FUNCTIONS
// ==========================================

export function startcoinController() {
    if (coinSpawnIntervalId !== undefined) return;

    isSpawnIntervalActive = true;
    isReceiveIntervalActive = true;

    coinSpawnIntervalId = system.runInterval(spawnCoin, CONFIG.SPAWN_INTERVAL);
    coinReceiveIntervalId = system.runInterval(playerReceiveCoin, CONFIG.RECEIVE_INTERVAL);
}

async function spawnCoin() {
    if (!isSpawnIntervalActive) return;

    const randomIndex = Math.floor(Math.random() * CONFIG.LOCATIONS.length);
    const locationObject = CONFIG.LOCATIONS[randomIndex];
    const areaName = `loader_coin_${randomIndex + 1}`;

    removeTickingArea(areaName);
    await loadTickingArea(dimension, locationObject, areaName);

    const alreadyExists = tickingAreaLocations.some(coin => coin.locationObject.x === locationObject.x && coin.locationObject.z === locationObject.z);
    if (alreadyExists) { removeTickingArea(areaName); return; }

    const nearbyPlayers = dimension.getPlayers({ location: locationObject, maxDistance: CONFIG.MAX_PLAYER_DISTANCE, closest: 1 });
    if (nearbyPlayers.length > 0) { removeTickingArea(areaName); return; }

    try {
        dimension.spawnEntity(CONFIG.ENTITY_TYPE, { x: locationObject.x + 0.5, y: locationObject.y, z: locationObject.z + 0.5 });
        tickingAreaLocations.push({ locationObject, areaName });
        world.setDynamicProperty("active_coin_locations", JSON.stringify(tickingAreaLocations));
        world.sendMessage(`Coin location: ${locationObject.x} ${locationObject.y} ${locationObject.z}`);
    } catch (error) {}

    removeTickingArea(areaName);
}

export async function despawnCoins() {
    const rawData = world.getDynamicProperty("active_coin_locations");
    const coinLocations = JSON.parse(rawData || "[]");

    for (const value of coinLocations) {
        removeTickingArea(value.areaName);
        await loadTickingArea(dimension, value.locationObject, value.areaName);

        try {
            const coins = dimension.getEntities({ type: CONFIG.ENTITY_TYPE, location: value.locationObject, maxDistance: CONFIG.MAX_COIN_DISTANCE });
            for (const coin of coins) coin.remove();
        } catch (e) {}
        
        removeTickingArea(value.areaName);
    }
    tickingAreaLocations = [];
    world.setDynamicProperty("active_coin_locations", JSON.stringify(tickingAreaLocations));
}

async function playerReceiveCoin() {
    if (!isReceiveIntervalActive) return;

    const players = world.getPlayers()
        .filter(p => p.hasTag("in_game"));

    for (const player of players) {
        const preCoinAmount = player.addLevels(0);
        if (preCoinAmount >= CONFIG.MAX_COINS_PLAYER) continue;

        player.addExperience(1);
        const coinAmount = player.addLevels(0);

        if (preCoinAmount !== coinAmount) {
            player.runCommand(CONFIG.MAGIC_STRINGS.SCOREBOARD);
            await notifyMaxCoins(player, coinAmount);
        }
    }
}

async function collectCoin(player, target) {
    player.runCommand(CONFIG.MAGIC_STRINGS.SCOREBOARD);
    player.addLevels(1);
    player.playSound(CONFIG.MAGIC_STRINGS.COLLECTED_SOUND);

    target.addTag(CONFIG.MAGIC_STRINGS.COLLECTED_TAG);
    target.triggerEvent(CONFIG.MAGIC_STRINGS.COLLECTED_EVENT);

    const coinAmount = player.addLevels(0);
    await notifyMaxCoins(player, coinAmount);

    tickingAreaLocations = tickingAreaLocations.filter(coin => Math.floor(coin.locationObject.x) !== Math.floor(target.location.x) || Math.floor(coin.locationObject.z) !== Math.floor(target.location.z));
    world.setDynamicProperty("active_coin_locations", JSON.stringify(tickingAreaLocations));

    await sleep(CONFIG.ANIMATION_DURATION_TICKS);

    if (target.isValid) target.triggerEvent(CONFIG.MAGIC_STRINGS.DISAPPEAR_EVENT);
}

export function stopcoinController() {
    if (coinSpawnIntervalId !== undefined) system.clearRun(coinSpawnIntervalId);
    isSpawnIntervalActive = false;
    coinSpawnIntervalId = undefined;

    if (coinReceiveIntervalId !== undefined) system.clearRun(coinReceiveIntervalId);
    isReceiveIntervalActive = false;
    coinReceiveIntervalId = undefined;
}

// -- Helper Functions --

async function notifyMaxCoins(player, coinAmount) {
    const currentTime = ~~(Date.now() / 1000);
    const playerLastToastTime = lastRecipeToastTime.get(player.id);
    if (coinAmount >= CONFIG.MAX_COINS_PLAYER && (playerLastToastTime === undefined || currentTime - playerLastToastTime > 180)) {
        player.runCommand(CONFIG.MAGIC_STRINGS.RECIPE_MESSAGE_GIVE);
        await sleep(1);
        player.runCommand(CONFIG.MAGIC_STRINGS.RECIPE_MESSAGE_TAKE);
        player.playSound(CONFIG.MAGIC_STRINGS.NOTIFICATION_SOUND, { volume: 1.0, pitch: 1.0 });

        lastRecipeToastTime.set(player.id, ~~(Date.now() / 1000));
    }
}

export function getToastTimeMap() { return lastRecipeToastTime; }

export function setGlobalVariables() {
    dimension = world.getDimension(CONFIG.DIMENSION_ID);
    const rawData = world.getDynamicProperty("active_coin_locations");
    tickingAreaLocations = JSON.parse(rawData || "[]");
}

// ==========================================
// EVENT LISTENER
// ==========================================

world.afterEvents.playerInteractWithEntity.subscribe((event) => {
    const { player, target } = event;

    if (target.typeId !== CONFIG.ENTITY_TYPE || target.hasTag(CONFIG.MAGIC_STRINGS.COLLECTED_TAG)) return;

    if (!getCoinAmountObjective()) return;

    let currentScore = getObjectiveScore(getCoinAmountObjective(), player.scoreboardIdentity) ?? 0;

    if (currentScore >= CONFIG.MAX_COINS_PLAYER) {
        player.playSound(CONFIG.MAGIC_STRINGS.WARNING_SOUND, { volume: 0.8, pitch: 0.8 });
        player.sendMessage(CONFIG.MAGIC_STRINGS.WARNING_TEXT);
        return;
    }

    collectCoin(player, target);
});