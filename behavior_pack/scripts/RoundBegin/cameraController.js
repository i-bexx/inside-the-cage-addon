import { system } from "@minecraft/server";
import { ItemStack, ItemLockMode, EntityComponentTypes, EquipmentSlot } from "@minecraft/server";

import { getSoulsFreedObjective, getValueParticipant, getObjectiveScore } from "../scoreboards";
import { PlayerCache } from "../Player/playerCache";
import { cameraDeactivated } from "../cameraUsage";
import { getPlayersInRound } from "../utils";

export const CLOSE_CAM_TIMEOUT = new Map();

export function warnPlayerAboutCam() {
    const players = filterPlayers();
    const warningItem = new ItemStack("ibexx_itc:turnoffcamwarning", 1);
    warningItem.lockMode = ItemLockMode.slot;

    for (const player of players) {
        player.setDynamicProperty("toldPlayerTurnOffCam", true);
        player.getComponent(EntityComponentTypes.Equippable).setEquipment(EquipmentSlot.Chest, warningItem);

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
