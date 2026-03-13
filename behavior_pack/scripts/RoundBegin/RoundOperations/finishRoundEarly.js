import { world, system } from "@minecraft/server";

import { getPlayersInRound } from "../../getPlayersArray";

// ======= CONFIGURATION =======

const DIMENSION = world.getDimension("overworld");
const CONFIG = {
  CURTAIN_CLOSE: "curtain_close_event",
  CURTAIN_OPEN_CMD: "event entity @a[tag=!in_lobby] curtain_open_event",
  STOPSOUND: "stopsound @s",
  REMOVE_TAG: "in_game",
  ADD_TAG_CMD: "tag @a add in_lobby",
  TP_ELSEWHERE: "tp @a[tag=!in_lobby] -186 53 -82",
  TP_TO_LOBBBY: "tp @a[tag=!in_lobby] -183 68 -97",
  OPEN_DOOR_EVENT: `event entity @e[type=game:door] "0"`,
  REMOVE_DOOR_BARRIERS: "fill -180 68 -92 -180 71 -84 air",
  SET_SCOREBOARD: "scoreboard players set value game_started 0",
  NORMAL_EVENT_CMD: "event entity @a[tag=!in_lobby] normal_event"
};

// ======= LOGIC =======

export async function finishRoundEarly() {
  const players = getPlayersInRound();

  for (const player of players) {
    player.removeTag(CONFIG.REMOVE_TAG);
    player.triggerEvent(CONFIG.CURTAIN_CLOSE);
    player.runCommand(CONFIG.STOPSOUND);
  }
  await DIMENSION.runCommand(CONFIG.SET_SCOREBOARD);

  await sleep(10);
  await DIMENSION.runCommand(CONFIG.TP_ELSEWHERE);

  await sleep(100);
  await DIMENSION.runCommand(CONFIG.TP_TO_LOBBBY);
  await DIMENSION.runCommand(CONFIG.CURTAIN_OPEN_CMD);
  await DIMENSION.runCommand(CONFIG.NORMAL_EVENT_CMD);
  await DIMENSION.runCommand(CONFIG.ADD_TAG_CMD);

  // 'roundEndedEarly' dynamic property must reset only here
  world.setDynamicProperty("roundEndedEarly", false);

  await sleep(30);
  await DIMENSION.runCommand(CONFIG.OPEN_DOOR_EVENT);
  await DIMENSION.runCommand(CONFIG.REMOVE_DOOR_BARRIERS);
}

// ======= HELPER FUNCTION =======

function sleep(ticks) {
  return new Promise((resolve) => system.runTimeout(resolve, ticks));
}