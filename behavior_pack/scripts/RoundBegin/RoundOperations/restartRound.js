import { world } from "@minecraft/server";

import { stopFunctionsInMaps, clearPlayerMaps, setPlayerMaps, resetPlayerDynamicPropertyData, resetPlayerProperties, commandsToResetPlayerData } from "../../resetStats";
import { startFunction, getSessionPlayers } from "../../gameStarter";
import { ROUND_STATE_MAP } from "../../gameStats";
import { sleep } from "../../utils";

// ======= CONFIGURATION =======

let dimension;
const CONFIG = {
  CURTAIN_CLOSE: "curtain_close_event",
  TP_ELSEWHERE: "tp @a[tag=waiting_for_start] -186 53 -82",
  STOPSOUND: "stopsound @s",
  REMOVE_TAG: "in_game"
};

// ======= LOGIC =======

export async function restartRound() {
  const players = getSessionPlayers();
  ROUND_STATE_MAP.set("ROUND_STARTED", false);
  await sleep(6);
  
  for (const player of players) {
      if (!player || !player.isValid) continue;

      player.removeTag(CONFIG.REMOVE_TAG);
      player.removeTag("in_lobby");
      player.removeTag("eliminated");
      player.triggerEvent(CONFIG.CURTAIN_CLOSE);
      player.runCommand(CONFIG.STOPSOUND);

      stopFunctionsInMaps(player.id);
      clearPlayerMaps(player.id);
      setPlayerMaps(player.id);
      commandsToResetPlayerData(player);
      resetPlayerDynamicPropertyData(player);
      resetPlayerProperties(player);

      player.addTag("waiting_for_start");
  }

  await sleep(10);
  dimension.runCommand(CONFIG.TP_ELSEWHERE);
  startFunction();

  ROUND_STATE_MAP.set("ROUND_RESTARTED", false);
}

// ======= HELPER FUNCTION =======

export function setGlobalVariables() { dimension = world.getDimension("overworld"); }