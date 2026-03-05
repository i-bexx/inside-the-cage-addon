import { world, system } from "@minecraft/server";

import { startMainGameLoop } from "./gameStats";
import { gameStarter } from "./gameStarter";

// =============================================================================
// CONFIGURATION
// =============================================================================

const DIMENSION = world.getDimension("overworld");

const CONFIG = {
    TAGS: {
        OWNER: "owner",
        MENU: "menu",
        CUTSCENE: "cutscene"
    },
    IDS: {
        NEW_GAME: "menu:new_game",
        CONTINUE: "menu:continue",
        SKIP_ITEM: "menu:skip_cutscene",
        DOOR: "game:door"
    },
    COORDS: {
        SPAWN_POINT: "-183 68 -97",
        TRUCK_INTERIOR: "-186 53 -82",
        AIR_FILL_AREA: "-180 68 -92 -180 71 -84"
    },
    TIMESTAMPS: { 
        INTRO: 40,
        TRUCK_INTERIOR: 60,
        ENGINE_START: 1260,
        DRIVING: 1330,
        CONTAINER_NOISE: 1950,
        CLOSE_LID: 1980,
        ARRIVAL: 2080
    }
};

// =============================================================================
// STATE MANAGEMENT & VARIABLES
// =============================================================================

// Timers are now named descriptively. 
// Note: We keep the 'scene' prefix so the skip logic knows what to clear.
const ACTIVE_TIMERS = {
    sceneIntro: null, 
    sceneTruck: null, 
    sceneEngine: null, 
    sceneDriving: null, 
    sceneNoise: null, 
    sceneLid: null, 
    sceneArrival: null,
    
    menuLoop: null,
    skipLoop: null
};

// Cache for Menu Entities
const MENU_ENTITIES = {
    newGame: undefined,
    continue: undefined
};

// Menu Selection State
const MENU_STATE = new Proxy({ onNewGame: false, onContinue: false }, {
    set(target, key, value) {
        if (target[key] === value) return true;

        target[key] = value;

        const entity = (key === "onNewGame") ? MENU_ENTITIES.newGame : MENU_ENTITIES.continue;
        
        if (entity && entity.isValid()) {
            value ? (entity.triggerEvent("selected"), DIMENSION.runCommand("playsound click_choosing @a")) 
                  : entity.triggerEvent("default");
        }
        return true;
    }
});

let ownerPlayer = undefined;

world.setDynamicProperty("in_menu", true);
world.setDynamicProperty("skip_cutscene_limit", 0);

// =============================================================================
// COMMAND LISTS
// =============================================================================

const COMMANDS = {
    NEW_GAME_INIT: [
        `tag @a add ${CONFIG.TAGS.CUTSCENE}`,
        "scoreboard players add world new_game 1"
    ],
    SCENE_INTRO: [
        `event entity @a[tag=${CONFIG.TAGS.CUTSCENE}] new_game_Started`,
        `playsound new_game_Started @a[tag=${CONFIG.TAGS.CUTSCENE}]`
    ],
    SCENE_TRUCK: [
        `event entity @a[tag=${CONFIG.TAGS.CUTSCENE}] new_game_started_text`,
        `tp @a[tag=${CONFIG.TAGS.CUTSCENE}] ${CONFIG.COORDS.TRUCK_INTERIOR}`,
        `give @a[tag=${CONFIG.TAGS.CUTSCENE}] ${CONFIG.IDS.SKIP_ITEM}`
    ],
    SCENE_ARRIVAL: [
        `tp @a[tag=${CONFIG.TAGS.CUTSCENE}] ${CONFIG.COORDS.SPAWN_POINT}`,
        `event entity @a[tag=${CONFIG.TAGS.CUTSCENE}] normal_event`,
        `tag @a remove ${CONFIG.TAGS.CUTSCENE}`,
        `fill ${CONFIG.COORDS.AIR_FILL_AREA} air`,
        `event entity @e[type=${CONFIG.IDS.DOOR}] "0"`
    ],
    SKIP_CLEANUP: [
        `tp @a[tag=${CONFIG.TAGS.CUTSCENE}] ${CONFIG.COORDS.SPAWN_POINT}`,
        `event entity @a[tag=${CONFIG.TAGS.CUTSCENE}] normal_event`,
        `stopsound @a[tag=${CONFIG.TAGS.CUTSCENE}]`,
        `playsound menu_exit @a[tag=${CONFIG.TAGS.CUTSCENE}]`,
        `tag @a remove ${CONFIG.TAGS.CUTSCENE}`,
        `fill ${CONFIG.COORDS.AIR_FILL_AREA} air`,
        `event entity @e[type=${CONFIG.IDS.DOOR}] "0"`,
        `clear @a ${CONFIG.IDS.SKIP_ITEM}`
    ]
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function runCommandList(list) {
    for (const cmd of list) DIMENSION.runCommand(cmd);
}

system.run(() => {
    const finder = system.runInterval(() => {
        ownerPlayer = world.getPlayers({ tags: [CONFIG.TAGS.OWNER] })[0];
				
        MENU_ENTITIES.newGame = DIMENSION.getEntities({ type: CONFIG.IDS.NEW_GAME })[0];
        MENU_ENTITIES.continue = DIMENSION.getEntities({ type: CONFIG.IDS.CONTINUE })[0];

        if (ownerPlayer && MENU_ENTITIES.newGame && MENU_ENTITIES.continue) system.clearRun(finder);
    }, 10);
});

// =============================================================================
// MAIN LOGIC
// =============================================================================

export function isLookingAtMenuEntity() {
    ACTIVE_TIMERS.menuLoop = system.runInterval(() => {
			const isMenuReady = ownerPlayer?.getDynamicProperty("menu_ready");

			if (!ownerPlayer || !isMenuReady) return;

			const raycastResult = ownerPlayer.getEntitiesFromViewDirection({ maxDistance: 6, ignoreBlockCollision: true })[0];
			const targetID = raycastResult?.entity?.id;

			MENU_STATE.onNewGame = (targetID !== undefined && targetID === MENU_ENTITIES.newGame?.id);
			MENU_STATE.onContinue = (targetID !== undefined && targetID === MENU_ENTITIES.continue?.id);
    }, 2);
}

world.afterEvents.playerInteractWithEntity.subscribe(({ player, target }) => {
    if (!ownerPlayer) {
			 player.runCommand("playsound note.bass @s");
			return; 
		}
		const isMenuReady = player.getDynamicProperty("menu_ready");

    if (!isMenuReady) {
			const isMenuButton = [CONFIG.IDS.NEW_GAME, CONFIG.IDS.CONTINUE].includes(target.typeId);

			if (isMenuButton) {
					player.runCommand(`title @s actionbar §c§l⚠ §6Menu Loading...`);
					player.runCommand("playsound note.bass @s");
			}
			return;
    }
		const doesHaveTag = player.hasTag(CONFIG.TAGS.MENU);
		
    if (!doesHaveTag) return;

    const isNewGame = (target.typeId === CONFIG.IDS.NEW_GAME);
    const isContinue = (target.typeId === CONFIG.IDS.CONTINUE);

    if (!isNewGame && !isContinue) return;

    player.runCommand("playsound click_chose @s");
    player.runCommand(`tag @s remove ${CONFIG.TAGS.MENU}`);
    
    world.setDynamicProperty("in_menu", false);
    DIMENSION.runCommand("tag @a add in_lobby");

    if (ACTIVE_TIMERS.menuLoop) system.clearRun(ACTIVE_TIMERS.menuLoop);

    system.runTimeout(() => {
        MENU_ENTITIES.newGame.triggerEvent("default");
        MENU_ENTITIES.continue.triggerEvent("default");
    }, 60);

    if (isNewGame) {
        runCommandList(COMMANDS.NEW_GAME_INIT);

        player.runCommand("scoreboard players add @s new_game 1");
        player.runCommand("scoreboard players set @s coin_amount 0");
        player.runCommand("xp -10L @s");
        
        const cutscenePlayers = world.getPlayers({ tags: [CONFIG.TAGS.CUTSCENE] });

        startAllCutscenes(cutscenePlayers);
    } else if (isContinue) {
        DIMENSION.runCommand(`tp @a ${CONFIG.COORDS.SPAWN_POINT}`);
        DIMENSION.runCommand(`fill ${CONFIG.COORDS.AIR_FILL_AREA} air`);
        DIMENSION.runCommand(`event entity @e[type=${CONFIG.IDS.DOOR}] "0"`);

        startMainGameLoop();
        gameStarter();
    }
});

// =============================================================================
// CUTSCENE SYSTEM
// =============================================================================

function startAllCutscenes(players) {
    playSceneIntro(players);
    playSceneTruckInterior();
    playSceneEngineStart();
    playSceneDriving();
    playSceneContainerNoise();
    playSceneCloseLid();
    playSceneArrival();
}

function startSkipSystem(playersInCutscene) {
    ACTIVE_TIMERS.skipLoop = system.runInterval(() => {
        const playerCount = world.getDynamicProperty("skip_cutscene_limit");
        const playerLimit = playersInCutscene.length;
				
        DIMENSION.runCommand(`title @a actionbar Skip the cutscene: ${playerCount}/${playerLimit}`);
        
        if (playerCount > 0 && playerLimit === playerCount) {
            for (const key in ACTIVE_TIMERS) {
                if (key.startsWith('scene') && ACTIVE_TIMERS[key] !== null) system.clearRun(ACTIVE_TIMERS[key]);
            }
            runCommandList(COMMANDS.SKIP_CLEANUP);

            startMainGameLoop();
            gameStarter();

            system.clearRun(ACTIVE_TIMERS.skipLoop);
        }
    }, 15);
}

world.afterEvents.itemUse.subscribe((event) => {
    if (event.itemStack.typeId === CONFIG.IDS.SKIP_ITEM) {
        world.setDynamicProperty("skip_cutscene_limit", world.getDynamicProperty("skip_cutscene_limit") + 1);
        event.source.runCommand(`clear @s ${CONFIG.IDS.SKIP_ITEM}`);
    }
});

// --- SCENE FUNCTIONS ---

function playSceneIntro(players) {
    ACTIVE_TIMERS.sceneIntro = system.runTimeout(() => {
        runCommandList(COMMANDS.SCENE_INTRO);
        startSkipSystem(players);
    }, CONFIG.TIMESTAMPS.INTRO);
}

function playSceneTruckInterior() {
    ACTIVE_TIMERS.sceneTruck = system.runTimeout(() => {
        runCommandList(COMMANDS.SCENE_TRUCK);
    }, CONFIG.TIMESTAMPS.TRUCK_INTERIOR);
}

function playSceneEngineStart() {
    ACTIVE_TIMERS.sceneEngine = system.runTimeout(() => {
        DIMENSION.runCommand(`playsound engine_start @a[tag=${CONFIG.TAGS.CUTSCENE}]`);
    }, CONFIG.TIMESTAMPS.ENGINE_START);
}

function playSceneDriving() {
    ACTIVE_TIMERS.sceneDriving = system.runTimeout(() => {
        DIMENSION.runCommand(`playsound driving @a[tag=${CONFIG.TAGS.CUTSCENE}]`);
    }, CONFIG.TIMESTAMPS.DRIVING);
}

function playSceneContainerNoise() {
    ACTIVE_TIMERS.sceneNoise = system.runTimeout(() => {
        DIMENSION.runCommand(`playsound truck_container @a[tag=${CONFIG.TAGS.CUTSCENE}]`);
    }, CONFIG.TIMESTAMPS.CONTAINER_NOISE);
}

function playSceneCloseLid() {
    ACTIVE_TIMERS.sceneLid = system.runTimeout(() => {
        DIMENSION.runCommand(`playsound close_lid @a[tag=${CONFIG.TAGS.CUTSCENE}]`);
        DIMENSION.runCommand(`clear @a[tag=${CONFIG.TAGS.CUTSCENE}] ${CONFIG.IDS.SKIP_ITEM}`);
    }, CONFIG.TIMESTAMPS.CLOSE_LID);
}

function playSceneArrival() {
    ACTIVE_TIMERS.sceneArrival = system.runTimeout(() => {
        runCommandList(COMMANDS.SCENE_ARRIVAL);

        startMainGameLoop();
        gameStarter();
        
        system.clearRun(ACTIVE_TIMERS.skipLoop);
    }, CONFIG.TIMESTAMPS.ARRIVAL);
}