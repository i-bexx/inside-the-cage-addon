import { world, system } from "@minecraft/server";

import { getPlayersInRound } from "../../getPlayersArray";
import { startFunction } from "../../gameStarter";

// ======= CONFIGURATION =======

const DIMENSION = world.getDimension("overworld");
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
  const players = getPlayersInRound();
  
  for (const player of players) {
      player.removeTag(CONFIG.REMOVE_TAG);
      player.triggerEvent(CONFIG.CURTAIN_CLOSE);
      player.runCommand(CONFIG.STOPSOUND);
  }
  await DIMENSION.runCommand(CONFIG.SET_SCOREBOARD);
  await sleep(10);

  await DIMENSION.runCommand(CONFIG.TP);
  await DIMENSION.runCommand(CONFIG.ADD_TAG);

  startFunction();

  // 'gameRestart' dynamic property must reset only here
  world.setDynamicProperty("gameRestart", false);
}

// ======= HELPER FUNCTION =======

function sleep(ticks) {
  return new Promise((resolve) => system.runTimeout(resolve, ticks));
}