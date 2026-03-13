import { world, system } from "@minecraft/server";

import { getAllPlayers, getPlayersInRound } from "./getPlayersArray";
import { getStalkerMatchIdObjective } from "./Scoreboards";

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    ENTITY_TYPE: "game:stalker_cursor",
    OBJECTIVE_ID: "stalker_match_id",
    MATCH_TAG: "aa_matched",
    STALKER_DISTANCE: 10,
    INIT_RETRY_TICKS: 40
};

const DIMENSION = world.getDimension("overworld");

// State Variables
let aaValueObjective = null;
let intervalId = 0;
let isInitialized = false; // Flag to track if the system is ready

// =============================================================================
// Initialization Logic
// =============================================================================

function initialFunction() {
	if (isInitialized) return;

	try {
		aaValueObjective = getStalkerMatchIdObjective();

    if (!aaValueObjective) return;
		
		isInitialized = true;
	} catch (e) {}
}

// Run initialization immediately
system.run(initialFunction);

// If scoreboard objective is not loaded, this loop will define them
let scoreSecurityInterval = system.runInterval(() => {
    if (!isInitialized) {
        initialFunction();
    } else system.clearRun(scoreSecurityInterval);
}, CONFIG.INIT_RETRY_TICKS);

// =============================================================================
// Main Functions
// =============================================================================

export function stalkerMatch() {
    // Explicit Check: Do not run if system is not initialized
    if (!isInitialized) return;

    const players = getAllPlayers()
                    .filter(player => !player.hasTag(CONFIG.MATCH_TAG));

    for (const player of players) {
        try {
            const entity = DIMENSION.spawnEntity(CONFIG.ENTITY_TYPE, player.location);
            const linkId = getLinkID(player);

            aaValueObjective.setScore(player, linkId);
            aaValueObjective.setScore(entity, linkId);

            player.addTag(CONFIG.MATCH_TAG);

        } catch (error) {
            console.warn(`Error in stalkerMatch for ${player.name}: ${error}`);
        }
    }
}

export function teleportStalker() {
    // Clear previous interval if it exists to prevent duplicates
    if (intervalId !== 0) system.clearRun(intervalId);

    intervalId = system.runInterval(() => {
        // Explicit Check: Don't run logic if system isn't ready
        if (!isInitialized) return;

        const players = getPlayersInRound();

        for (const player of players) {
            // Skip if player is not a participant in the scoreboard
            if (!aaValueObjective.hasParticipant(player)) continue;

            const linkId = getLinkID(player);

            const stalkerFilter = {
                type: CONFIG.ENTITY_TYPE,
                scoreOptions: [
                    {
                        objective: CONFIG.OBJECTIVE_ID,
                        minScore: linkId,
                        maxScore: linkId
                    }
                ]
            };

            const linkedEntities = DIMENSION.getEntities(stalkerFilter);

            if (linkedEntities.length === 0) continue;

            const stalker = linkedEntities[0];
            const viewDir = player.getViewDirection();

            const targetPos = {
                x: player.location.x + (viewDir.x * CONFIG.STALKER_DISTANCE),
                y: player.location.y + (viewDir.y * CONFIG.STALKER_DISTANCE),
                z: player.location.z + (viewDir.z * CONFIG.STALKER_DISTANCE)
            };

            // Safe Teleport
            stalker.tryTeleport(targetPos);
        }
    }, 1);
}

// Helper to generate a consistent ID from UUID
function getLinkID(player) {
    const rawId = parseInt(player.id.replace(/-/g, "").slice(0, 8), 16);
    return rawId % 999999;
}

export function getTeleportStalkerId() {
    return intervalId;
}