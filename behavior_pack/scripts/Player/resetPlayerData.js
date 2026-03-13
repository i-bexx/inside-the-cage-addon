import { world, system } from "@minecraft/server";

import { resetPlayerDynamicPropertyData, commandsToResetPlayerData, clearPlayerMaps, stopFunctionsInMaps } from "../resetStats";

// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG = {
		COMMANDS: {
			TELEPORT: "tp @s -186 53 -82 0",
			CLEAR_INVENTORY: "clear @s",
			STOPSOUND: "stopsound @s",
			STOP_SHAKING: "camerashake stop @s"
		},
		COMMANDS_2: {
			PLAYSOUND_GAME_OVER: "playsound game_over @s"
		},
		EVENTS: {
			STATIC: "static_true_event1",
			GAME_OVER: "game_over_event"
		},
		TAGS_TO_REMOVE: {
				IN_GAME: "in_game",
				HAS_NOTIFICATION: "hasNotification"
		},
		TAG_ELIMINATED: "eliminated",
}

// ==========================================
// LOGIC
// ==========================================

export async function game_over(player) {
    if (player == undefined) return;
		player.addTag(CONFIG.TAG_ELIMINATED);

    for (const tag of Object.values(CONFIG.TAGS_TO_REMOVE)) {
        player.removeTag(tag);
    }

    resetPlayerDynamicPropertyData(player);
    clearPlayerMaps(player.id);
    stopFunctionsInMaps(player.id);

    for (const cmd of Object.values(CONFIG.COMMANDS)) {
        await player.runCommand(cmd);
    }
    const soundLoop = staticSoundLoop(player);

    player.triggerEvent(CONFIG.EVENTS.STATIC);
		await sleep(1);
		player.runCommand(CONFIG.COMMANDS_2.PLAYSOUND_GAME_OVER);
    await sleep(40);

    player.triggerEvent(CONFIG.EVENTS.GAME_OVER);
    await sleep(400);

    await system.clearRun(soundLoop);
    await player.removeTag(CONFIG.TAG_ELIMINATED);

    commandsToResetPlayerData(player);
}

function staticSoundLoop(player) {
    const soundLoop = system.runInterval(() => {
        player.runCommand(CONFIG.COMMANDS_2.PLAYSOUND_GAME_OVER);
    }, 100);
    return soundLoop;
}

function sleep(ticks) {
  return new Promise((resolve) => system.runTimeout(resolve, ticks));
}