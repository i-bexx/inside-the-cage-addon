import { system } from "@minecraft/server";

export class PlayerCache {
    static CACHE = new Map();

    static addPlayer(player) {
        this.CACHE.set(player.id, new PlayerCache(player));
    }
    static removePlayer(playerId) {
        this.CACHE.delete(playerId);
    }
    static get(playerId) {
        return this.CACHE.get(playerId);
    }

    constructor(player) {
        const equipComp = player.getComponent("minecraft:equippable");
        const mainHandItem = equipComp?.getEquipment("Mainhand");
        this.skinIdVal = 0;
        this.variantVal = 0;
        this.mainHandTypeId = mainHandItem ? mainHandItem.typeId : null;
    }
}

export const COMPONENT_CACHE = new Map();

system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === "game:variant_update")
    COMPONENT_CACHE.get(event.sourceEntity.id).variantVal = Number(event.message);
});