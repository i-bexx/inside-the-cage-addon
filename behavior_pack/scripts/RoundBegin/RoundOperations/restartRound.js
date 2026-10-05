import { world } from "@minecraft/server";

import { stopFunctionsInMaps, clearPlayerMaps, setPlayerMaps, resetPlayerDynamicPropertyData, resetPlayerProperties } from "../../resetStats";
import { startFunction, getSessionPlayers } from "../../gameStarter";
import { ROUND_STATE_MAP } from "../../gameStats";
import { sleep } from "../../utils";

// ======= CONFIGURATION =======

let dimension;
const CONFIG = {
  CURTAIN_CLOSE: "curtain_close_event",
  STOPSOUND: "stopsound @s",
  TP: "tp @a[tag=!in_lobby] -186 53 -82",
  ADD_TAG: "tag @a[tag=!in_lobby] add waiting_for_start",
  REMOVE_TAG: "in_game"
};

// ======= LOGIC =======

export async function restartRound() {
  const players = getSessionPlayers();
  ROUND_STATE_MAP.set("ROUND_STARTED", false);
  await sleep(6);
  
  for (const player of players) {
      player.removeTag(CONFIG.REMOVE_TAG);
      player.triggerEvent(CONFIG.CURTAIN_CLOSE);
      player.runCommand(CONFIG.STOPSOUND);

      stopFunctionsInMaps(player.id);
      clearPlayerMaps(player.id);
      setPlayerMaps(player.id);
      resetPlayerDynamicPropertyData(player);
      resetPlayerProperties(player);
  }
  await sleep(10);

  dimension.runCommand(CONFIG.TP);
  dimension.runCommand(CONFIG.ADD_TAG);

  startFunction();

  ROUND_STATE_MAP.set("ROUND_RESTARTED", false);
}

// ======= HELPER FUNCTION =======

export function setGlobalVariables() { dimension = world.getDimension("overworld"); }