import { world, system } from "@minecraft/server";

import { getPlayersInRound } from "../utils";
import { getStaminaObjective, getStaminaLimitObjective, getObjectiveScore } from "../scoreboards";

const COOLDOWNS = new Map();
const DURATION_TIME = 3000

let intervalId = undefined;
let players = [];


export function Stamina_control () {
	if (intervalId !== undefined) return;

	intervalId = system.runInterval(() => {
		players = getPlayersInRound();
		checkPlayerRunningState(players);
	},20)
}

function checkPlayerRunningState(players) {
	for (const player of players) {
		const staminaValue = getObjectiveScore(getStaminaObjective(), player.scoreboardIdentity) ?? 10;
		const staminaLimit = getObjectiveScore(getStaminaLimitObjective(), player.scoreboardIdentity) ?? 10;
		
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
		COOLDOWNS.delete(player.id) //If running, delete the cooldown timer so it can be set again when stopping
		} else {
				player.triggerEvent("slowness_event");
		}
}
function playerIsNotRunning(player, isStaminaFull, isStaminaEmpty) {
	const isLookingAtNull = player.getDynamicProperty("is_looking");
	if (isLookingAtNull) return;
	
	const time = Date.now();

	let doesPlayerHaveCooldown = COOLDOWNS.has(player.id);
	let playerCooldown = COOLDOWNS.get(player.id);

	let isPlayerUsingCamera = player.getDynamicProperty("camUsing")

	if (isStaminaFull) {
		return;
	} else {
		if (!doesPlayerHaveCooldown) { //If player doesn't have cooldown, meaning it either is running or stopped running and its stamina is filling, set it
				COOLDOWNS.set(player.id, time + DURATION_TIME)
				return;
		}
		if (playerCooldown < time) { //When time is up, restore stamina
				if (isStaminaEmpty) {
					if (isPlayerUsingCamera) player.triggerEvent("static_movement_event");
					 else player.triggerEvent("normal_movement_event");
					
					COOLDOWNS.delete(player.id) //Delete cooldown so it can be set again when stopping
				}
				player.runCommand("scoreboard players add @s Stamina 1");
		} else return; 
		}
}

export function stopStaminaControl() {
	if (intervalId === undefined) return;
  system.clearRun(intervalId);
  intervalId = undefined;
}

export function playerResetStaminaCooldownMap() { return COOLDOWNS; }
