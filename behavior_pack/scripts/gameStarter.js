import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

import { stalkerMatch } from "./stalkerEntity";
import { sleep } from "./utils";

// ==========================================
// CONSTANTS
// ==========================================

const STARTER_RANGE_STATES = new Map();
let dimension;

const TELEPORT_BACK_COMMANDS = {
	tpOut: "tp @a[tag=waiting_for_start] -183 68 -97",
	removeStarterTag: "tag @a remove starter",
	removeWaitingForStartTag: "tag @a remove waiting_for_start",
	eventDoor: `event entity @e[type=game:door] "door_0_event"`
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


let intervalId = undefined;
let playersWaitingToStart = [];
let sessionPlayers = [];

// ==========================================
// FUNCTIONS
// ==========================================

// -- State loop --

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
					const idx = playersWaitingToStart.findIndex(p => p.id === player.id);
					if (idx !== -1) playersWaitingToStart.splice(idx, 1); // If player were not kicked out due to capacity, then this line will run
					player.removeTag("waiting_for_start");

					if (player.hasTag("starter")) {
						player.removeTag("starter");
						world.setDynamicProperty("starter", false);
				}

					updateDoorEvent();
				}
        return true;
    }
})
STARTER_RANGE_STATES.set(player.id, state);
return state;
}


// -- Range Checker --

export function gameStarter() {
	if (intervalId !== undefined) return;
	
	intervalId = system.runInterval(() => {
		const players = world.getAllPlayers()
											.filter(p => !p.hasTag("waiting_for_start"));
			
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

// -- In Range Logic --

async function playerInRange(player) {
	const isResetingRound = world.getDynamicProperty("reseting_round");
	if (isResetingRound) {
		player.onScreenDisplay.setActionBar("§c§lSystem Resetting... Please Wait");
		return;
	}

	const doesStarterExist = world.getDynamicProperty("starter");

  player.addTag("waiting_for_start");
  playersWaitingToStart.push(player);
  
  if (playersWaitingToStart.length > 3) {
    const kickedPlayers = playersWaitingToStart.slice(3);
		
    for (const player of kickedPlayers)
			kickOut(player);
		playersWaitingToStart.splice(3);
		
		return;
}

	if (!doesStarterExist) {
			player.addTag("starter");
			world.setDynamicProperty("starter", true);

			ActionForm(player);
	}
	updateDoorEvent();
	return;
}


function kickOut(player) {
	for (const command of Object.values(REJECT_PLAYER_COMMANDS)) player.runCommand(command);
	playersWaitingToStart = playersWaitingToStart.filter(p => p.id !== player.id);
}

// -- Game Starter Panel --

function ActionForm(player) {
	new ActionFormData()
		.title("")
		.body("Do you want to start the game?")
		.button("Start")
		.button("Cancel")
		.show(player).then(({ selection }) => {

		playersWaitingToStart = [];

		if (selection == 0) {
			startFunction();
			return;
		}

		// If cancelled, lines below will run
		for (const command of Object.values(TELEPORT_BACK_COMMANDS)) {
			dimension.runCommand(command);
		}
		world.setDynamicProperty("starter", false);
		return;
		})
}

// -- Game Start Logic --

export function startFunction() {
	const isTheRoundRestarted = world.getDynamicProperty("gameRestart");
	const lobbyPlayers = world.getPlayers({ tags: ["waiting_for_start"] });

	if (!isTheRoundRestarted) sessionPlayers = lobbyPlayers;

	system.clearRun(intervalId); // Stops the main loop of this file
	intervalId = undefined;
	
	const playersToStart = getSessionPlayers();
	
	for (const player of playersToStart) {
		player.addTag("waiting_for_start");
		player.removeTag("in_lobby");

		player.setDynamicProperty("batteryLevel", 4);
		player.setDynamicProperty("batteryIsDraining", false);

		// If round restarted, curtain animation won't be played here
		if (!isTheRoundRestarted) player.triggerEvent("curtain_close_event");
	}

		startCommands();
		dimension.runCommand("event entity @e[type=game:door] door_game_started_event");
		dimension.runCommand("fill -180 68 -92 -180 71 -84 barrier");
		stalkerMatch();

		playersWaitingToStart = [];
}

async function startCommands() {
	await sleep(60);
	runCountdownActionbar("Loading...", false);
	dimension.runCommand("execute if entity @a[tag=!waiting_for_start] run title @a[tag=!waiting_for_start] actionbar §4Waiting room closed");
	await sleep(310);
	runCountdownActionbar("§h< 5 >");
	await sleep(20);
	runCountdownActionbar("§h< 4 >");
	await sleep(20);
	runCountdownActionbar("§a< 3 >");
	await sleep(20);
	runCountdownActionbar("§p< 2 >");
	await sleep(20);
	runCountdownActionbar("§4< 1 >");
	await sleep(5);
	dimension.runCommand("fog @a[tag=waiting_for_start] push game:in_round_default in_round_fog");
	dimension.runCommand("tp @a[tag=waiting_for_start] 120 65 -260");
	await sleep(15);
	dimension.runCommand("playsound tractor_door @a[tag=waiting_for_start]");
	dimension.runCommand("tag @a remove starter");
	await sleep(35);
	dimension.runCommand("tag @a[tag=waiting_for_start] add in_game");
	dimension.runCommand("tag @a remove waiting_for_start");
	dimension.runCommand("scoreboard players set @a[tag=in_game] Sanity 100");
	await sleep(170);
	dimension.runCommand("event entity @a[tag=in_game] curtain_open_event");
	await sleep(70);
	dimension.runCommand("give @a[tag=in_game] game:camera");
	dimension.runCommand("tag @a[tag=in_game] add show_in_round_personal_ui");
	dimension.runCommand("scoreboard players set value game_started 1");
}

// -- Helper Functions --

function runCountdownActionbar(actionbar, playSound = true) {
	const players = world.getPlayers({ tags: ["waiting_for_start"] });
	for (const player of players) {
		player.onScreenDisplay.setActionBar(actionbar);
		if (playSound) player.playSound("block.click");
	}
}

function updateDoorEvent() {
	try {
		const door = dimension.getEntities({ type: "game:door" })[0];
		const eventNumber = playersWaitingToStart.length;
		if (eventNumber > 3) return;
		const eventString = "door_" + eventNumber.toString() + "_event";

		door.triggerEvent(eventString);
	} catch(e) { }
}

export function getSessionPlayers() {
	sessionPlayers = sessionPlayers.filter(p => p?.isValid);
	return sessionPlayers;
}

export function checkIfPositionClear() { return STARTER_RANGE_STATES; }
export function resetSessionPlayers() { sessionPlayers = []; }
export function setGlobalVariables() { dimension = world.getDimension("overworld"); }


// ==========================================
// EVENT LISTENER
// ==========================================


world.afterEvents.playerLeave.subscribe(({ playerId }) => {
	if (intervalId === undefined) return; 

    const remainingStarters = world.getPlayers({ tags: ["starter"] });
    if (remainingStarters.length === 0) {
        world.setDynamicProperty("starter", false);
        
        for (const command of Object.values(TELEPORT_BACK_COMMANDS))
            dimension.runCommand(command);
				playersWaitingToStart = [];
    }
		const idx = playersWaitingToStart.findIndex(p => p.id === playerId);
		if (idx !== -1) playersWaitingToStart.splice(idx, 1);

    updateDoorEvent();
});