import { world, system } from "@minecraft/server";
import { MessageFormData } from "@minecraft/server-ui";

import { stalkerMatch } from "./Stalker";
import { getAllPlayers } from "./getPlayersArray";

// ==========================================
// CONSTANTS
// ==========================================

const STARTER_RANGE_STATES = new Map();
const DIMENSION = world.getDimension("overworld");

const TELEPORT_BACK_COMMANDS = {
	toOut: "tp @a[tag=waiting_for_start] -183 68 -97",
	removeStarterTag: "tag @a remove starter",
	removeWaitingForStartTag: "tag @a remove waiting_for_start",
	eventDoor: `event entity @e[type=game:door] "0"`
};
const REJECT_PLAYER_COMMANDS = {
	tpOut: "tp @s -183 68 -97",
	removeInTag: "tag @s remove waiting_for_start",
	removeStarterTag: "tag @s remove starter",
	removeWaitingForStartTag: "tag @s remove waiting_for_start",
	sayRoomFull: "say The room is full!",
	playSound: "playsound note.bell @s"
};

const initialPlayerLoc = {
    isPlayerInRange: false
};


let intervalId = 0;
let playersWaitingToStart = [];

// ==========================================
// FUNCTIONS
// ==========================================

function locationState(player) {
	let state = STARTER_RANGE_STATES.get(player.id)
	if (state) return state;

state = new Proxy({ ...initialPlayerLoc }, {
    set(target, key, value) {
        if (target[key] == value) return true;

        target[key] = value;

        if (target.isPlayerInRange) {
            playerInRange(player);
        } else {
					playersWaitingToStart.splice(playersWaitingToStart.indexOf(player), 1);
				}
        return true;
    }
})
STARTER_RANGE_STATES.set(player.id, state);
return state;
}

// Checks for players in range to start the game
export function gameStarter() {
intervalId = system.runInterval(() => {
	const players = world.getPlayers()
										.filter(p => !p.hasTag("starting"));
		
	for (const player of players) {
		player.isInRange = {
				isInRangeX: false,
				isInRangeY: false,
				isInRangeZ: false
			};

			let checker = locationState(player);

			let checkX = Math.floor(player.location.x);
			let checkY = Math.floor(player.location.y);
			let checkZ = Math.floor(player.location.z);

			player.isInRange.isInRangeX = checkX <= -175 && checkX >= -179;
			player.isInRange.isInRangeY = checkY <= 71 && checkY >= 68;
			player.isInRange.isInRangeZ = checkZ <= -83 && checkZ >= -93;

	checker.isPlayerInRange = player.isInRange.isInRangeX && player.isInRange.isInRangeY && player.isInRange.isInRangeZ;
  }
},30)
}

async function playerInRange(player) {
	const doesStarterExist = world.getDynamicProperty("starter");

  await player.addTag("waiting_for_start");
  playersWaitingToStart = world.getPlayers({ tags: ["waiting_for_start"] });
  
	// Check if the player capacity is reached
  if (playersWaitingToStart.length > 3) {
    const kickedPlayers = playersWaitingToStart.slice(3);
		
    for (const player of kickedPlayers) {
      kickOut(player);
    }
		playersWaitingToStart.splice(3);
		
		updateDoorEvent();
		return;
}

	if (!doesStarterExist) {
			player.addTag("starter");
			world.setDynamicProperty("starter", true);

			MessageForm(player);
	}
	updateDoorEvent();
	return;
}

function kickOut(check) {
	for (const command of Object.values(REJECT_PLAYER_COMMANDS)) {
			check.runCommand(command);
	}
	playersWaitingToStart = world.getPlayers({ tags: ["waiting_for_start"] });
}

function MessageForm(player) {
	new MessageFormData()
	.title("")
	.body("Do you want to start the game?")
	.button1("Cancel")
	.button2("Start")
	.show(player).then(({ selection }) => {

	if (selection == 1) {
		startFunction();
		return;
	}

	// If cancelled, lines below will run
	for (const command of Object.values(TELEPORT_BACK_COMMANDS)) {
		DIMENSION.runCommand(command);
	}
	world.setDynamicProperty("starter", false);
	return;
	})
}

export function startFunction() {
	const isTheRoundRestarted = world.getDynamicProperty("gameRestart");
	const players = getAllPlayers().filter(p => p.hasTag("waiting_for_start"));
	
	for (const player of players) {
		player.addTag("starting");
		player.removeTag("in_lobby");

		player.setDynamicProperty("batteryLevel", 4);
		player.setDynamicProperty("batteryIsDraining", false);

		// If round restarted, curtain animation won't be played here
		if (!isTheRoundRestarted) player.triggerEvent("curtain_close_event");
	}

		world.getDimension("overworld").runCommand("setblock -54 75 -152 redstone_block");
		world.getDimension("overworld").runCommand("event entity @e[type=game:door] game_started");
		world.getDimension("overworld").runCommand("fill -180 68 -92 -180 71 -84 barrier");
		
		stalkerMatch();

		playersWaitingToStart = [];
}

function updateDoorEvent() {
	try {
		const door = DIMENSION.getEntities({ type: "game:door" })[0];
		const event = playersWaitingToStart.length.toString();

		door.triggerEvent(event);
	} catch(e) { }
}

export function getGameStarterId() {
    return intervalId;
}
export function checkIfPositionClear() {
    return STARTER_RANGE_STATES;
}
