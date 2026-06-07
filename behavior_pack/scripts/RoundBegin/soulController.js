import { world, system } from "@minecraft/server";

import { cameraUsed } from "../cameraUsage";
import { getPlayersInRound } from "../getPlayersArray";
import { teleportStalker, stopTeleportStalker } from "../stalkerEntity";
import { warnPlayerAboutCam, stopWarnPlayerAboutCam } from "./cameraController";
import { startCrosshairTracker, startPlayerShootTracker, stopCrosshairTracker, stopPlayerShootTracker } from "../cursorController";
import { getSoulsFreedObjective, getSanityObjective, getStaminaObjective, getValueParticipant, getObjectiveScore } from "../scoreboards";

import { nullTeleportTimeSetter } from "./Null/nullTeleport";
import { stopTeleportNull, stopNullTeleportTimeSetter } from "./Null/nullTeleport";


let intervalId = undefined;

const initialState = {
	isSoulsFreedValueSufficient: false,
	isSoulsFreedValue4: false,
	isSoulsFreedValue5: false,
	doesSoulsFreedValueExceed: false
}

const state = new Proxy({ ...initialState }, {
	set(target, key, value) {
		if (target[key] == value) return true;
		
		target[key] = value

		let isSoulsFreedValueSufficient = target["isSoulsFreedValueSufficient"]
		let isSoulsFreedValue4 = target["isSoulsFreedValue4"]
		let isSoulsFreedValue5 = target["isSoulsFreedValue5"]
		let doesSoulsFreedValueExceed = target["doesSoulsFreedValueExceed"]

		const players = getPlayersInRound();

		if (isSoulsFreedValueSufficient) {
			soulsFreedValueSufficient();
	}
		if (isSoulsFreedValue4) { //Will initiate only once when souls freed become 4
			soulsFreedValue4();
	} else if (isSoulsFreedValue5) { //Will initiate only once when souls freed become 5
			soulsFreedValue5();
	} else if (doesSoulsFreedValueExceed) {
			soulsFreedValueExceeded(players);
	}
	return true;
}
})

export function soulsAmountCheck() {
	if (intervalId !== undefined) return;
	
	intervalId = system.runInterval(() => {
	let soulsFreedValue = getObjectiveScore(getSoulsFreedObjective(), getValueParticipant());

	state.isSoulsFreedValueSufficient = [4, 5].includes(soulsFreedValue) && !world.getDynamicProperty("nowPlayersWillGetNoSignalWhenUseCam")
	state.isSoulsFreedValue4 = soulsFreedValue == 4 && world.getDynamicProperty("cages4Activated") == false
	state.isSoulsFreedValue5 = soulsFreedValue == 5 && world.getDynamicProperty("cages5Activated") == false
	state.doesSoulsFreedValueExceed = soulsFreedValue > 5
	}, 100)
}

function soulsFreedValueSufficient() {
	warnPlayerAboutCam();
	canTurnOffCam();
	startCrosshairTracker();
	startPlayerShootTracker();
	stopTeleportStalker();

	stopTeleportNull();
	stopNullTeleportTimeSetter();

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
	stopCrosshairTracker();
	stopPlayerShootTracker();
	teleportStalker();
	system.clearRun(intervalId);

	stopWarnPlayerAboutCam();
	world.setDynamicProperty("nowPlayersWillGetNoSignalWhenUseCam", false);
	
  for (const player of players) {
		await player.setDynamicProperty("nowPlayerWillGetNoSignal", false);
		await player.setDynamicProperty("initializationBeforeLockingTheCam", true);
		await player.setDynamicProperty("canTurnOffCam", false);
		
		player.runCommand("clear @s game:camera");
		player.runCommand("clear @s game:camera_turn_off");

		let sanityValue = getObjectiveScore(getSanityObjective(), player.scoreboardIdentity);
		let staminaValue = getObjectiveScore(getStaminaObjective(), player.scoreboardIdentity);
		
		cameraUsed(player, sanityValue, staminaValue);
		
  }
    nullTeleportTimeSetter();
}

function canTurnOffCam() {
const players = getPlayersInRound();
    for (const player of players) {
        player.setDynamicProperty("canTurnOffCam", true);
        player.runCommand(`replaceitem entity @s slot.hotbar 8 game:camera_turn_off 1 0 {"minecraft:item_lock": {"mode": "lock_in_inventory"}}`);
    }
}

export function stopSoulsAmountCheck() {
	if (intervalId === undefined) return;
    system.clearRun(intervalId);
    intervalId = undefined;
}