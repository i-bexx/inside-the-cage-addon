import { world, system } from "@minecraft/server";

import { getPlayersInRound } from "../getPlayersArray";
import { getSoulsFreedObjective, getValueParticipant, getObjectiveScore } from "../Scoreboards";

let dimension;
let soulsFreedObjective;
let valueParticipant;
let soulsFreedValue;

let hostile_Counter = 0;
let intervalId_cages4 = 0;
let intervalId_cages5 = 0;

let stop_HostileSpawn = 0;
let continue_HostileSpawn = 0;

function initialFunction() {
	dimension = world.getDimension("overworld");
	soulsFreedObjective = getSoulsFreedObjective();

	// Safety Check
	if (!soulsFreedObjective || ! valueParticipant) {
		world.sendMessage("Scoreboard objective is not found.");
		return;
	}

	valueParticipant = getValueParticipant();

	// Safety Check
	if (!valueParticipant) {
		world.sendMessage("Scoreboard 'value' participant is not found.");
		return;
	}

	soulsFreedValue = getObjectiveScore(soulsFreedObjective, valueParticipant);
}

// Run when world loads
system.run(initialFunction);

function spawnLogic() {
const players = world.getPlayers().filter(p => !(p.hasTag("no_more_hostile")))
let amount = players.length

if (amount <= 0) return;

		let index = Math.floor(Math.random() * amount)
		let player = players[index]

		let loc = setCoordinates(player)
		let locIndex = Math.floor(Math.random() * 4)
		
		let block = dimension.getBlock(loc[locIndex])
		let isAir = block.typeId == "minecraft:air"

		if (isAir) {
				let hostile = dimension.spawnEntity('game:hostile', loc[locIndex])
				let shortId = getPlayerShortId(player);

				hostile.runCommand(`tag @s add "${shortId}_hostile"`)
		}  
}

const MAX_HOSTILE_COUNT = 15;
const CHECK_INTERVAL_TICKS = 100;
const TAG_NO_SPAWN = "no_more_hostile";

export function hostileCounter() { //Will always check if hostiles matched with player is more than 15, then more hostiles will stop spawning for that player
	hostile_Counter = system.runInterval(() => {
		const overworld = world.getDimension("overworld"); 
		const players = getPlayersInRound();

		for (const player of players) {
			const shortId = getPlayerShortId(player);
			const filter = {
				type: "game:hostile",
				tags: [`${shortId}_hostile`] 
			};
			const hostiles = overworld.getEntities(filter);

			updatePlayerTag(player, hostiles.length);
		}
	}, CHECK_INTERVAL_TICKS);
}

function updatePlayerTag(player, hostileCount) {
let hasPlayerTag = player.hasTag(TAG_NO_SPAWN);
	if (hostileCount > MAX_HOSTILE_COUNT) {

			if (!hasPlayerTag) {
					player.addTag(TAG_NO_SPAWN);
			}
	} else {
			if (hasPlayerTag) {
					player.removeTag(TAG_NO_SPAWN);
			}
	}
}

const TIME_UNTIL_SPAWN_STOPS = 18000;
const TIME_UNTIL_SPAWN_CONTINUES = 24000;


export function stopHostileSpawn() {
	stop_HostileSpawn = system.runTimeout(() => {
			resetHostileSystems();
			continueHostileSpawn();
	}, TIME_UNTIL_SPAWN_STOPS);
}

function resetHostileSystems() {
	if (intervalId_cages4) {
			system.clearRun(intervalId_cages4);
			intervalId_cages4 = null;
	}

	if (intervalId_cages5) {
			system.clearRun(intervalId_cages5);
			intervalId_cages5 = null;
	}

	if (hostile_Counter) {
			system.clearRun(hostile_Counter);
			hostile_Counter = null;
	}
}

// After hostile spawn stops once, this one will continue the hostile spawn when time is up
export function continueHostileSpawn() { 
continue_HostileSpawn = system.runTimeout(() => {
		Hostile_check()
		hostileCounter()
		stopHostileSpawn()
}, TIME_UNTIL_SPAWN_CONTINUES)
}

const CAGE_HANDLERS = {
	4: Cages_4,
	5: Cages_5
};

export function Hostile_check() {
	soulsFreedValue = getObjectiveScore(soulsFreedObjective, valueParticipant);

	if (CAGE_HANDLERS[soulsFreedValue]) {
			CAGE_HANDLERS[soulsFreedValue]();
	}
}
export function Cages_4() {
	intervalId_cages4 = system.runInterval(() => {
			spawnLogic()
	},180)
} 
export function Cages_5() {
	intervalId_cages5 = system.runInterval(() => {
			spawnLogic()
	},140)
} 

function getPlayerShortId(player) {
return parseInt(player.id.replace(/-/g, "").slice(0, 8), 16).toString()
}

function setCoordinates(player) {
	const locations = [
		{
				x: player.location.x + 3,
				y: player.location.y,
				z: player.location.z + 1
		},
		{
				x: player.location.x + 2,
				y: player.location.y,
				z: player.location.z + 3
		},
		{
				x: player.location.x + 1,
				y: player.location.y,
				z: player.location.z + 1
		},
		{
				x: player.location.x + 2,
				y: player.location.y,
				z: player.location.z + 2
		},
	]
	return locations;
}

export function getHostileCounterId() {
	return hostile_Counter;
}
export function getCages_4Id() {
	return intervalId_cages4;
}
export function getCages_5Id() {
	return intervalId_cages5;
}
export function getContinueHostileSpawnId() {
	return continue_HostileSpawn;
}
export function getStopHostileSpawnId() {
	return stop_HostileSpawn;
}
