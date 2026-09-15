import { world, system } from "@minecraft/server";

// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG = {
    DAMAGE: 18,
    DISTANCE: 15,
    EVENTS: {
        RED: "cursor_red_event",
        BLUE: "cursor_blue_event",
        GREEN: "cursor_green_event",

        NORMAL: "cursor_normal_event",
        SHOOTING_ENTITY: "shooting_the_entity_event"
    },
    SCOREBOARD: {
        HOSTILE: "is_looking_at_hostile"
    }
};

// ==========================================
// FILTERS & VARIABLES
// ==========================================

let crosshairTrackerIntervalId = undefined;
let shootingIntervalId = undefined;

const CURSOR_STATES = new Map();
const SHOOTING_STATES = new Map();

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

// Initial State Objects
const INITIAL_LOOKING_STATE = {
    lookingAtEntity: 0
};

const ENTITY_DISTANCE = {
	maxDistance: CONFIG.DISTANCE
};

const ENTITY_RULES = [
    { 
        filter: MONSTER_FILTER, 
        event: CONFIG.EVENTS.RED, 
        score: 1 
    },
    { 
        filter: PLAYER_FILTER,  
        event: CONFIG.EVENTS.GREEN, 
        score: 0 
    },
    { 
        filter: MOB_FILTER,     
        event: CONFIG.EVENTS.BLUE,  
        score: 0 
    }
];

// ==========================================
// SYSTEM A: LOOKING
// ==========================================

function crosshairTracker(player) {
    let state = CURSOR_STATES.get(player.id);
    if (state) return state;

    const setScore = (val) => player.runCommand(`scoreboard players set @s ${CONFIG.SCOREBOARD.HOSTILE} ${val}`);

    state = new Proxy({ ...INITIAL_LOOKING_STATE }, {
        set(target, key, value) {
            if (target[key] === value) return true;

            target[key] = value;

            if (value === 0) {
                player.triggerEvent(CONFIG.EVENTS.NORMAL);
                setScore(0);
                return true;
            }

            const result = player.getEntitiesFromViewDirection(ENTITY_DISTANCE)[0];
            if (!result) return true;

            const entity = result.entity;

            const match = ENTITY_RULES.find(rule => entity.matches(rule.filter));

            if (match) {
                player.triggerEvent(match.event);
                setScore(match.score);
            } else {
                player.triggerEvent(CONFIG.EVENTS.NORMAL);
                setScore(0);
            }

            return true;
        }
    });

    CURSOR_STATES.set(player.id, state);
    return state;
}

// Global Loop for Cursor Tracker
export function startCrosshairTracker() {
	if (crosshairTrackerIntervalId !== undefined) return;

	crosshairTrackerIntervalId = system.runInterval(() => {
        for (const player of world.getAllPlayers()) {
            const isLooking = crosshairTracker(player);
            const raycastResult = player.getEntitiesFromViewDirection(ENTITY_DISTANCE)
            
            isLooking.lookingAtEntity = (raycastResult.length > 0) ? 1 : 0;
        }
}, 4);
}

export function stopCrosshairTracker() {
    if (crosshairTrackerIntervalId == undefined) return;

    system.clearRun(crosshairTrackerIntervalId);
    crosshairTrackerIntervalId = undefined;
}

export function stopPlayerShootTracker() {
    if (shootingIntervalId == undefined) return;

    system.clearRun(shootingIntervalId);
    shootingIntervalId = undefined;
}

export function getCursorStates() { return CURSOR_STATES; }
export function getShootingStates() { return SHOOTING_STATES; }