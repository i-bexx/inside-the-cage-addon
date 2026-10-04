import { world } from "@minecraft/server";
import { getStalkerMatchIdObjective } from "./scoreboards";
import { PlayerCache } from "./Player/playerCache";

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    ENTITY_TYPE: "game:stalker_cursor",
    OBJECTIVE_ID: "stalker_match_id",
    MATCH_TAG: "stalker_matched",
    STALKER_DISTANCE: 10
};

let dimension;
let stalkerMatchIdObjective = undefined;

// =============================================================================
// Main Functions
// =============================================================================

// --- Matching Stalker Logic ---

export function stalkerMatch() {
    const players = world.getAllPlayers()
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

            const cache = PlayerCache.get(player.id);
            if (cache) cache.stalkerEntity = matchedEntity;

            player.addTag(CONFIG.MATCH_TAG);

        } catch (error) {}
}

// --- Teleporting Stalker Logic ---

export function teleportStalkerLoop(player, playerState) {
        if (!player.hasTag(CONFIG.MATCH_TAG)) return;

        const cache = PlayerCache.get(player.id);
        const linkedEntity = cache ? cache.stalkerEntity : null;
        if (!linkedEntity) return;

        const viewDir = playerState.viewDirection;
        const headLoc = playerState.headLocation;

        const targetPos = {
            x: headLoc.x + (viewDir.x * CONFIG.STALKER_DISTANCE),
            y: headLoc.y + (viewDir.y * CONFIG.STALKER_DISTANCE),
            z: headLoc.z + (viewDir.z * CONFIG.STALKER_DISTANCE)
        };

        try {
            linkedEntity.teleport(targetPos);
        } catch (e) {}
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

export function setGlobalVariables() {
    dimension = world.getDimension("overworld");
    stalkerMatchIdObjective = getStalkerMatchIdObjective();
}