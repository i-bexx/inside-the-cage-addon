import { getPlayersInRound } from "../utils";
import { PlayerCache } from "../Player/playerCache";

// =============================================================
// CONFIGURATION
// =============================================================

const CONFIG = {
    COMMANDS: {
        TURN_OFF_WARNING: `replaceitem entity @s slot.armor.chest 1 game:turnoffcamwarning 1 0 {"minecraft:item_lock": {"mode": "lock_in_inventory"}}`
    },
    PROPERTIES: {
        CAM_USING: "camUsing",
        TURN_OFF_WARNING: "toldPlayerTurnOffCam"
    }
};

// =============================================================
// MAIN AND HELPER FUNCTIONS
// =============================================================

export function warnPlayerAboutCam() {
    // ---- LOOP ----
    const players = filterPlayers();

    for (const player of players) {
        player.setDynamicProperty(CONFIG.PROPERTIES.TURN_OFF_WARNING, true);
        player.runCommand(CONFIG.COMMANDS.TURN_OFF_WARNING);
    }
    // ---- LOOP ----
}

function filterPlayers() {
    return getPlayersInRound().filter(player => {
        const cache = PlayerCache.get(player.id);
        const isCamUsing = cache ? cache.camUsing : false;
        const isWarned = player.getDynamicProperty(CONFIG.PROPERTIES.TURN_OFF_WARNING);

        return isCamUsing && !isWarned;
    });
}