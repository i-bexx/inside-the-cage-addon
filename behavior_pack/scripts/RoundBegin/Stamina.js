import { world, system } from "@minecraft/server";

import { getPlayersInRound } from "../getPlayersArray";
import { getStaminaObjective, getStaminaLimitObjective, getObjectiveScore } from "../scoreboards";

const cooldowns = new Map();
const DURATION_TIME = 3000

let intervalId = 0;
let players = [];

let staminaObjective;
let staminaLimitObjective;

function initialFunction() {
	staminaObjective = getStaminaObjective();
	staminaLimitObjective = getStaminaLimitObjective();

	//Security Check
	if (!staminaObjective || !staminaLimitObjective) {
		world.sendMessage("Scoreboard objective not found.");
		return;
	}
}

// Run when world loads
system.run(initialFunction);

export function Stamina_control () {
intervalId = system.runInterval(() => {
	players = getPlayersInRound();
	checkPlayerRunningState(players);
},20)
}

function checkPlayerRunningState(players) {
	for (const player of players) {
		const staminaValue = getObjectiveScore(staminaObjective, player.scoreboardIdentity) ?? 10;
		const staminaLimit = getObjectiveScore(staminaLimitObjective, player.scoreboardIdentity) ?? 10;
		
		let isPlayerRunning = player.isSprinting;
		let isStaminaFull = staminaValue == staminaLimit;
		let isStaminaEmpty = staminaValue == 0;
		
		if (isPlayerRunning) {
			playerIsRunning(player, isStaminaEmpty);
		} else {
			playerIsNotRunning(player, isStaminaFull, isStaminaEmpty);
			}
	}
}

function playerIsRunning(player, isStaminaEmpty) {
  if (!isStaminaEmpty) {
		player.runCommand("scoreboard players remove @s Stamina 1");
		cooldowns.delete(player.id) //If running, delete the cooldown timer so it can be set again when stopping
		} else {
				player.triggerEvent("slowness_event");
		}
}
function playerIsNotRunning(player, isStaminaFull, isStaminaEmpty) {
	const isLookingAtHostile = player.getDynamicProperty("is_looking");
	if (isLookingAtHostile) return;
	
	const time = Date.now();

	let doesPlayerHaveCooldown = cooldowns.has(player.id);
	let playerCooldown = cooldowns.get(player.id);

	let isPlayerUsingCamera = player.getDynamicProperty("camUsing")

	if (isStaminaFull) {
		return;
	} else {
		if (!doesPlayerHaveCooldown) { //If player doesn't have cooldown, meaning it either is running or stopped running and its stamina is filling, set it
				cooldowns.set(player.id, time + DURATION_TIME)
				return;
		}
		if (playerCooldown < time) { //When time is up, restore stamina
				if (isStaminaEmpty) {
					if (isPlayerUsingCamera) player.triggerEvent("static_movement_event");
					 else player.triggerEvent("normal_movement_event");
					
					cooldowns.delete(player.id) //Delete cooldown so it can be set again when stopping
				}
				player.runCommand("scoreboard players add @s Stamina 1");
		} else return; 
		}
}

export function getStaminaId() {
  return intervalId
}

export function playerResetStaminaCooldownMap() {
	return cooldowns;
}
