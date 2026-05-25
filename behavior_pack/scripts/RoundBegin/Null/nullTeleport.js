import { world, system } from "@minecraft/server";

import { getAllPlayers } from "../../getPlayersArray";
import { getSoulsFreedObjective, getValueParticipant, getObjectiveScore } from "../../scoreboards";

const TELEPORT_STAGES = [
    [2400, 2000, 2800], // Stage 0
    [1800, 2000, 1750], // Stage 1
    [1560, 1220, 1460], // Stage 2
    [1200, 1000, 800],  // Stage 3
    [660, 600, 560],    // Stage 4
    [400, 320, 510],    // Stage 5
    [300, 380, 450],    // Stage 6
    [280, 310, 340]     // Stage 7
];

let dimension;

let teleportCountdown = undefined;
let intervalId = undefined;


export function nullTeleportTimeSetter() {
	intervalId = system.runInterval(() => {
		const isChecking = world.getDynamicProperty("nullTeleportChecking");
		let soulsFreedAmount = getCurrentSouls();
		
		if (!isChecking && soulsFreedAmount >= 0 && soulsFreedAmount <= 7) {	
			runTeleporter(soulsFreedAmount);
		}
	}, 60);
}

/**
	*@param {number} stageIndex
*/

function runTeleporter(stageIndex) {
	const possibleTicks = TELEPORT_STAGES[stageIndex];
	const randomTickValue = possibleTicks[Math.floor(Math.random() * possibleTicks.length)];

	teleportNull(randomTickValue);

	world.setDynamicProperty("nullTeleportChecking", true);
}

// Configuration constants
const MAX_TELEPORT_ATTEMPTS = 10;
const TELEPORT_OFFSETS = [
    { x: 6, y: 0, z: -2 }, { x: 0, y: 0, z: 7 }, { x: -4, y: 0, z: 0 },
    { x: 3, y: 0, z: 3 }, { x: 9, y: 0, z: 0 }, { x: 0, y: 0, z: -8 },
    { x: -2, y: 0, z: 7 }, { x: -11, y: 0, z: 2 }, { x: -5, y: 0, z: 4 },
    { x: 3, y: 0, z: 0 }
];

function teleportNull(ticks) {
    teleportCountdown = system.runTimeout(() => {
        const players = getAllPlayers();
        const chosenPlayer = getRandomPlayer(players);

        const nullEntities = dimension.getEntities({ type: "game:null" });
        const nullEntity = nullEntities[0];

        if (!nullEntity) return; 

        attemptNullTeleport(chosenPlayer.location, nullEntity);

        world.setDynamicProperty("nullTeleportChecking", false);
    }, ticks);
}
function attemptNullTeleport(coordinate, entity) {
    const currentCoordinate = {
        x: Math.floor(coordinate.x),
        y: Math.floor(coordinate.y),
        z: Math.floor(coordinate.z)
    };

    const shuffledOffsets = [...TELEPORT_OFFSETS].sort(() => 0.5 - Math.random());

    for (let i = 0; i < shuffledOffsets.length && i < MAX_TELEPORT_ATTEMPTS; i++) {
        const offset = shuffledOffsets[i];
        
        const targetPos = {
            x: currentCoordinate.x + offset.x,
            y: currentCoordinate.y + offset.y,
            z: currentCoordinate.z + offset.z
        };

        const beneathPos = { ...targetPos, y: targetPos.y - 1 };

        if (isValidLocation(targetPos, beneathPos)) {
            entity.tryTeleport(targetPos);
            return true; // Success
        }
    }

    return false; // Failed to find a spot
}
function isValidLocation(pos, beneathPos) {
    const block = dimension.getBlock(pos);
    const blockBeneath = dimension.getBlock(beneathPos);

    if (!block || !blockBeneath) return false;

    const isAir = block.typeId === "minecraft:air";
    const isSolidBeneath = blockBeneath.typeId !== "minecraft:water" 
                        && blockBeneath.typeId !== "minecraft:air";

    return isAir && isSolidBeneath;
}

//GETTER FUNCTIONS
function getCurrentSouls() {
	return getObjectiveScore(getSoulsFreedObjective(), getValueParticipant());
}

function getRandomPlayer(playersArray) {
	let index = Math.floor(Math.random() * playersArray.length);
    return playersArray[index];
}

export function stopNullTeleportTimeSetter() {
    if (intervalId === undefined) return;
    system.clearRun(intervalId);
    intervalId = undefined;
}
export function stopTeleportNull() {
    if (teleportCountdown === undefined) return;
    system.clearRun(teleportCountdown);
    teleportCountdown = undefined;
}

export function setGlobalVariables() { dimension = world.getDimension("overworld"); }