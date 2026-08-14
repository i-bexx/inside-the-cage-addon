import { getSoulsFreedObjective, getValueParticipant, getObjectiveScore } from "../../scoreboards";

export function getCurrentSouls() {
	return getObjectiveScore(getSoulsFreedObjective(), getValueParticipant());
}

export function getRandomPlayer(playersArray) {
	let index = Math.floor(Math.random() * playersArray.length);
    return playersArray[index];
}

export function isValidLocation(dimension, pos, beneathPos) {
    const block = dimension.getBlock(pos);
    const blockBeneath = dimension.getBlock(beneathPos);

    if (!block || !blockBeneath) return false;

    const isAir = block.typeId === "minecraft:air";
    const isSolidBeneath = blockBeneath.typeId !== "minecraft:water" 
                        && blockBeneath.typeId !== "minecraft:air";

    return isAir && isSolidBeneath;
}