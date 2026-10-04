import { PlayerCache } from "../Player/playerCache";

const COOLDOWNS = new Map();
const DURATION_TIME = 3000;


export function Stamina_control(player) {
	const cache = PlayerCache.get(player.id);
	if (!cache) return;
	
	let staminaValue = cache.stamina;
	let staminaLimit = cache.staminaLimit;
	
	let isPlayerRunning = player.isSprinting;
	let isStaminaFull = staminaValue == staminaLimit;
	let isStaminaEmpty = staminaValue == 0;
	
	if (isPlayerRunning) playerIsRunning(player, staminaValue, isStaminaEmpty); 
	else playerIsNotRunning(player, staminaValue, isStaminaFull, isStaminaEmpty);
}

function playerIsRunning(player, staminaValue, isStaminaEmpty) {
  if (!isStaminaEmpty) {
		const cache = PlayerCache.get(player.id);
		if (cache) cache.stamina = --staminaValue;
		COOLDOWNS.delete(player.id) //If running, delete the cooldown timer so it can be set again when stopping
		} else player.triggerEvent("slowness_event");
}
function playerIsNotRunning(player, staminaValue, isStaminaFull, isStaminaEmpty) {
	const isLookingAtNull = player.getDynamicProperty("is_looking");
	if (isLookingAtNull) return;
	
	const time = Date.now();

	let doesPlayerHaveCooldown = COOLDOWNS.has(player.id);
	let playerCooldown = COOLDOWNS.get(player.id);

	const cache = PlayerCache.get(player.id);
	let isPlayerUsingCamera = cache ? cache.camUsing : false;

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
				if (cache) cache.stamina = ++staminaValue;
		} else return; 
		}
}

export function playerResetStaminaCooldownMap() { return COOLDOWNS; }
