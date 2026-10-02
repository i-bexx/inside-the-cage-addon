import { world } from "@minecraft/server";

import { teleportNull } from "./nullTeleport";

const TELEPORT_STAGES = [
    [2400, 2000, 2800],
    [1800, 2000, 1750],
    [1560, 1220, 1460],
    [1200, 1000, 800],
    [660, 600, 560],
    [400, 320, 510],
    [300, 380, 450],
    [280, 310, 340]
];

export function nullTeleportTimeSetter(soulsFreedValue) {
	const isChecking = world.getDynamicProperty("nullTeleportChecking");
    
    if (!isChecking && soulsFreedValue >= 0 && soulsFreedValue <= 7)
        runTeleporter(soulsFreedValue);
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