import { world, system } from "@minecraft/server";

import { getPlayersInRound } from "../getPlayersArray";
import { cameraUsed } from "../cameraUsage";
import { playerCanShoot, getPlayerCanShootId } from "../cursorController";

import { warnPlayerAboutCam, getWarnPlayerAboutCamId, resetCameraWarningIntervalId } from "./cameraController";

import { getTeleportEntityId, getTimeSetterId } from "./Null/nullTeleport";
import { timeSetter } from "./Null/nullTeleport";

import { hostileCounter, stopHostileSpawn, Cages_4, Cages_5 } from "./Hostile";
import { getStopHostileSpawnId, getContinueHostileSpawnId, getCages_4Id, getCages_5Id } from "./Hostile";

import { getSoulsFreedObjective, getSanityObjective, getStaminaObjective, getValueParticipant, getObjectiveScore } from "../scoreboards";

let intervalId = 0;

let soulsFreedObjective;
let sanityObjective;
let staminaObjective;

let valueParticipant;
let soulsFreedValue;

function initialFunction() {
	soulsFreedObjective = getSoulsFreedObjective();
	sanityObjective = getSanityObjective();
	staminaObjective = getStaminaObjective();

	// Security Check
	if (!(soulsFreedObjective && sanityObjective && staminaObjective)) {
		world.sendMessage("Scoreboard objective not found.");
		return;
	}
	
	valueParticipant = getValueParticipant();

	// Security Check
	if (!valueParticipant) {
		world.sendMessage("Scoreboard 'value' participant is not found.");
		return;
	}

	soulsFreedValue = getObjectiveScore(soulsFreedObjective, valueParticipant);
}

// Run when world loads
system.run(initialFunction);

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

		const players = getPlayersInRound()

		if (isSoulsFreedValueSufficient) {
			soulsFreedValueSufficient()
	}
		if (isSoulsFreedValue4) { //Will initiate only once when souls freed become 4
			soulsFreedValue4()
	} else if (isSoulsFreedValue5) { //Will initiate only once when souls freed become 5
			soulsFreedValue5()
	} else if (doesSoulsFreedValueExceed) {
			soulsFreedValueExceeded(players)
	}
	return true;
}
})

export function soulsAmountCheck() {
	intervalId = system.runInterval(() => {
	soulsFreedValue = getObjectiveScore(soulsFreedObjective, valueParticipant);

	state.isSoulsFreedValueSufficient = [4, 5].includes(soulsFreedValue) && !world.getDynamicProperty("nowPlayersWillGetNoSignalWhenUseCam")
	state.isSoulsFreedValue4 = soulsFreedValue == 4 && world.getDynamicProperty("cages4Activated") == false
	state.isSoulsFreedValue5 = soulsFreedValue == 5 && world.getDynamicProperty("cages5Activated") == false
	state.doesSoulsFreedValueExceed = soulsFreedValue > 5
	}, 100)
}

function soulsFreedValueSufficient() {
	warnPlayerAboutCam()
	canTurnOffCam()
	playerCanShoot()
	hostileCounter()

	system.clearRun(getTeleportEntityId())
	system.clearRun(getTimeSetterId())

	world.getDimension("overworld").runCommand("tp @e[type=game:null] -65 75 -150")
	world.setDynamicProperty("nowPlayersWillGetNoSignalWhenUseCam", true)
}
function soulsFreedValue4() {
	Cages_4()
	stopHostileSpawn()

	world.setDynamicProperty("cages4Activated", true)
	world.setDynamicProperty("cages5Activated", false)
}
function soulsFreedValue5() {
	Cages_5()
	stopHostileSpawn()

	world.setDynamicProperty("cages5Activated", true)
	world.setDynamicProperty("cages4Activated", false)

	system.clearRun(getCages_4Id())
}
async function soulsFreedValueExceeded(players) {
	const functionsToStop = {
		continueHostileSpawn  				: getContinueHostileSpawnId(), 
    stopHostileSpawn      				: getStopHostileSpawnId(),
    cages4                				: getCages_4Id(),
    cages5                				: getCages_5Id(),
		warnPlayerAboutCam	  				: getWarnPlayerAboutCamId(),
		resetCameraWarningIntervalId	: resetCameraWarningIntervalId(),
		playerCanShoot		    				: getPlayerCanShootId(),
		intervalId					 					: intervalId
	}
	for (const [, value] of Object.entries(functionsToStop)) {
		system.clearRun(value)
	}
	world.setDynamicProperty("nowPlayersWillGetNoSignalWhenUseCam", false)
	
  for (const player of players) {
		await player.setDynamicProperty("nowPlayerWillGetNoSignal", false)
		await player.setDynamicProperty("initializationBeforeLockingTheCam", true)
		await player.setDynamicProperty("canTurnOffCam", false)
		player.runCommand("clear @s game:camera")
		player.runCommand("clear @s game:camera_turn_off")

		let sanityValue = getObjectiveScore(sanityObjective, player.scoreboardIdentity);
		let staminaValue = getObjectiveScore(staminaObjective, player.scoreboardIdentity);
		
		cameraUsed(player, sanityValue, staminaValue);
		
  }
    timeSetter()
}

function canTurnOffCam() {
const players = getPlayersInRound()
    for (const player of players) {
        player.setDynamicProperty("canTurnOffCam", true)
        player.runCommand("replaceitem entity @s slot.hotbar 8 game:camera_turn_off 1")
    }
}

export function getSoulsAmountCheckId() {
    return intervalId;
}