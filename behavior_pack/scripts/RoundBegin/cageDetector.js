import { world } from "@minecraft/server";
import { ActionFormData, FormCancelationReason } from "@minecraft/server-ui";

import { loadTickingArea, removeTickingArea, sleep } from "../utils";

let cageLocations = [];
let deviationIntegers = [ 15, 17, 13, -12, -14, -11, 9 ];

// --- MAIN FUNCTIONS ---

export function InitializeCageDetector() {
  cageLocations = JSON.parse(world.getDynamicProperty("active_cage_locations"));
  cageLocations.sort(() => 0.5 - Math.random());

  deviationIntegers.sort(() => 0.5 - Math.random());
}

export async function openCageDetector(player) {
  if (player.getItemCooldown("cage_detector") < 199) return;

  player.onScreenDisplay.setActionBar("§eCage Detector: Signal processing...");

  const cageInfo = await getCageInfo(player);
  if (!cageInfo || !player.isValid) return; // Player might get eliminated or left while the signal was processing

  const { direction, cageDistance, deviationInteger, signalImage, elevation, eta } = cageInfo;

  new ActionFormData()
  .title("cage_detector_panel")
  .body(`${direction}`)
  .button(`${cageDistance}`)
  .button(`${deviationInteger}`)
  .button("", `${signalImage}`)
  .button(`${elevation}`)
  .button(`${eta}`)
  .show(player).then(({ cancelationReason, canceled }) => {
    if (cancelationReason === FormCancelationReason.UserBusy || canceled) {
            return;
    }
  });
}

// --- HELPER FUNCTIONS ---

async function getCageInfo(player) {
  const cageData = await getCage();
  if (!player.isValid || player.hasTag("eliminated")) return;
  if (!cageData) return { direction: "None", cageDistance: 0, deviationInteger: 0 };

  const deviationInteger = cageData.deviationInteger;

  const cageLocations = {
    x: cageData.x + cageData.deviationInteger,
    y: cageData.y + cageData.deviationInteger,
    z: cageData.z + cageData.deviationInteger
  }

  const dx = cageLocations.x - player.location.x;
  const dy = cageLocations.y - player.location.y;
  const dz = cageLocations.z - player.location.z;
  
  const cageDistance = Math.floor(Math.sqrt(dx * dx + dy * dy + dz * dz));

  const angle = Math.atan2(-dx, dz) * (180 / Math.PI);
  const direction = getDirection(angle);

  let signalImage;
  if (cageDistance >= 375) signalImage = "textures/ui/panels/cage_detector/signal/low";
  else if (cageDistance < 375 && cageDistance > 100) signalImage = "textures/ui/panels/cage_detector/signal/normal";
  else signalImage = "textures/ui/panels/cage_detector/signal/high";

  const elevation = Math.round(cageData.y - player.location.y);

  const eta = Math.ceil((cageDistance / 2.5) / 60).toString() + "m";

  return { direction, cageDistance, deviationInteger, signalImage, elevation, eta };
}



async function getCage() {
  let cageNumber = 0;
  for (const cageLocation of cageLocations) {
    removeTickingArea(cageLocation.areaName);

    await sleep(40);

    await loadTickingArea(world.getDimension("overworld"), cageLocation.locationObject, cageLocation.areaName);

    await sleep(40);

    const cage = world.getDimension("overworld").getEntities({ type: "ibexx_itc:cage", location: cageLocation.locationObject, maxDistance: 20 })[0];

    if (cage?.getComponent("minecraft:mark_variant")?.value === 1) {
      removeTickingArea(cageLocation.areaName);
      cageNumber++;
      continue;
    }
    else {
      removeTickingArea(cageLocation.areaName);

      const cageData = {
        x: cageLocation.locationObject.x,
        y: cageLocation.locationObject.y,
        z: cageLocation.locationObject.z,
        deviationInteger: deviationIntegers[cageNumber]
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