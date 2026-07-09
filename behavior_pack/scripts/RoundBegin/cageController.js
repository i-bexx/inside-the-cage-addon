import { world, system } from "@minecraft/server";

import { InitializeCageDetector } from "./cageDetector";
import { updateGlobalUi } from "../UI/globalUi";
import { loadTickingArea, removeTickingArea, sleep } from "../utils";

// ==========================================
// CONFIGURATION & VARIABLES
// ==========================================

let dimension;
let tickingAreaLocations = [];
let isCageSpawnerActive = false;

const CONFIG = {
    CAGE_ID: "game:cage",
    PROPERTY_NAME: "cageBroken",
    EVENT_NAME: "broke_event",
    PARTICLE: "game:soulFree_particle",
    UPDATE_SCORE: "scoreboard players add value souls_freed 1",
    PLAYSOUND: "playsound break_cage @s"
};

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

export async function spawnCages() {
    isCageSpawnerActive = true;

    for (let i = 0; i < CAGE_GROUPS.length; i++) {
        if (!isCageSpawnerActive) break;

        const group = CAGE_GROUPS[i];
        const randomIndex = Math.floor(Math.random() * group.length);
        const locationObject = group[randomIndex];
        const areaName = `loader_cage_group_${i + 1}`;

        removeTickingArea(areaName);
        await loadTickingArea(dimension, locationObject, areaName);

        try {
            dimension.spawnEntity(CONFIG.CAGE_ID, locationObject);
            tickingAreaLocations.push({ locationObject, areaName });
            world.setDynamicProperty("active_cage_locations", JSON.stringify(tickingAreaLocations));
            dimension.runCommand(`say @a "Cage ${i + 1} spawned at ${JSON.stringify(locationObject)}"`);
        } catch (error) {}

        removeTickingArea(areaName);

        if (tickingAreaLocations.length == 7) InitializeCageDetector();
    }
}

export async function despawnCages() {
    isCageSpawnerActive = false;

    const rawData = world.getDynamicProperty("active_cage_locations");
    const cageLocations = JSON.parse(rawData || "[]");

    for (const value of cageLocations) {
        removeTickingArea(value.areaName);
        await loadTickingArea(dimension, value.locationObject, value.areaName);

        try {
            const cages = dimension.getEntities({ type: "game:cage", location: value.locationObject, maxDistance: 10 });
            for (const cage of cages) {
                try { cage.remove(); } catch(err) {}
            }
        } catch (e) {}

        removeTickingArea(value.areaName);
    }
    tickingAreaLocations = [];
    world.setDynamicProperty("active_cage_locations", JSON.stringify(tickingAreaLocations));
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
        if (!hitEntity.isValid) return;

        hitEntity.triggerEvent(CONFIG.EVENT_NAME);

        const loc = hitEntity.location;

        dimension.spawnParticle(CONFIG.PARTICLE, loc);
        dimension.runCommand(CONFIG.UPDATE_SCORE);

        updateGlobalUi();

        // In case player leaves
        if (damagingEntity && damagingEntity.isValid) {
            damagingEntity.runCommand(CONFIG.PLAYSOUND);
        }
    });
});

export function setGlobalVariables() { dimension = world.getDimension("overworld"); }