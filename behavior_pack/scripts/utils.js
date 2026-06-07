import { world, system } from "@minecraft/server";

export function loadTickingArea(dimension, locationObject, areaName) {
    try {
        dimension.runCommand(`tickingarea add circle ${locationObject.x} ${locationObject.y} ${locationObject.z} 2 ${areaName}`);
    } catch (err) {
        console.error("Could not load tickingarea")
    }
}

export function removeTickingArea(dimension, areaName) {
  try {
    dimension.runCommand(`tickingarea remove ${areaName}`);
  } catch (e) {
    console.error("Could not delete tickingarea")
  }
}

export function sleep(ticks) {
    return new Promise((resolve) => system.runTimeout(resolve, ticks));
}