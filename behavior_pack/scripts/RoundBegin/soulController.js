import { world, Difficulty } from "@minecraft/server";

import { cameraUsed } from "../cameraUsage";
import { getPlayersInRound } from "../utils";
import { roundCompleted } from "./roundCompleted";
import { stopDifficultyMonitor } from "./ghostController";
import { warnPlayerAboutCam } from "./cameraController";
import { updateGlobalUi } from "../UI/globalUi";

import { getSanityObjective, getObjectiveScore } from "../scoreboards";
import { PlayerCache } from "../Player/playerCache";

import { stopTeleportNull } from "./Null/nullTeleport";


export function soulsAmountCheck(soulsFreedValue) {
	const isSoulsFreedValueSufficient = [4, 5].includes(soulsFreedValue) && !world.getDynamicProperty("nowPlayersWillGetNoSignalWhenUseCam");
	const isSoulsFreedValue4 = soulsFreedValue == 4 && world.getDynamicProperty("cages4Activated") == false;
	const isSoulsFreedValue5 = soulsFreedValue == 5 && world.getDynamicProperty("cages5Activated") == false;
	const doesSoulsFreedValueExceed = soulsFreedValue == 6;
	const areAllCagesCollected = soulsFreedValue == 7;

	const players = getPlayersInRound();

	if (isSoulsFreedValueSufficient) soulsFreedValueSufficient();
	if (isSoulsFreedValue4) soulsFreedValue4();
	else if (isSoulsFreedValue5) soulsFreedValue5();
	else if (doesSoulsFreedValueExceed) soulsFreedValueExceeded(players);
	else if (areAllCagesCollected) roundCompleted();

	updateGlobalUi();
}

function soulsFreedValueSufficient() {
	world.setDifficulty(Difficulty.Normal);

	warnPlayerAboutCam();
	canTurnOffCam();

	stopTeleportNull();

	world.getDimension("overworld").runCommand("tp @e[type=game:null] -65 75 -150");
	world.setDynamicProperty("nowPlayersWillGetNoSignalWhenUseCam", true);
	world.setDynamicProperty("nullTeleportChecking", false);
}

function soulsFreedValue4() {
	world.setDynamicProperty("cages4Activated", true);
	world.setDynamicProperty("cages5Activated", false);
}

function soulsFreedValue5() {
	world.setDynamicProperty("cages5Activated", true);
	world.setDynamicProperty("cages4Activated", false);
}

async function soulsFreedValueExceeded(players) {
	stopDifficultyMonitor();

	world.setDynamicProperty("nowPlayersWillGetNoSignalWhenUseCam", false);
	
  for (const player of players) {
		player.setDynamicProperty("nowPlayerWillGetNoSignal", false);
		player.setDynamicProperty("initializationBeforeLockingTheCam", true);
		player.setDynamicProperty("canTurnOffCam", false);
		
		player.runCommand("clear @s game:camera");
		player.runCommand("clear @s game:camera_turn_off");

		let sanityValue = getObjectiveScore(getSanityObjective(), player.scoreboardIdentity);
		let staminaValue = PlayerCache.get(player.id)?.stamina;
		
		cameraUsed(player, sanityValue, staminaValue);
  }
}

function canTurnOffCam() {
const players = getPlayersInRound();
    for (const player of players) {
        player.setDynamicProperty("canTurnOffCam", true);
        player.runCommand(`replaceitem entity @s slot.hotbar 8 game:camera_turn_off 1 0 {"minecraft:item_lock": {"mode": "lock_in_inventory"}}`);
    }
}
