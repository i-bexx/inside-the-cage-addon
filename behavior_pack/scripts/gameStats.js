import { world, system } from "@minecraft/server";

// ==========================================
// SYSTEM: MODULE IMPORTS
// ==========================================

import { resetWorldDynamicPropertyData, resetPlayerDynamicPropertyData, commandsToResetTheGame, resetMaps, clearPlayerMaps, stopFunctionsInMaps, commandsToResetPlayerData } from "./resetStats";
import { gameStarter, checkIfPositionClear } from "./gameStarter";
import { getGameStartedObjective, getGameRestartedObjective, getGameEndedObjective, getPlayersInRoundObjective, getValueParticipant, getObjectiveScore } from "./scoreboards";
import { getPlayersInRound } from "./getPlayersArray"; 

import { stopTheFunctions } from "./resetStats";
import { initiateCam } from "./cameraUsage";
import { teleportStalker } from "./stalkerEntity";
import { givePanelItem } from "./panels";

import { playerLookingControl } from "./RoundBegin/playerLooking";
import { Ambiance_control } from "./RoundBegin/ambianceController";
import { Stamina_control } from "./RoundBegin/Stamina";
import { Sanity_control } from "./RoundBegin/Sanity";
import { Battery_control } from "./RoundBegin/batteryController";
import { spawnCages } from "./RoundBegin/cageController";
import { startCoinSpawner } from "./RoundBegin/coinSpawner";
import { soulsAmountCheck } from "./RoundBegin/soulController";
import { decidePasswords } from "./RoundBegin/passwordManager";

import { nullTeleportTimeSetter } from "./RoundBegin/Null/nullTeleport";

import { restartRound } from "./RoundBegin/RoundOperations/restartRound";
import { finishRoundEarly } from "./RoundBegin/RoundOperations/finishRoundEarly";

import { updateGlobalUi } from "./UI/globalUi";

// ==========================================
// SYSTEM: CONFIGURATION & COMMANDS
// ==========================================

let dimension;

const INITIAL_GAME_STATE = {
    isGameStarted: 0
};

const INITIAL_RESTART_GAME_STATE = {
    isGameRestarted: 0
};

const INITIAL_ENDED_GAME_STATE = {
    isGameEnded: 0
};

const GAME_COMMANDS = {
    LOBBY_MAINTENANCE: {
        NULL_TELEPORT: "tp @e[type=game:null] -65 75 -150"
    },
    GAME_OVER: {
        RESET_SCOREBOARD: "scoreboard players set value game_started 0"
    }
};

// ==========================================
// SYSTEM: FUNCTION REGISTRIES
// ==========================================

const FUNCTIONS_TO_START = {
    initiateCam,
    nullTeleportTimeSetter,
    playerLookingControl,
    teleportStalker,
    givePanelItem,
    soulsAmountCheck,
    Ambiance_control,
    Stamina_control,
    Sanity_control,
    Battery_control,
    spawnCages,
    startCoinSpawner,
    decidePasswords,
    updateGlobalUi
};

const FUNCTIONS_TO_END_ROUND = {
		stopTheFunctions,
    resetMaps,
    resetWorldDynamicPropertyData,
    gameStarter
};


let isGameStarted;

// ==========================================
// SYSTEM: STATE MANAGEMENT
// ==========================================

const state = new Proxy({ ...INITIAL_GAME_STATE }, {
    set(target, key, value) {
        // Optimization: Do not react if the value hasn't changed
        if (target[key] == value) return true;

        target[key] = value;

        const gameActive = (target[key] == 1);

        if (gameActive) {
            roundStarted();
        } else {
            roundOver();
        }
        return true;
    }
});

const gameRestartState = new Proxy({ ...INITIAL_RESTART_GAME_STATE }, {
    set(target, key, value) {
        // Optimization: Do not react if the value hasn't changed
        if (target[key] == value) return true;
        
        target[key] = value;

        const restartingGame = (target[key] == 1);
        if (restartingGame) restartRound();
        
        return true;
    }
});

const gameEndedState = new Proxy({ ...INITIAL_ENDED_GAME_STATE }, {
    set(target, key, value) {
        // Optimization: Do not react if the value hasn't changed
        if (target[key] == value) return true;
        
        target[key] = value;

        const endingGameEarly = (target[key] == 1);
        if (endingGameEarly) finishRoundEarly();

        return true;
    }
});

// ==========================================
// SYSTEM: MAIN GAME LOOP
// ==========================================

// Only called after the players no longer in menu
export function startMainGameLoop() {
    system.runInterval(() => {
        state.isGameStarted = getObjectiveScore(getGameStartedObjective(), getValueParticipant());
        gameRestartState.isGameRestarted = getObjectiveScore(getGameRestartedObjective(), getValueParticipant());
				gameEndedState.isGameEnded = getObjectiveScore(getGameEndedObjective(), getValueParticipant());

        isGameStarted = state.isGameStarted;

        if (isGameStarted == 0) { // Run commands if the game has NOT started
          dimension.runCommand(GAME_COMMANDS.LOBBY_MAINTENANCE.NULL_TELEPORT);
        } else { // If game started and no people left, the game shall reset
					const inGamePlayers = getPlayersInRound();

					if (inGamePlayers.length == 0) world.setDynamicProperty("roundOver", true);
					if (world.getDynamicProperty("roundOver")) dimension.runCommand(GAME_COMMANDS.GAME_OVER.RESET_SCOREBOARD);
				}
    }, 5);
}

// ==========================================
// SYSTEM: ROUND LOGIC
// ==========================================

function roundStarted() {
    for (const func of Object.values(FUNCTIONS_TO_START)) {
        func();
    }
    checkIfPositionClear().clear();
}

function roundOver() {
    const players = world.getPlayers().filter(p => !p.hasTag("in_lobby"));

    // Reset data for world overall
    for (const func of Object.values(FUNCTIONS_TO_END_ROUND)) {
        func();
    }
    commandsToResetTheGame(dimension);
    
    // Reset data for each player
    for (const player of players) {
		stopFunctionsInMaps(player.id);
        clearPlayerMaps(player.id);
        resetPlayerDynamicPropertyData(player);
        commandsToResetPlayerData(player);
    }
}

export function setGlobalVariables() { dimension = world.getDimension("overworld"); }