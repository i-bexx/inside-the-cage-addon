import { world } from "@minecraft/server";

import { resetWorldDynamicPropertyData, resetEntitiesData, commandsToResetTheGame, resetMaps } from "./resetStats";
import { checkIfPositionClear } from "./gameStarter";

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

let dimension;
export const ROUND_STATE_MAP = new Map();
ROUND_STATE_MAP.set("ROUND_STARTED", false);
ROUND_STATE_MAP.set("ROUND_RESTARTED", false);
ROUND_STATE_MAP.set("ROUND_ENDED_EARLY", false);

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

let currentGameState = 0;
let currentRestartState = 0;
let currentEndedState = 0;

// ==========================================
// SYSTEM: MAIN GAME LOOP
// ==========================================

export function checkGameStatus(inGamePlayers) {
    const isStarted = ROUND_STATE_MAP.get("ROUND_STARTED");
    const isRestarted = ROUND_STATE_MAP.get("ROUND_RESTARTED");
    const isEndedEarly = ROUND_STATE_MAP.get("ROUND_ENDED_EARLY");

    // 1. GAME STARTED / OVER CHECK
    if (currentGameState !== isStarted) {
        currentGameState = isStarted;
        if (isStarted == 1) roundStarted();
        else roundOver();
    }

    // 2. RESTART GAME CHECK
    if (currentRestartState !== isRestarted) {
        currentRestartState = isRestarted;
        if (isRestarted == 1) restartRound();
    }

    // 3. END GAME EARLY CHECK
    if (currentEndedState !== isEndedEarly) {
        currentEndedState = isEndedEarly;
        if (isEndedEarly == 1) finishRoundEarly();
    }

    // If game is active but no players, end it
    if (currentGameState == 1)
        if (inGamePlayers.length == 0) ROUND_STATE_MAP.set("ROUND_STARTED", false);
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