import { world, system } from "@minecraft/server";
import { getIsShootingObjective, getAmmoObjective, getObjectiveScore } from "./Scoreboards";

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

let isInitialized = false;
let isShootingObjective = null;
let ammoObjective = null;
let shootingIntervalId = 0;

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

const INITIAL_SHOOTING_STATE = {
    isShootingValue: 0,
		isLooking: 0,
		ammoValue: 0
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


function initialFunction() {
	if (isInitialized) return;
	
	try {
		isShootingObjective = getIsShootingObjective();
		ammoObjective = getAmmoObjective();
    
    // Safety check
    if (!isShootingObjective || !ammoObjective) return;
    
		isInitialized = true;

		Cursor();
	} catch(e) {}
}

// Run immediately to check for the scoreboard
system.run(initialFunction);

// If scoreboard objective or participant is not loaded, this loop will define them
let scoreSecurityInterval = system.runInterval(() => {
		if (!isInitialized) {
				initialFunction();
				return;
		} else system.clearRun(scoreSecurityInterval);
}, 40);

// ==========================================
// SYSTEM A: CURSOR
// ==========================================

function getLookingState(player) {
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

// Global Loop for Cursor
function Cursor() {
	system.runInterval(() => {
    for (const player of world.getPlayers()) {
        const isLooking = getLookingState(player);

				const raycastResult = player.getEntitiesFromViewDirection(ENTITY_DISTANCE)
        
        isLooking.lookingAtEntity = (raycastResult.length > 0) ? 1 : 0;
    }
}, 4);
}

// ==========================================
// SYSTEM B: SHOOTING
// ==========================================

function isShootingState(player) {
    let state = SHOOTING_STATES.get(player.id);
    if (state) return state;

    const damageOptions = {
        cause: "entityAttack"
    };

    state = new Proxy({ ...INITIAL_SHOOTING_STATE }, {
        set(target, key, value) {
            if (target[key] === value) return true;

            target[key] = value;

						const isLooking = target.isLooking === 1;
            const isShooting = target.isShootingValue === 1;
						const ammoValue = target.ammoValue > 0;

						if (!isLooking || !isShooting || !ammoValue)
              return true;
						

						const result = player.getEntitiesFromViewDirection(MONSTER_FILTER)[0];

						if (!result) return true;
						

						const entity = result.entity;

						if (entity.isValid()) {
							player.triggerEvent(CONFIG.EVENTS.SHOOTING_ENTITY);
            	entity.applyDamage(CONFIG.DAMAGE, damageOptions);
						}

            return true;
        }
    });

    SHOOTING_STATES.set(player.id, state);
    return state;
}

// Function to start the shooting loop
export function playerCanShoot() {
    if (shootingIntervalId !== 0) return;

    shootingIntervalId = system.runInterval(() => {
        if (!isShootingObjective) return;

        const players = world.getPlayers();

        for (const player of players) {
            let isPlayerShooting = isShootingState(player);

            // Raycast only for monsters
            const raycastResult = player.getEntitiesFromViewDirection(MONSTER_FILTER);
						
						isPlayerShooting.isLooking = (raycastResult.length > 0) ? 1 : 0;

            // Safe scoreboard reading
            try {
								isPlayerShooting.ammoValue = getObjectiveScore(ammoObjective, player.scoreboardIdentity);
                isPlayerShooting.isShootingValue = getObjectiveScore(isShootingObjective, player.scoreboardIdentity);
            } catch (e) {
                isPlayerShooting.isShootingValue = 0;
								isPlayerShooting.ammoValue = 0;
            }
        }
    }, 4); 
}

export function stopShooting() {
    if (shootingIntervalId !== 0) {
        system.clearRun(shootingIntervalId);
        shootingIntervalId = 0;
    }
}

export function getPlayerCanShootId() { return shootingIntervalId; }

export function getCursorStates() { return CURSOR_STATES; }
export function getShootingStates() { return SHOOTING_STATES; }