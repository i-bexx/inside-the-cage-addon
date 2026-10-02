import { world, system } from "@minecraft/server";

const GAME_ENTITIES = {
    NULL: "game:null"
};

let cachedNullEntity = undefined;
let lastCheckTick = 0;

export function getNullEntity() {
    // 1. RAM'de varsa ve yaşıyorsa saniyesinde ver (0 ms)
    if (cachedNullEntity && cachedNullEntity.isValid) {
        return cachedNullEntity;
    }

    // 2. Yoksa, aynı tick (kare) içinde 2. kez arama yapmayı engelle (Lag koruması)
    const currentTick = system.currentTick;
    if (lastCheckTick === currentTick) return undefined;
    lastCheckTick = currentTick;

    // 3. Bul ve RAM'e kaydet
    const dimension = world.getDimension("overworld");
    cachedNullEntity = dimension.getEntities({ type: GAME_ENTITIES.NULL })[0];
    
    return cachedNullEntity;
}
