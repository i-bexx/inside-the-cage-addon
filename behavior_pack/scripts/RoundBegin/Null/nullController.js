import { world, system } from "@minecraft/server";

import { getCurrentSouls } from "./helperFunctions";
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

let intervalId = undefined;

export function nullTeleportTimeSetter() {
    if (intervalId !== undefined) return;
    
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


export function stopNullTeleportTimeSetter() {
    if (intervalId === undefined) return;
    system.clearRun(intervalId);
    intervalId = undefined;
}