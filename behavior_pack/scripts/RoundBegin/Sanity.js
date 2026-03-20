import { world, system } from "@minecraft/server";

import { getPlayersInRound } from "../getPlayersArray";
import { game_over } from "../Player/resetPlayerData";
import { getSanityObjective, getObjectiveScore } from "../scoreboards";

let sanityObjective;

let players = [];
let intervalId = 0;

let playsoundHeart = new Map();
let sanityLowStaticSoundId = new Map();
let sanityLowStaticEventId = new Map();

function initialFunction() {
	sanityObjective = getSanityObjective();

	if (!sanityObjective) {
		world.sendMessage("Scoreboard objective not found.");
		return;
	}
}

// Run when world loads
system.run(initialFunction);

//SANITY CONTROL INTERVAL
export function Sanity_control() {
	intervalId = system.runInterval(() => {
		players = getPlayersInRound()

		checkPlayerLookingState(players)
		checkPlayerHeartPoundingState(players)
		checkPlayerSanityLowStaticSound(players)
		lowSanityStatic(players)
	},5)
}

//SANITY DECREASE LOGIC
async function checkPlayerLookingState(players) {
	for (const player of players) {
		let isPlayerLooking = player.getDynamicProperty("is_looking")
		let playerIsNotLookingCooldown = player.getDynamicProperty("notLookingCooldown")
		let playerIsLookingCooldown = player.getDynamicProperty("lookingCooldown")
		let isSanityZero = getObjectiveScore(sanityObjective, player.scoreboardIdentity) == 0
		
		let decreaseSanityWhenNotLooking = !isPlayerLooking && !playerIsNotLookingCooldown && !isSanityZero
		let decreaseSanityWhenLooking = isPlayerLooking && !playerIsLookingCooldown && !isSanityZero

		if (decreaseSanityWhenNotLooking) { // When player is not looking, sanity will decrease every 8 seconds
				playerIsLooking(player)
		} else if (decreaseSanityWhenLooking) { // When player is looking, sanity will decrease every 1.5 seconds
				playerIsNotLooking(player)
		}
		if (isSanityZero) {
				game_over(player)
		}
	}
}
function playerIsLooking(player) {
	player.setDynamicProperty("notLookingCooldown", true)

	system.runTimeout(() => {
		player.runCommand("execute if score @s Sanity > value zero run scoreboard players remove @s Sanity 1")
		player.setDynamicProperty("notLookingCooldown", false)
},160)
}
function playerIsNotLooking(player) {
	player.setDynamicProperty("lookingCooldown", true)

	system.runTimeout(() => {
		player.runCommand("execute if score @s Sanity > value zero run scoreboard players remove @s Sanity 1")
		player.setDynamicProperty("lookingCooldown", false)
	},30)
}

function lowSanityStatic(players) {
	for (const player of players) {
		let sanityScore = getObjectiveScore(sanityObjective, player.scoreboardIdentity);
		let isSanityLow = sanityScore <= 33

		let isUsingCam = player.getDynamicProperty("camUsing")
		let willPlayerGetNoSignalNow = player.getDynamicProperty("nowPlayerWillGetNoSignal")

		let isPlayerLooking = player.getDynamicProperty("is_looking")

		let isPlayingStaticEvent = sanityLowStaticEventId.has(player.id) //Player gets the static event only once

		if (isSanityLow && isUsingCam && !willPlayerGetNoSignalNow && !isPlayingStaticEvent) {
			sanityLowStaticEventId.set(player.id, true)

			if (!isPlayerLooking) player.triggerEvent("static_low_sanity_event")
		} else if (!isSanityLow && isUsingCam && !willPlayerGetNoSignalNow && isPlayingStaticEvent) {
			sanityLowStaticEventId.delete(player.id)

			if (!isPlayerLooking) player.triggerEvent("static_event")
		}
	}
}

//HEART POUNDING SOUND EFFECT
function checkPlayerHeartPoundingState(players) {
	for (const player of players) {
			const isPlayersHeartPounding = playsoundHeart.has(player.id);
			const component = player.getComponent("minecraft:mark_variant");

			let sanityScore = getObjectiveScore(sanityObjective, player.scoreboardIdentity);
			let shouldHeartPound = sanityScore <= 33 && component.value === 556;

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
}
function playerHeartPounding(player) {
	let func = system.runInterval(() => {
		const isPlayersHeartPounding = playsoundHeart.has(player.id);
		if (isPlayersHeartPounding) player.runCommand("playsound heart @s") //When player joins, the map clears so the sound will not play
	}, 125)

	playsoundHeart.set(player.id, func)
}

//SANITY LOW STATIC SOUND EFFECT
function checkPlayerSanityLowStaticSound(players) {
    for (const player of players) {
        const isPlayingStaticSound = sanityLowStaticSoundId.has(player.id);
        const component = player.getComponent("minecraft:mark_variant");

        let sanityScore = getObjectiveScore(sanityObjective, player.scoreboardIdentity);
        let shouldPlayStatic = sanityScore <= 33 && component.value === 556;

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
}
function sanityLowStaticSound(player) {
		let func = system.runInterval(() => {
			const shouldPlayingStaticSound = sanityLowStaticSoundId.has(player.id);
			if (shouldPlayingStaticSound) player.runCommand("playsound static_low_sanity @s") //When player joins, the map clears so the sound will not play
		}, 60)
		sanityLowStaticSoundId.set(player.id, func)
}

export function getSanityId() {
    return intervalId;
}
export function getPlaysoundHeartMap() {
    return playsoundHeart;
}
export function getSanityLowStaticSoundMap() {
    return sanityLowStaticSoundId;
}
export function getSanityLowStaticEventMap() {
		return sanityLowStaticEventId;
}