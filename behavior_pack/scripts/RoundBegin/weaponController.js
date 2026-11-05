import { PlayerCache } from "../Player/playerCache";
import { getAmmoObjective, getObjectiveScore } from "../scoreboards";

const CONFIG = {
    DIMENSION: "overworld",
    TAGS: {
        IN_GAME: "in_game",
    },
    ITEMS: {
        GUN: "ibexx_itc:gun",
    },
    THRESHOLDS: {
        AMMO_LOW: 3,
    }
};

export function weaponController(player, playerState) {
    const equippable = player.getComponent("minecraft:equippable");
    const item = equippable.getEquipment("Mainhand");
    const newMainHand = item ? item.typeId : null;
    
    if (playerState.mainHandTypeId !== newMainHand) {
        playerState.mainHandTypeId = newMainHand;
        const cache = PlayerCache.get(player.id);
        if (cache) cache.mainHandTypeId = newMainHand;
    }

    if (playerState.mainHandTypeId !== CONFIG.ITEMS.GUN) return;

    const ammo = getObjectiveScore(getAmmoObjective(), player.scoreboardIdentity);
    
    if (ammo > 0) {
        const color = ammo > CONFIG.THRESHOLDS.AMMO_LOW ? "§h" : "§c"; 
        player.runCommand(`title @s actionbar §lAmmo: > ${color}${ammo} §f<`);    
    }
}

export function gunShooting(player) {
    if (player.getItemCooldown("gun") < 11 && getObjectiveScore(getAmmoObjective(), player.scoreboardIdentity) > 0) return;
    
    player.setProperty("ibexx_itc:is_shooting", true);
}