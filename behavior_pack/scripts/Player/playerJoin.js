import { world, system } from "@minecraft/server";

import { startProcesses, startProcessesAfterMenuReady } from "../startProcesses";
import { getNewGamedObjective, getStalkerMatchIdObjective, getWorldParticipant, getObjectiveScore } from "../scoreboards";
import { commandsToResetTheGame, resetPlayerDynamicPropertyData, resetWorldDynamicPropertyData, resetMaps, stopTheFunctions, commandsToResetPlayerData, clearPlayerMaps, stopFunctionsInMaps } from "../resetStats";

// =============================================================
// CONFIGURATION 
// =============================================================

const CONFIG = {
    DIMENSION: "overworld",
    TAGS: {
        OWNER: "owner",
        IN_MENU: "in_menu", 
        IN_LOBBY: "in_lobby", 
        MENU: "menu",
        TO_REMOVE: ["in_game", "in_lobby", "waiting_for_start", "starting", "starter", "menu", "eliminated", "aa_matched", "hasNotification"]
    },
    DYN_PROPS: { 
        IN_MENU: "in_menu",
        MENU_READY: "menu_ready",
        GAME_RESTART: "gameRestart",
        GAME_END: "roundEndedEarly"
    },
    SCORES: {
        GAME_STARTED: "game_started",
        NEW_GAME: "new_game",
        STALKER_MATCH_ID: "stalker_match_id",
        COIN: "coin_amount",
        INITIAL_STATS: {
            Stamina: 10,
            Sanity: 100,
            stalker_match_id: 0,
            is_shooting: 0,
            used_toxic_bomb: 0,
            is_looking_at_hostile: 0,
            ammo: 10
        }
    },
    COMMANDS: {
        RESET_COIN_UI: "xp -10L @s",
        RESET_COIN: "scoreboard players set @s coin_amount 0", 
        MENU_READY_SOUND: "playsound random.levelup @s", 
        GAME_NOT_STARTED: "scoreboard players set value game_started 0",
        REMOVE_REDSTONE_BLOCK: "setblock -54 75 -152 air"
    },
    ENTITIES: {
        STALKER: "game:stalker_cursor",
        MENU_NEW_GAME: "menu:new_game",
        MENU_CONTINUE: "menu:continue",
        GAME_DOOR: "game:door"
    },
    PLAYER_EVENTS: {
        NORMAL: "normal_event",
        BATTERY_FULL: "battery_is_full_event",
        NO_SHOT: "is_not_shooting_event",
        CURSOR_NORMAL: "cursor_normal_event"
    },
    ENTITY_EVENTS: {
        RESET_DEFAULT: "default",
        WAITING_HOST: "waiting_for_host"
    },
    COORDS: {
        MENU_SPAWN: { x: -181, y: 52, z: -91 },
        GAME_SPAWN: { x: -183, y: 68, z: -97 }
    },
    MESSAGES: {
        RESET_WARNING: "§l§4The game has been reset so your assets are now gone",
        MENU_ACTIONBAR: "§a§l✔ MENU SYSTEM ONLINE"
    }
};

// =============================================================
// GLOBAL VARIABLES
// =============================================================

const DIMENSION = world.getDimension(CONFIG.DIMENSION);

let aaValueObjective;
let newGameObjective;
let worldParticipant;
let isInitialized = false;

// =============================================================
// INITIALIZATION
// =============================================================

function initializeSystem() {
    if (isInitialized) return;

    try {
        newGameObjective = getNewGamedObjective();
        aaValueObjective = getStalkerMatchIdObjective();
        worldParticipant = getWorldParticipant();

        if (newGameObjective && aaValueObjective && worldParticipant) {
            isInitialized = true;
        }
    } catch (e) { }
}

system.run(initializeSystem);

const initInterval = system.runInterval(() => {
    if (!isInitialized) initializeSystem();
    else system.clearRun(initInterval);
}, 40);

// =============================================================
// MAIN EVENT LISTENER
// =============================================================

world.afterEvents.playerSpawn.subscribe(async ({ player }) => {
    if (!isInitialized) return;

    // Prepare Stats
    stopFunctionsInMaps(player.id);
    clearPlayerMaps(player.id);
    commandsToResetPlayerData(player, true);
    resetPlayerDynamicPropertyData(player);

    killConnectedStalker(player);
    preparePlayerStats(player);

    // Teleportation Logic
    const isOwner = player.hasTag(CONFIG.TAGS.OWNER);
    let targetCoords;

    if (isOwner) {
        targetCoords = CONFIG.COORDS.MENU_SPAWN;
    } else {
        const isInMenu = world.getDynamicProperty(CONFIG.DYN_PROPS.IN_MENU);
        
        if (isInMenu) {
            targetCoords = CONFIG.COORDS.MENU_SPAWN;
        } else {
            targetCoords = CONFIG.COORDS.GAME_SPAWN;
            player.addTag(CONFIG.TAGS.IN_LOBBY);
        }
    }

    await player.runCommand(`tp @s ${targetCoords.x} ${targetCoords.y} ${targetCoords.z} 0`);

    uploadPlayerUI(player);

    // Check Game Data
    const worldValue = getObjectiveScore(newGameObjective, worldParticipant);
    const playerValue = getObjectiveScore(newGameObjective, player.scoreboardIdentity);
    
    checkPlayerGameData(player, worldValue, playerValue);

    // Owner Logic
    if (isOwner) await handleOwnerJoinLogic(player);
});

// =============================================================
// FUNCTIONS
// =============================================================

function preparePlayerStats(player) {
    const commands = ["fog @s remove default_fog", "clear @s"];

    Object.entries(CONFIG.SCORES.INITIAL_STATS).forEach(([objective, value]) => {
        commands.push(`scoreboard players set @s ${objective} ${value}`);
    });
    
    CONFIG.TAGS.TO_REMOVE.forEach(tag => commands.push(`tag @s remove ${tag}`));

    for (const cmd of commands) player.runCommand(cmd);

    for (const event of Object.values(CONFIG.PLAYER_EVENTS)) {
        player.triggerEvent(event);
    }
}

function checkPlayerGameData(player, worldValue, playerValue) {
    if (playerValue === undefined || (worldValue !== undefined && worldValue > playerValue)) {
        player.runCommand(CONFIG.COMMANDS.RESET_COIN_UI);
        player.runCommand(CONFIG.COMMANDS.RESET_COIN);

        if (worldValue !== undefined) {
            player.runCommand(`scoreboard players set @s ${CONFIG.SCORES.NEW_GAME} ${worldValue}`);
        }

        system.runTimeout(() => {
            if (player.isValid()) {
                player.sendMessage(CONFIG.MESSAGES.RESET_WARNING);
                player.runCommand("playsound notification @s");
            }
        }, 40);
    }
}

async function handleOwnerJoinLogic(player) {
    world.setDynamicProperty(CONFIG.DYN_PROPS.GAME_RESTART, false); // When owner joins gameRestart dynamic property reset here
    world.setDynamicProperty(CONFIG.DYN_PROPS.GAME_END, false); // When owner joins roundEndedEarly dynamic property reset here
    
    player.setDynamicProperty(CONFIG.DYN_PROPS.MENU_READY, false);
    player.runCommand(CONFIG.COMMANDS.GAME_NOT_STARTED);
    
    stopTheFunctions();
    resetMaps();
    resetWorldDynamicPropertyData();

	await commandsToResetTheGame(DIMENSION);
    await ensureEntitiesAreReset();
    
    DIMENSION.runCommand("fill -180 68 -92 -180 71 -84 barrier");

    startProcesses();

    await sleep(320);

    if (player.isValid()) {
        player.setDynamicProperty(CONFIG.DYN_PROPS.MENU_READY, true);
        player.runCommand(`tag @s add ${CONFIG.TAGS.MENU}`);
        
        player.runCommand(CONFIG.COMMANDS.REMOVE_REDSTONE_BLOCK);
        player.runCommand(CONFIG.COMMANDS.MENU_READY_SOUND);
        player.runCommand(`title @s actionbar ${CONFIG.MESSAGES.MENU_ACTIONBAR}`);
    }

		startProcessesAfterMenuReady();
}

function killConnectedStalker(player) {
    if (!aaValueObjective) return;
    
    try {
        const stalkerScore = getObjectiveScore(aaValueObjective, player.scoreboardIdentity);
        if (stalkerScore === undefined) return;

        const filter = {
            type: CONFIG.ENTITIES.STALKER, 
            scoreOptions: [{ 
                objective: CONFIG.SCORES.STALKER_MATCH_ID, 
                minScore: stalkerScore, 
                maxScore: stalkerScore 
            }]
        };

        const entities = DIMENSION.getEntities(filter);
        if (entities.length > 0) entities[0].kill();
        
    } catch (e) { }
}

function uploadPlayerUI(player) {
    player.runCommand("title @s title sanityUI1");
}

function ensureEntitiesAreReset() {
    return new Promise((resolve) => {
        const attemptReset = () => {
            // Run the commands (Even if it has bug)
            try {
                DIMENSION.runCommand(`event entity @e[type=${CONFIG.ENTITIES.MENU_NEW_GAME}] ${CONFIG.ENTITY_EVENTS.RESET_DEFAULT}`);
                DIMENSION.runCommand(`event entity @e[type=${CONFIG.ENTITIES.MENU_CONTINUE}] ${CONFIG.ENTITY_EVENTS.RESET_DEFAULT}`);
                DIMENSION.runCommand(`event entity @e[type=${CONFIG.ENTITIES.GAME_DOOR}] ${CONFIG.ENTITY_EVENTS.WAITING_HOST}`);
            } catch (e) { }

            // Check entities
            try {
                const newGame = DIMENSION.getEntities({ type: CONFIG.ENTITIES.MENU_NEW_GAME })[0];
                const contGame = DIMENSION.getEntities({ type: CONFIG.ENTITIES.MENU_CONTINUE })[0];
                const doorGame = DIMENSION.getEntities({ type: CONFIG.ENTITIES.GAME_DOOR })[0];

                if (newGame && contGame && doorGame) {
                    const val1 = newGame.getComponent("minecraft:mark_variant")?.value;
                    const val2 = contGame.getComponent("minecraft:mark_variant")?.value;
                    const val3 = doorGame.getComponent("minecraft:mark_variant")?.value;

                    if (val1 === 0 && val2 === 0 && val3 === 5) {
                        resolve();
                        return;
                    }
                }
            } catch (e) { }

            // If failed, call function again
            system.runTimeout(attemptReset, 5);
        };

        // Initiate first run
        attemptReset();
    });
}

function sleep(ticks) {
    return new Promise((resolve) => system.runTimeout(resolve, ticks));
}