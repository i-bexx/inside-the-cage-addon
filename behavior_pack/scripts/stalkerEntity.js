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

let dimension;

const STALKER_ENTITY_MATCHED = new Map();

let stalkerMatchIdObjective = undefined;
let intervalId = undefined;

// =============================================================================
// Main Functions
// =============================================================================

// --- Matching Stalker Logic ---

export function stalkerMatch() {
    const players = getAllPlayers()
                    .filter(player => !player.hasTag(CONFIG.MATCH_TAG));

    for (const player of players) {
        stalkerMatchLogic(player);
    }
}

function stalkerMatchLogic(player) {
    try {
            const entity = dimension.spawnEntity(CONFIG.ENTITY_TYPE, player.location);
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

            const matchedEntity = dimension.getEntities(stalkerFilter)[0];

            STALKER_ENTITY_MATCHED.set(player.id, matchedEntity);

            player.addTag(CONFIG.MATCH_TAG);

        } catch (error) {}
}

// --- Teleporting Stalker Logic ---

export function teleportStalker() {
    if (intervalId !== undefined) return;
    
    intervalId = system.runInterval(teleportStalkerLoop, 1);
}

function teleportStalkerLoop() {
        const players = getPlayersInRound();

        for (const player of players) {
            // Skip if player is not a participant in the scoreboard
            if (!stalkerMatchIdObjective.hasParticipant(player)) continue;

            const linkedEntity = STALKER_ENTITY_MATCHED.get(player.id);

            const viewDir = player.getViewDirection();
            const headLoc = player.getHeadLocation();

            const targetPos = {
                x: headLoc.x + (viewDir.x * CONFIG.STALKER_DISTANCE),
                y: headLoc.y + (viewDir.y * CONFIG.STALKER_DISTANCE),
                z: headLoc.z + (viewDir.z * CONFIG.STALKER_DISTANCE)
            };

            try {
                // Safe Teleport
                linkedEntity.tryTeleport(targetPos);
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

export function stopTeleportStalker() {
    if (intervalId == undefined) return;
    system.clearRun(intervalId);
    intervalId = undefined;
}

export function setGlobalVariables() {
    dimension = world.getDimension("overworld");
    stalkerMatchIdObjective = getStalkerMatchIdObjective();
}