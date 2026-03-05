import { system } from "@minecraft/server";

import { getPlayersInRound } from "../getPlayersArray";

// =============================================================
// CONFIGURATION
// =============================================================

const CONFIG = {
    COMMANDS: {
        TURN_OFF_WARNING: "replaceitem entity @s slot.armor.chest 1 game:turnoffcamwarning"
    },
    PROPERTIES: {
        CAM_USING: "camUsing",
        TURN_OFF_WARNING: "toldPlayerTurnOffCam"
    }
};

let intervalId = 0;

// =============================================================
// MAIN AND HELPER FUNCTIONS
// =============================================================

export function warnPlayerAboutCam() {
    intervalId = system.runInterval(() => {
        const players = filterPlayers();

        for (const player of players) {
						player.setDynamicProperty(CONFIG.PROPERTIES.TURN_OFF_WARNING, true);
						player.runCommand(CONFIG.COMMANDS.TURN_OFF_WARNING);
        }
    })
}

function filterPlayers() {
    return getPlayersInRound().filter(player => {
        const isCamUsing = player.getDynamicProperty(CONFIG.PROPERTIES.CAM_USING);
        const isWarned = player.getDynamicProperty(CONFIG.PROPERTIES.TURN_OFF_WARNING);

        return isCamUsing && !isWarned;
    });
}

export function resetCameraWarningIntervalId() {
		intervalId = 0;
}

export function getWarnPlayerAboutCamId() {
    return intervalId;
}