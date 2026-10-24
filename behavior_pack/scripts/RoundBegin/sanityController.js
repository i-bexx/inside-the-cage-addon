import { system, world } from "@minecraft/server";

import { game_over } from "../Player/resetPlayerData";
import { PlayerCache } from "../Player/playerCache";
import { ROUND_STATE_MAP } from "../gameStats";

let playsoundHeart = new Map();
let sanityLowStaticSoundId = new Map();
let sanityLowStaticEventId = new Map();

export function Sanity_control(player, playerState) {
	let sanityValue = playerState.sanity;

	checkPlayerLookingState(player, sanityValue);
	checkPlayerHeartPoundingState(player, sanityValue);
	checkPlayerSanityLowStaticSound(player, sanityValue);
	lowSanityStatic(player, sanityValue);
}

//SANITY DECREASE LOGIC
async function checkPlayerLookingState(player, sanityValue) {
		let isPlayerLooking = player.getDynamicProperty("is_looking");
		let playerIsNotLookingCooldown = player.getDynamicProperty("notLookingCooldown");
		let playerIsLookingCooldown = player.getDynamicProperty("lookingCooldown");
		let isSanityZero = (sanityValue == 0);
		
		let decreaseSanityWhenNotLooking = (!isPlayerLooking && !playerIsNotLookingCooldown && !isSanityZero);
		let decreaseSanityWhenLooking = (isPlayerLooking && !playerIsLookingCooldown && !isSanityZero);

		if (decreaseSanityWhenNotLooking) playerIsNotLooking(player, sanityValue);
		else if (decreaseSanityWhenLooking) playerIsLooking(player, sanityValue);

		if (isSanityZero) game_over(player);
}
function playerIsNotLooking(player, sanityValue) {
	player.setDynamicProperty("notLookingCooldown", true);

	system.runTimeout(() => {
		if (!player || !player.isValid || !player.hasTag("in_game") || ROUND_STATE_MAP.get("ROUND_COMPLETED")) return;

		if (sanityValue != 0) player.runCommand("scoreboard players remove @s Sanity 1");
		player.setDynamicProperty("notLookingCooldown", false);
	}, 160)
}
function playerIsLooking(player, sanityValue) {
	player.setDynamicProperty("lookingCooldown", true);

	system.runTimeout(() => {
		if (!player || !player.isValid || !player.hasTag("in_game") || ROUND_STATE_MAP.get("ROUND_COMPLETED")) return;

		if (sanityValue != 0) player.runCommand("scoreboard players remove @s Sanity 1");
		player.setDynamicProperty("lookingCooldown", false);
	}, 30)
}

function lowSanityStatic(player, sanityValue) {
		let isSanityLow = (sanityValue <= 33);

		const cache = PlayerCache.get(player.id);
		let isUsingCam = cache ? cache.camUsing : false;
		let willPlayerGetNoSignalNow = player.getDynamicProperty("nowPlayerWillGetNoSignal");

		let isPlayerLooking = player.getDynamicProperty("is_looking");

		let isPlayingStaticEvent = sanityLowStaticEventId.has(player.id);

		if (isSanityLow && isUsingCam && !willPlayerGetNoSignalNow && !isPlayingStaticEvent) {
			sanityLowStaticEventId.set(player.id, true);

			if (!isPlayerLooking) player.triggerEvent("static_low_sanity_event")
		}
		else if (!isSanityLow && isUsingCam && !willPlayerGetNoSignalNow && isPlayingStaticEvent) {
			sanityLowStaticEventId.delete(player.id);

			if (!isPlayerLooking) player.triggerEvent("static_event");
		}
}

// HEART POUNDING SOUND EFFECT
function checkPlayerHeartPoundingState(player, sanityValue) {
			const isPlayersHeartPounding = playsoundHeart.has(player.id);
			const component = player.getComponent("minecraft:mark_variant");

			let shouldHeartPound = (sanityValue <= 33 && component.value === 556);

			if (shouldHeartPound && !isPlayersHeartPounding) {
				player.runCommand("playsound heart @s");
				playerHeartPounding(player);

			} else if (!shouldHeartPound && isPlayersHeartPounding) {
					const playerHeartState = playsoundHeart.get(player.id);

					if (playerHeartState) {
						playsoundHeart.delete(player.id);
						system.clearRun(playerHeartState);
						player.runCommand("stopsound @s heart");
					}
			}
}
function playerHeartPounding(player) {
	if (playsoundHeart.has(player.id)) return;

	let func = system.runInterval(() => {
		const isPlayersHeartPounding = playsoundHeart.has(player.id);
		if (isPlayersHeartPounding) player.runCommand("playsound heart @s");
	}, 125)

	playsoundHeart.set(player.id, func);
}

// SANITY LOW STATIC SOUND EFFECT
function checkPlayerSanityLowStaticSound(player, sanityValue) {
	const isPlayingStaticSound = sanityLowStaticSoundId.has(player.id);
	const component = player.getComponent("minecraft:mark_variant");

	let shouldPlayStatic = sanityValue <= 33 && component.value === 556;

	if (shouldPlayStatic && !isPlayingStaticSound) {
		player.runCommand("playsound static_low_sanity @s");
		sanityLowStaticSound(player);

	} else if (!shouldPlayStatic && isPlayingStaticSound) {
			const playerStaticState = sanityLowStaticSoundId.get(player.id);
			
			if (playerStaticState) {
				sanityLowStaticSoundId.delete(player.id);
				system.clearRun(playerStaticState);
				player.runCommand("stopsound @s static_low_sanity");
			}
	}
}
function sanityLowStaticSound(player) {
	if (sanityLowStaticSoundId.has(player.id)) return;
	
	let func = system.runInterval(() => {
		const shouldPlayingStaticSound = sanityLowStaticSoundId.has(player.id);
		if (shouldPlayingStaticSound) player.runCommand("playsound static_low_sanity @s");
	}, 60)

	sanityLowStaticSoundId.set(player.id, func);
}

export function getPlaysoundHeartMap() { return playsoundHeart; }
export function getSanityLowStaticSoundMap() { return sanityLowStaticSoundId; }
export function getSanityLowStaticEventMap() { return sanityLowStaticEventId; }