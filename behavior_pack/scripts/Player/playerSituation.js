import { world } from "@minecraft/server";
import { getAmmoObjective, getObjectiveScore } from "../scoreboards";
import { COMPONENT_CACHE } from "./playerCache";

const CONFIG = {
    DIMENSION: "overworld",
    TAGS: {
        IN_GAME: "in_game",
    },
    ITEMS: {
        KNIFE: "game:knife",
        GUN: "game:gun",
        DEAD_ENTITY: "game:ghost_dead",
    },
    THRESHOLDS: {
        AMMO_LOW: 3,
    }
};

let dimension;

export function handleCombatLogic(player, playerState) {
    if (playerState.mainHandTypeId !== CONFIG.ITEMS.GUN) return;

    const ammo = getObjectiveScore(getAmmoObjective(), playerState.sbId);
    
    if (ammo > 0) {
        const color = ammo > CONFIG.THRESHOLDS.AMMO_LOW ? "§h" : "§c"; 
        player.runCommand(`title @s actionbar §lAmmo: > ${color}${ammo} §f<`);    
    }
}

world.afterEvents.itemUse.subscribe(({itemStack, source}) => {
    if (itemStack.typeId != "game:gun" || (source.getItemCooldown("gun") < 11 && getObjectiveScore(getAmmoObjective(), source.scoreboardIdentity) > 0))
        return;
    source.setProperty("property:is_shooting", true);
});

world.afterEvents.playerHotbarSelectedSlotChange.subscribe((event) => {
    const item = event.itemStack;
    const cache = COMPONENT_CACHE.get(event.player.id);
    if (cache) cache.mainHandTypeId = item ? item.typeId : null;
});

export function setGlobalVariables() { dimension = world.getDimension(CONFIG.DIMENSION); }