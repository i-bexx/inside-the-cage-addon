import { world, system } from "@minecraft/server";

// ==========================================
// SYSTEM: MODULE IMPORTS
// ==========================================

import { stopGivePanelItem } from "./panels";
import { stopInitiateCam } from "./cameraUsage";
import { resetGameStarterSession } from "./gameStarter";
import { ROUND_STATE_MAP } from "./gameStats";

import { stopTeleportNull } from "./RoundBegin/Null/nullTeleport";
import { stopAmbiance } from "./RoundBegin/ambianceController";
import { stopcoinController } from "./RoundBegin/coinController";

import { despawnCages } from "./RoundBegin/cageController";
import { despawnCoins } from "./RoundBegin/coinController";

import { resetPasswords } from "./RoundBegin/passwordManager";
import { resetPrices } from "./panels";


// ==========================================
// SYSTEM: MAP IMPORTS
// ==========================================

import { listOfPlayersLookingMap, listOfPlayersPlayingStaticMap } from "./RoundBegin/playerLooking";

import { playerDrainingBatteryCountdownMap, playerIsBatteryCriticalCountdownMap } from "./RoundBegin/batteryController";

import { getToastTimeMap } from "./RoundBegin/coinController";

import { playerResetStaminaCooldownMap } from "./RoundBegin/staminaController";

import { getPlaysoundHeartMap, getSanityLowStaticSoundMap, getSanityLowStaticEventMap } from "./RoundBegin/sanityController";


import { checkIfPositionClear } from "./gameStarter";
import { getTeleportCooldown } from "./Teleporter";
import { getCompassStates } from "./UI/fastUiTick";

import { PlayerCache } from "./Player/playerCache";

// ==========================================
// CONSTANTS
// ==========================================

const COMMANDS_TO_RESET_GAME = [
    "tag @a remove in_game",
    "tag @a remove waiting_for_start",
    "tag @a remove starter",
    "tag @a remove eliminated",
    "tag @a remove stalker_matched",
    "tag @a remove hasNotification",
    "tag @a remove requester",
    "tag @a remove accepted_request",
    "tag @a remove refused_request",
    "tag @a remove show_in_round_personal_ui",
    "kill @e[type=game:stalker_cursor]",
    "kill @e[type=game:ghost]",
    "setblock -61 76 -153 air",
    "fill 148 56 -323 136 56 -323 air",
    "fill 148 56 -316 142 56 -316 air",
    "scoreboard players set value souls_freed 0",
    "scoreboard players set @a stalker_match_id 0",
    "scoreboard players set value show_position 1",
    "scoreboard players set value global_ui 91",
    "tp @e[type=game:null] -65 75 -150",
    "fog @a remove in_round_fog",
    "clear @a",
    "camerashake stop @a",
    "inputpermission set @a movement enabled"
];

// ==========================================
// RESET FUNCTIONS
// ==========================================

// ======= PLAYER INFORMATION =======

export function commandsToResetPlayerData(player, playerJoined = false) {
  const isTheRoundRestarted = ROUND_STATE_MAP.get("ROUND_RESTARTED");
  const isTheRoundEndedEarly = ROUND_STATE_MAP.get("ROUND_ENDED_EARLY");

  const gameEndedOnTime = !isTheRoundRestarted && !isTheRoundEndedEarly;
  const isEliminated = player.hasTag("eliminated");

  // If game ended on time, players who don't have 'eliminated' tag shall receive 'normal event' and 'in_lobby' tag
  // Players who have 'eliminated' tag must have seen their 'Game Over' animation first then get the 'normal' event and 'in_lobby' tag
  // After 'eliminated' tag removed, this function will run once more for that player and player shall receive 'normal' event and 'in_lobby' tag this time
  // If player joins the game, the 'normal' event and if necessary, 'in_lobby' tag will be given
  if (gameEndedOnTime && !isEliminated) {
    player.runCommand("event entity @s normal_event");
    player.runCommand("stopsound @s");
    player.addTag("in_lobby");
  } 
    
  // If player was already in game and the round ended on time, they will teleport to lobby
  // If player has the tag of 'eliminated, player won't teleport on the first run but will teleport back to lobby as soon as has no longer the tag mentioned
  if (!playerJoined && gameEndedOnTime && !isEliminated)
    player.runCommand("tp @s -183 68 -97");
  
  player.runCommand("event entity @s battery_is_full_event");
  player.runCommand("fog @s remove in_round_fog");
  player.runCommand(`recipe take @s "*"`);
  player.runCommand("scoreboard players set @s Sanity 100");
  player.runCommand("scoreboard players set @s stalker_match_id 0");

  player.removeTag("show_in_round_personal_ui");
}

export function resetPlayerDynamicPropertyData(player) {
  player.setDynamicProperty("batteryLevel", 4);
  player.setDynamicProperty("batteryIsDraining", false);
  player.setDynamicProperty("batteryIsFullyDrained", false);
  player.setDynamicProperty("batteryIsCollected", false);
  player.setDynamicProperty("batteryIsUpgraded", false);
  player.setDynamicProperty("is_looking", false);
  player.setDynamicProperty("canTurnOffCam", false);
  player.setDynamicProperty("toldPlayerTurnOffCam", false);
  player.setDynamicProperty("initializationBeforeLockingTheCam", false);
  player.setDynamicProperty("lookingCooldown", false);
  player.setDynamicProperty("notLookingCooldown", false);
  player.setDynamicProperty("nowPlayerWillGetNoSignal", false);
  player.setDynamicProperty("hasInteractedWithPeepBefore", false);
  player.setDynamicProperty("acceptedHelpingPeep", false);
}

export function resetPlayerProperties(player) {
  player.setProperty("property:cursor_state", "normal");
  player.setProperty("property:has_ammo", true);
  player.setProperty("property:is_shooting", false);
  player.setProperty("property:start_gun", true);
}

export function resetEntitiesData(ownerJoined = false) {
  const dimension = world.getDimension("overworld");

  const resetRandomPeep = (randomPeep) => {
    randomPeep.triggerEvent("is_sick_event");

    randomPeep.setDynamicProperty("conversationIsConcluded", false);
    randomPeep.setDynamicProperty("conversationIsGoing", false);
    randomPeep.setDynamicProperty("isHealed", false);
  }

  // ------------------------------------
  
  if (ownerJoined) {
    const intervalId = system.runInterval(() => {
      const randomPeep = dimension.getEntities({ type: "game:random_peep" })[0];
      const entities = [ randomPeep ];
      const allFound = entities.every(entity => entity != undefined);

      if (!allFound) return;

      resetRandomPeep(randomPeep);
      system.clearRun(intervalId);
  }, 5);
    return;
  }

  // ------------------------------------
  
  const randomPeep = dimension.getEntities({ type: "game:random_peep" })[0];
  resetRandomPeep(randomPeep);
}

export function clearPlayerMaps(playerId) {
  getCompassStates().delete(playerId);
  
  // Cursor states deleted via PlayerCache automatically

  checkIfPositionClear().delete(playerId);

  getTeleportCooldown().delete(playerId);

  playerDrainingBatteryCountdownMap().delete(playerId);
  playerIsBatteryCriticalCountdownMap().delete(playerId);

  getToastTimeMap().delete(playerId);

  getPlaysoundHeartMap().delete(playerId);
  getSanityLowStaticSoundMap().delete(playerId);
  getSanityLowStaticEventMap().delete(playerId);

  listOfPlayersLookingMap().delete(playerId);

  playerResetStaminaCooldownMap().delete(playerId);
}

export function setPlayerMaps(playerId) {
  const cache = PlayerCache.get(playerId);
    cache.camUsing = false;
    cache.stamina = 10;
    cache.staminaLimit = 10;
    cache.lastLookedEntityId = undefined;
    cache.stalkerEntity = null;
}


export function stopFunctionsInMaps(playerId) { // Stops the loops or countdown functions determined for one player
  const playerDrainingBattery = playerDrainingBatteryCountdownMap().get(playerId);
  if (playerDrainingBattery != undefined) system.clearRun(playerDrainingBattery);
  
  const playerBatteryCritical = playerIsBatteryCriticalCountdownMap().get(playerId);
  if (playerBatteryCritical != undefined) system.clearRun(playerBatteryCritical);

  const playerPlayingStatic = listOfPlayersPlayingStaticMap().get(playerId);
  if (playerPlayingStatic != undefined) system.clearRun(playerPlayingStatic);
}

// ======= WORLD INFORMATION =======

export function resetWorldDynamicPropertyData() {
  world.setDynamicProperty("starter", false);
  world.setDynamicProperty("nullTeleportChecking", false);
  world.setDynamicProperty("cages4Activated", false);
  world.setDynamicProperty("cages5Activated", false);
  world.setDynamicProperty("nowPlayersWillGetNoSignalWhenUseCam", false);
  world.setDynamicProperty("roundCompleted", false);
}

export function resetFunctions() {
  stopGivePanelItem();
  stopInitiateCam();
  
  stopcoinController();
  stopTeleportNull();
  stopAmbiance();
  
  resetGameStarterSession();
  resetPasswords();
  resetPrices();
}

export async function despawnEntities() {
  await despawnCages();
  await despawnCoins();
}

export function commandsToResetTheGame(dimension) {
  const gameRestarted = ROUND_STATE_MAP.get("ROUND_RESTARTED");
  const gameEndedEarly = ROUND_STATE_MAP.get("ROUND_ENDED_EARLY");

  for (const cmd of COMMANDS_TO_RESET_GAME) 
    dimension.runCommand(cmd);

  //If game restarted, the door shall remain closed
  //If game ended early, a different file will open the door
  if (gameRestarted || gameEndedEarly) return;

  dimension.runCommand(`event entity @e[type=game:door] "door_0_event"`);
  dimension.runCommand("fill -180 68 -92 -180 71 -84 air");
}

// ==========================================
// RESET MAPS
// ==========================================

export function resetMaps() {
  listOfPlayersLookingMap().clear(); //playerLooking
  listOfPlayersPlayingStaticMap().clear();

  playerDrainingBatteryCountdownMap().clear(); //batteryController
  playerIsBatteryCriticalCountdownMap().clear();

  playerResetStaminaCooldownMap().clear(); //staminaController

  getPlaysoundHeartMap().clear(); //sanityController
  getSanityLowStaticSoundMap().clear();
  getSanityLowStaticEventMap().clear();
}