import { world, system } from "@minecraft/server";

export function getPlayersInRound() {
    return world.getAllPlayers()
            .filter(p => p.hasTag("in_game"));
}

export async function loadTickingArea(dimension, locationObject, areaName) {
    try {
        // Checking if it already exists to avoid errors
        if (world.tickingAreaManager.hasTickingArea(areaName)) {
            return;
        }

        await world.tickingAreaManager.createTickingArea(areaName, {
            dimension: dimension,
            from: { x: locationObject.x - 16, y: locationObject.y, z: locationObject.z - 16 },
            to: { x: locationObject.x + 16, y: locationObject.y, z: locationObject.z + 16 }
        });
    } catch (err) {
        console.error("Could not load tickingarea: " + err);
    }
}

export function removeTickingArea(areaName) {
  try {
      if (world.tickingAreaManager.hasTickingArea(areaName)) {
          world.tickingAreaManager.removeTickingArea(areaName);
      }
  } catch (e) {
      console.error("Could not delete tickingarea: " + e);
  }
}

export function sleep(ticks) {
    return new Promise((resolve) => system.runTimeout(resolve, ticks));
}