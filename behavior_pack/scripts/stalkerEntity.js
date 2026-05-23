import { world, system } from "@minecraft/server";

import { getAllPlayers, getPlayersInRound } from "./getPlayersArray";
import { getStalkerMatchIdObjective } from "./scoreboards";

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    ENTITY_TYPE: "game:stalker_cursor",
    OBJECTIVE_ID: "stalker_match_id",
    MATCH_TAG: "stalker_matched",
    STALKER_DISTANCE: 10,
    INIT_RETRY_TICKS: 40
};

const DIMENSION = world.getDimension("overworld");

const STALKER_ENTITY_MATCHED = new Map();

let stalkerMatchIdObjective = null;
let intervalId = 0;
let isInitialized = false;

// =============================================================================
// Initialization Logic
// =============================================================================

function initialFunction() {
	if (isInitialized) return;

	try {
		stalkerMatchIdObjective = getStalkerMatchIdObjective();

    if (!stalkerMatchIdObjective) return;
		
		isInitialized = true;
	} catch (e) {}
}

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

// --- Matching Stalker Logic ---

export function stalkerMatch() {
    if (!isInitialized) return;

    const players = getAllPlayers()
                    .filter(player => !player.hasTag(CONFIG.MATCH_TAG));

    for (const player of players) {
        stalkerMatchLogic(player);
    }
}

function stalkerMatchLogic(player) {
    try {
            const entity = DIMENSION.spawnEntity(CONFIG.ENTITY_TYPE, player.location);
            const linkId = getLinkID(player);

            stalkerMatchIdObjective.setScore(player, linkId);
            stalkerMatchIdObjective.setScore(entity, linkId);

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

            const matchedEntity = DIMENSION.getEntities(stalkerFilter);

            STALKER_ENTITY_MATCHED.set(player.id, matchedEntity);

            player.addTag(CONFIG.MATCH_TAG);

        } catch (error) {}
}

// --- Teleporting Stalker Logic ---

export function teleportStalker() { intervalId = system.runInterval(teleportStalkerLoop, 1); }

function teleportStalkerLoop() {
        if (!isInitialized) return;

        const players = getPlayersInRound();

        for (const player of players) {
            // Skip if player is not a participant in the scoreboard
            if (!stalkerMatchIdObjective.hasParticipant(player)) continue;

            const linkedEntity = STALKER_ENTITY_MATCHED.get(player.id);

            if (!linkedEntity || linkedEntity.length === 0 || !linkedEntity[0].isValid()) {
                stalkerMatchLogic(player);
                continue;
            }

            const stalker = linkedEntity[0];

            if (linkedEntity.length > 1) {
                for (let i = 1; i < linkedEntity.length; i++) {
                    try { linkedEntity[i].remove(); } catch (e) {}
                }
                STALKER_ENTITY_MATCHED.set(player.id, [stalker]);
            }

            const viewDir = player.getViewDirection();
            const headLoc = player.getHeadLocation();

            const targetPos = {
                x: headLoc.x + (viewDir.x * CONFIG.STALKER_DISTANCE),
                y: headLoc.y + (viewDir.y * CONFIG.STALKER_DISTANCE),
                z: headLoc.z + (viewDir.z * CONFIG.STALKER_DISTANCE)
            };

            try {
                // Safe Teleport
                stalker.tryTeleport(targetPos);
            } catch (e) {}
        }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getLinkID(player) {
    let hash = 0;

    for (let i = 0; i < player.id.length; i++) {
        const char = player.id.charCodeAt(i); // Convert character to ASCII code

        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Reconvert to 32bit integer
    }
    return Math.abs(hash) % 1000000;
}

export function getStalkerEntityMatchedMap() { return STALKER_ENTITY_MATCHED; }
export function getTeleportStalkerId() { return intervalId; }