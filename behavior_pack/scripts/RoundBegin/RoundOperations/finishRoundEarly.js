import { world } from "@minecraft/server";

import { stopFunctionsInMaps, clearPlayerMaps, setPlayerMaps, resetPlayerDynamicPropertyData, resetPlayerProperties } from "../../resetStats";
import { getPlayersInRound, sleep } from "../../utils";
import { ROUND_STATE_MAP } from "../../gameStats";

// ======= CONFIGURATION =======

let dimension;
const CONFIG = {
  CURTAIN_CLOSE: "curtain_close_event",
  CURTAIN_OPEN_CMD: "event entity @a[tag=!in_lobby] curtain_open_event",
  STOPSOUND: "stopsound @s",
  REMOVE_TAG: "in_game",
  ADD_TAG_CMD: "tag @a add in_lobby",
  TP_ELSEWHERE: "tp @a[tag=!in_lobby] -186 53 -82",
  TP_TO_LOBBBY: "tp @a[tag=!in_lobby] -183 68 -97",
  OPEN_DOOR_EVENT: `event entity @e[type=game:door] "door_0_event"`,
  REMOVE_DOOR_BARRIERS: "fill -180 68 -92 -180 71 -84 air",
  NORMAL_EVENT_CMD: "event entity @a[tag=!in_lobby] normal_event"
};

// ======= LOGIC =======

export async function finishRoundEarly() {
  const players = getPlayersInRound();
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
 dimension.runCommand(CONFIG.TP_ELSEWHERE);

  await sleep(100);
  dimension.runCommand(CONFIG.TP_TO_LOBBBY);
  dimension.runCommand(CONFIG.CURTAIN_OPEN_CMD);
  dimension.runCommand(CONFIG.NORMAL_EVENT_CMD);
  dimension.runCommand(CONFIG.ADD_TAG_CMD);

  ROUND_STATE_MAP.set("ROUND_ENDED_EARLY", false);

  await sleep(30);
  dimension.runCommand(CONFIG.OPEN_DOOR_EVENT);
  dimension.runCommand(CONFIG.REMOVE_DOOR_BARRIERS);
}

// ======= HELPER FUNCTION =======

export function setGlobalVariables() { dimension = world.getDimension("overworld"); }