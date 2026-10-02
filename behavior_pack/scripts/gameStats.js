import { world } from "@minecraft/server";

// ==========================================
// SYSTEM: MODULE IMPORTS
// ==========================================

import { resetWorldDynamicPropertyData, resetEntitiesData, commandsToResetTheGame, resetMaps } from "./resetStats";
import { gameStarter, checkIfPositionClear } from "./gameStarter";
import { getGameStartedObjective, getGameRestartedObjective, getGameEndedObjective, getValueParticipant, getObjectiveScore } from "./scoreboards";

import { resetFunctions, despawnEntities } from "./resetStats";
import { initiateCam } from "./cameraUsage";
import { givePanelItem } from "./panels";

import { Ambiance_control } from "./RoundBegin/ambianceController";
import { spawnCages } from "./RoundBegin/cageController";
import { startcoinController } from "./RoundBegin/coinController";
import { decidePasswords } from "./RoundBegin/passwordManager";

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
    givePanelItem,
    Ambiance_control,
    spawnCages,
    startcoinController,
    decidePasswords,
    updateGlobalUi
};

const FUNCTIONS_TO_END_ROUND = {
	resetFunctions,
    resetMaps,
    resetWorldDynamicPropertyData,
    resetEntitiesData
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

        if (gameActive) roundStarted();
        else roundOver();
        
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

export function checkGameStatus(inGamePlayers) {
    state.isGameStarted = getObjectiveScore(getGameStartedObjective(), getValueParticipant());
    gameRestartState.isGameRestarted = getObjectiveScore(getGameRestartedObjective(), getValueParticipant());
    gameEndedState.isGameEnded = getObjectiveScore(getGameEndedObjective(), getValueParticipant());

    isGameStarted = state.isGameStarted;

    if (isGameStarted == 1)
        if (inGamePlayers.length == 0) dimension.runCommand(GAME_COMMANDS.GAME_OVER.RESET_SCOREBOARD);
}

// ==========================================
// SYSTEM: ROUND LOGIC
// ==========================================

function roundStarted() {
    for (const func of Object.values(FUNCTIONS_TO_START)) func();
    checkIfPositionClear().clear();
}

async function roundOver() {
    world.setDynamicProperty("reseting_round", true);

    // Reset data for world overall
    for (const func of Object.values(FUNCTIONS_TO_END_ROUND)) {
        func();
    }
    commandsToResetTheGame(dimension);
    await despawnEntities();

    const players = world.getAllPlayers().filter(p => p.hasTag("in_lobby"));

    for (const player of players) {
        player.playSound("random.orb");
        player.onScreenDisplay.setActionBar("§a§lSystem Ready!");
    }
    world.setDynamicProperty("reseting_round", false);
}

export function setGlobalVariables() { dimension = world.getDimension("overworld"); }