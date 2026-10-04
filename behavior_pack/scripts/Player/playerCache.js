import { system, world } from "@minecraft/server";

class PlayerCache {
    static _map = new Map();

    static add(player) {
        this._map.set(player.id, new PlayerCache(player));
    }

    static remove(playerId) {
        this._map.delete(playerId);
    }

    static get(playerId) {
        return this._map.get(playerId);
    }

    constructor(player) {
        this.skinIdVal = 0;
        this.variantVal = 0;
        this.mainHandTypeId = null;

        // Player State
        this.camUsing = false;
        this.compassShowing = false;
        this.stamina = 10;
        this.staminaLimit = 10;

        // Subsystems
        this.lastLookedEntityId = undefined;
    }
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id === "game:variant_update") {
        const cache = PlayerCache.get(event.sourceEntity.id);
        if (cache) cache.variantVal = Number(event.message);
    }
});

export { PlayerCache };