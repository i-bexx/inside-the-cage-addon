import { world, system } from "@minecraft/server";

import { getRandomPlayer, isValidLocation } from "./helperFunctions";

const MAX_TELEPORT_ATTEMPTS = 10;
const TELEPORT_OFFSETS = [
    { x: 6, y: 0, z: -2 }, { x: 0, y: 0, z: 7 }, { x: -4, y: 0, z: 0 },
    { x: 3, y: 0, z: 3 }, { x: 9, y: 0, z: 0 }, { x: 0, y: 0, z: -8 },
    { x: -2, y: 0, z: 7 }, { x: -11, y: 0, z: 2 }, { x: -5, y: 0, z: 4 },
    { x: 3, y: 0, z: 0 }
];

let dimension;
let teleportCountdown = undefined;

export function teleportNull(ticks) {
    if (teleportCountdown !== undefined) return;

    teleportCountdown = system.runTimeout(() => {
        const players = world.getAllPlayers();
        const chosenPlayer = getRandomPlayer(players);

        const nullEntities = dimension.getEntities({ type: "game:null" });
        const nullEntity = nullEntities[0];

        if (!nullEntity) return; 

        attemptNullTeleport(chosenPlayer.location, nullEntity);

        world.setDynamicProperty("nullTeleportChecking", false);
        teleportCountdown = undefined;
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

        if (isValidLocation(dimension, targetPos, beneathPos)) {
            entity.tryTeleport(targetPos);
            return true; // Success
        }
    }

    return false; // Failed to find a spot
}


export function stopTeleportNull() {
    if (teleportCountdown === undefined) return;
    system.clearRun(teleportCountdown);
    teleportCountdown = undefined;
}

export function setGlobalVariables() { dimension = world.getDimension("overworld"); }