import { world } from "@minecraft/server";

import { startFunction, getSessionPlayers } from "../../gameStarter";
import { sleep } from "../../utils";

// ======= CONFIGURATION =======

let dimension;
const CONFIG = {
  CURTAIN_CLOSE: "curtain_close_event",
  STOPSOUND: "stopsound @s",
  SET_SCOREBOARD: "scoreboard players set value game_started 0",
  TP: "tp @a[tag=!in_lobby] -186 53 -82",
  ADD_TAG: "tag @a[tag=!in_lobby] add waiting_for_start",
  REMOVE_TAG: "in_game"
};

// ======= LOGIC =======

export async function restartRound() {
  const players = getSessionPlayers();
  
  for (const player of players) {
      player.removeTag(CONFIG.REMOVE_TAG);
      player.triggerEvent(CONFIG.CURTAIN_CLOSE);
      player.runCommand(CONFIG.STOPSOUND);
  }
  await dimension.runCommand(CONFIG.SET_SCOREBOARD);
  await sleep(10);

  await dimension.runCommand(CONFIG.TP);
  await dimension.runCommand(CONFIG.ADD_TAG);

  startFunction();

  // 'gameRestart' dynamic property must reset only here
  world.setDynamicProperty("gameRestart", false);
}

// ======= HELPER FUNCTION =======

export function setGlobalVariables() { dimension = world.getDimension("overworld"); }