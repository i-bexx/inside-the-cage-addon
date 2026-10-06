import { system } from "@minecraft/server";

import { getSoulsFreedObjective, getValueParticipant, getObjectiveScore } from "../scoreboards";
import { PlayerCache } from "../Player/playerCache";
import { cameraDeactivated } from "../cameraUsage";
import { getPlayersInRound } from "../utils";

const CLOSE_CAM_TIMEOUT = new Map();

export function warnPlayerAboutCam() {
    const players = filterPlayers();

    for (const player of players) {
        player.setDynamicProperty("toldPlayerTurnOffCam", true);
        player.runCommand(`replaceitem entity @s slot.armor.chest 1 game:turnoffcamwarning 1 0 {"minecraft:item_lock": {"mode": "lock_in_inventory"}}`);

        closeCamTimeout(player);
    }
}

function closeCamTimeout(player) {
    const timeout = system.runTimeout(() => {
        if (!player || !player.isValid) return;
        
        const soulsFreedValue = getObjectiveScore(getSoulsFreedObjective(), getValueParticipant());
        if (soulsFreedValue != 4 && soulsFreedValue != 5) return;

        cameraDeactivated(player);
    }, 200);
    CLOSE_CAM_TIMEOUT.set(player.id, timeout);
}

function filterPlayers() {
    return getPlayersInRound().filter(player => {
        const cache = PlayerCache.get(player.id);
        const isCamUsing = cache ? cache.camUsing : false;
        const isWarned = player.getDynamicProperty("toldPlayerTurnOffCam");

        return isCamUsing && !isWarned;
    });
}

export function getCloseCamTimeout() { return CLOSE_CAM_TIMEOUT; }