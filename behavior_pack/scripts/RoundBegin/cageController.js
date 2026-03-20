import { world, system } from "@minecraft/server";

import { getAllPlayers } from "../getPlayersArray";
import { updateGlobalUi } from "../UI/globalUi";

// ==========================================
// CONFIGURATION & VARIABLES
// ==========================================

const DIMENSION = world.getDimension("overworld");
const CONFIG = {
    CAGE_ID: "game:cage",
    PROPERTY_NAME: "cageBroken",
    EVENT_NAME: "broke_event",
    PARTICLE: "game:soulFree_particle",
    UPDATE_SCORE: "scoreboard players add value souls_freed 1",
    PLAYSOUND: "playsound break_cage @s"
};

let UNLOADED_LOCATIONS = [];

const CAGE_GROUPS = [
    // Group 1
    [{ x: 130, y: 67, z: -199 }, { x: -2, y: 69, z: -716 }, { x: -142, y: 66, z: -535 }, { x: 135, y: 66, z: -357 }, { x: 86, y: 66, z: -461 }],
    // Group 2
    [{ x: -138, y: 64, z: -429 }, { x: 124, y: 70, z: -301 }],
    // Group 3
    [{ x: -62, y: 67, z: -584 }, { x: 194, y: 70, z: -196 }, { x: 183, y: 66, z: -285 }, { x: 90, y: 67, z: -422 }, { x: -62, y: 63, z: -633 }],
    // Group 4
    [{ x: 109, y: 64, z: -174 }, { x: -55, y: 66, z: -462 }, { x: -19, y: 64, z: -523 }, { x: 178, y: 64, z: -100 }],
    // Group 5
    [{ x: 147, y: 56, z: -165 }, { x: 25, y: 69, z: -490 }, { x: -20, y: 64, z: -809 }],
    // Group 6
    [{ x: -26, y: 68, z: -757 }, { x: -103, y: 64, z: -402 }, { x: 76, y: 69, z: -386 }],
    // Group 7
    [{ x: 172, y: 71, z: -253 }, { x: 31, y: 66, z: -316 }, { x: -17, y: 68, z: -350 }, { x: 68, y: 66, z: -278 }]
];

// ==========================================
// CAGE SPAWN LOGIC
// ==========================================

export function spawnCages() {
    UNLOADED_LOCATIONS = [];

    CAGE_GROUPS.forEach((group, index) => {
        const randomIndex = Math.floor(Math.random() * group.length);
        const location = group[randomIndex];

        try {
            DIMENSION.spawnEntity(CONFIG.CAGE_ID, location);
            DIMENSION.runCommand(`say @a "Cage ${index + 1} spawned at ${JSON.stringify(location)}"`);
        } catch (error) {
            UNLOADED_LOCATIONS.push({
                location: location, 
                cageNumber: index + 1 
            });
        }
    });

    if (UNLOADED_LOCATIONS.length > 0) {
        spawnInUnloadedChunks();
    }
}

function spawnInUnloadedChunks() {
    UNLOADED_LOCATIONS.forEach((data) => {
        attemptSpawnWithRetry(data, 0);
    });

    UNLOADED_LOCATIONS = [];
}

function attemptSpawnWithRetry(data, attempt) {
    if (attempt > 5) {
        const owner = getAllPlayers().find(p => p.hasTag("owner"));
        owner.sendMessage(`§4[SYSTEM FAILURE] §cCage ${data.cageNumber} could NOT be spawned after 5 attempts.`);
        owner.playSound("note.bass", { pitch: 0.5, volume: 1.0 });

        return;
    }

    const { location, cageNumber } = data;
    const areaName = getAreaName(cageNumber);
    const addTickingArea = getTickingArea(location, areaName);
    const removeTickingArea = getRemoveTickingArea(areaName);

    try {
        DIMENSION.runCommand(addTickingArea);

        system.runTimeout(() => {
            try {
                DIMENSION.spawnEntity(CONFIG.CAGE_ID, location);
                DIMENSION.runCommand(`say @a "Cage ${cageNumber} (Recovered) spawned at ${JSON.stringify(location)}"`);
                DIMENSION.runCommand(removeTickingArea);
            } catch (err) {
                DIMENSION.runCommand(removeTickingArea);
                system.runTimeout(() => attemptSpawnWithRetry(data, attempt + 1), 40);
            }
        }, 20);

    } catch (err) {
        DIMENSION.runCommand(removeTickingArea);
        system.runTimeout(() => attemptSpawnWithRetry(data, attempt + 1), 40);
    }
}

function getAreaName(cageNumber) {
    return `loader_cage_${cageNumber}`;
}
function getTickingArea(location, areaName) {
    return `tickingarea add circle ${location.x} ${location.y} ${location.z} 2 ${areaName}`;
}
function getRemoveTickingArea(areaName) {
    return `tickingarea remove ${areaName}`;
}

// ==========================================
// LISTENER
// ==========================================

world.afterEvents.entityHitEntity.subscribe(({ hitEntity, damagingEntity }) => {
    if (hitEntity.typeId !== CONFIG.CAGE_ID) return;
    if (hitEntity.getDynamicProperty(CONFIG.PROPERTY_NAME)) return;

    // Flag it immediately to prevent spam
    hitEntity.setDynamicProperty(CONFIG.PROPERTY_NAME, true);

    system.run(() => {
        if (!hitEntity.isValid()) return;

        hitEntity.triggerEvent(CONFIG.EVENT_NAME);

        const loc = hitEntity.location;

        DIMENSION.spawnParticle(CONFIG.PARTICLE, loc);
        DIMENSION.runCommand(CONFIG.UPDATE_SCORE);

        updateGlobalUi();

        // In case player leaves
        if (damagingEntity && damagingEntity.isValid()) {
            damagingEntity.runCommand(CONFIG.PLAYSOUND);
        }
    });
});