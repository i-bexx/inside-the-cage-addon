import { world, system } from "@minecraft/server";

const GAME_ENTITIES = {
    NULL: "game:null"
};

let cachedNullEntity = undefined;
let lastCheckTick = 0;

export function getNullEntity() {
    if (cachedNullEntity && cachedNullEntity.isValid) {
        return cachedNullEntity;
    }

    const currentTick = system.currentTick;
    if (lastCheckTick === currentTick) return undefined;
    lastCheckTick = currentTick;

    const dimension = world.getDimension("overworld");
    cachedNullEntity = dimension.getEntities({ type: GAME_ENTITIES.NULL })[0];
    
    return cachedNullEntity;
}

function loadNull(event) {
    if (event.entity.typeId === "game:null") {
        event.entity.teleport({ x: -65, y: 75, z: -150 });
        world.afterEvents.entityLoad.unsubscribe(loadNull);
    }
}

world.afterEvents.entityLoad.subscribe(loadNull);