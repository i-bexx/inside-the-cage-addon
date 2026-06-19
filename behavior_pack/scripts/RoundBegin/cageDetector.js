import { world } from "@minecraft/server";
import { ActionFormData, FormCancelationReason } from "@minecraft/server-ui";

import { loadTickingArea, removeTickingArea, sleep } from "../utils";

let cageLocations = [];
let errorIntegers = [ 5, 7, 3, -2, -4, -1, 1 ];

// --- LISTENER ---

world.afterEvents.itemUse.subscribe(({itemStack, source}) => {
  if (itemStack.typeId != "game:cage_detector") return;

  openCageDetector(source);
})

// --- MAIN FUNCTIONS ---

export function InitializeCageDetector() {
  cageLocations = JSON.parse(world.getDynamicProperty("active_cage_locations"));
  cageLocations.sort(() => 0.5 - Math.random());

  errorIntegers.sort(() => 0.5 - Math.random());
}

async function openCageDetector(player) {
  const { direction, cageDistance, errorInteger, signalImage } = await getCageInfo(player);


  new ActionFormData()
  .title("cage_detector_panel")
  .body(`${direction}`)
  .button(`${cageDistance}`)
  .button(`${errorInteger}`)
  .button("", `${signalImage}`)
  .button("button4")
  .button("button5")
  .show(player).then(({ cancelationReason, canceled }) => {
    if (cancelationReason === FormCancelationReason.UserBusy || canceled) {
            return;
    }
  });
}

// --- HELPER FUNCTIONS ---

async function getCageInfo(player) {
  const cageData = await getCage();
  if (!cageData) return { direction: "None", cageDistance: 0, errorInteger: 0 };

  const errorInteger = cageData.errorInteger;

  const cageLocations = {
    x: cageData.x + cageData.errorInteger,
    z: cageData.z + cageData.errorInteger
  }

  const dx = cageLocations.x - player.location.x;
  const dz = cageLocations.z - player.location.z;
  
  const cageDistance = Math.floor(Math.sqrt(dx * dx + dz * dz));

  const angle = Math.atan2(-dx, dz) * (180 / Math.PI);
  const direction = getDirection(angle);

  let signalImage;
  if (cageDistance >= 100) signalImage = "textures/ui/panels/cage_detector/low";
  else if (cageDistance < 100 && cageDistance > 25) signalImage = "textures/ui/panels/cage_detector/normal";
  else signalImage = "textures/ui/panels/cage_detector/high";

  return { direction, cageDistance, errorInteger, signalImage };
}



async function getCage() {
  let cageNumber = 0;
  for (const cageLocation of cageLocations) {
    removeTickingArea(world.getDimension("overworld"), cageLocation.areaName);

    await sleep(40);

    loadTickingArea(world.getDimension("overworld"), cageLocation.locationObject, cageLocation.areaName);

    await sleep(40);

    const cage = world.getDimension("overworld").getEntities({ type: "game:cage", location: cageLocation.locationObject, maxDistance: 20 })[0];

    if (cage.getComponent("minecraft:mark_variant")?.value === 1) {
      removeTickingArea(world.getDimension("overworld"), cageLocation.areaName);
      cageNumber++;
      continue;
    }
    else {
      removeTickingArea(world.getDimension("overworld"), cageLocation.areaName);

      const cageData = {
        x: cageLocation.locationObject.x,
        z: cageLocation.locationObject.z,
        errorInteger: errorIntegers[cageNumber]
      }
      return cageData;
    }
  }
}

function getDirection(angle) {
    const normalized = ((angle % 360) + 360) % 360;

    if (normalized >= 337.5 || normalized < 22.5)  return "South";
    if (normalized >= 22.5  && normalized < 67.5)  return "Southwest";
    if (normalized >= 67.5  && normalized < 112.5) return "West";
    if (normalized >= 112.5 && normalized < 157.5) return "Northwest";
    if (normalized >= 157.5 && normalized < 202.5) return "North";
    if (normalized >= 202.5 && normalized < 247.5) return "Northeast";
    if (normalized >= 247.5 && normalized < 292.5) return "East";
    if (normalized >= 292.5 && normalized < 337.5) return "Southeast";
}