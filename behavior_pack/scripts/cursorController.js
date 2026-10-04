import { PlayerCache } from "./Player/playerCache";

// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG = {
    DISTANCE: 30,
    EVENTS: {
        RED: "cursor_red_event",
        BLUE: "cursor_blue_event",
        GREEN: "cursor_green_event",

        NORMAL: "cursor_normal_event"
    },
    SCOREBOARD: {
        GHOST: "is_looking_at_ghost"
    }
};

// ==========================================
// FILTERS & VARIABLES
// ==========================================

// Entity Filters
const MONSTER_FILTER = {
    families: [ "monster" ],
    maxDistance: CONFIG.DISTANCE
};

const MOB_FILTER = {
    families: [ "mob" ],
    excludeFamilies: [ "monster" ],
    maxDistance: CONFIG.DISTANCE
};

const PLAYER_FILTER = {
    families: [ "player" ],
    maxDistance: CONFIG.DISTANCE
};

const ENTITY_DISTANCE = {
	maxDistance: CONFIG.DISTANCE
};

const ENTITY_RULES = [
    { 
        filter: MONSTER_FILTER, 
        event: CONFIG.EVENTS.RED, 
        score: 1,
        sid: 3
    },
    { 
        filter: PLAYER_FILTER,  
        event: CONFIG.EVENTS.GREEN, 
        score: 0,
        sid: 1
    },
    { 
        filter: MOB_FILTER,     
        event: CONFIG.EVENTS.BLUE,  
        score: 0,
        sid: 2
    }
];

export function startCrosshairTracker(player) {
    const cache = PlayerCache.get(player.id);
    if (!cache) return;

    const result = player.getEntitiesFromViewDirection(ENTITY_DISTANCE)[0];
    const currentEntityId = result ? result.entity.id : "none";

    if (cache.lastLookedEntityId === currentEntityId) return;
    cache.lastLookedEntityId = currentEntityId;

    const setScore = (val) => player.runCommand(`scoreboard players set @s ${CONFIG.SCOREBOARD.GHOST} ${val}`);

    if (!result) {
        player.triggerEvent(CONFIG.EVENTS.NORMAL);
        setScore(0);
        cache.skinIdVal = 0;
        return;
    }

    const entity = result.entity;
    const match = ENTITY_RULES.find(rule => entity.matches(rule.filter));

    if (match) {
        player.triggerEvent(match.event);
        setScore(match.score);
        cache.skinIdVal = match.sid;
    } else {
        player.triggerEvent(CONFIG.EVENTS.NORMAL);
        setScore(0);
        cache.skinIdVal = 0;
    }
}