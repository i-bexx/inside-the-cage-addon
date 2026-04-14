import { world, system } from "@minecraft/server";

// ==========================================
// SYSTEM: MODULE IMPORTS
// ==========================================

import { getHostileCounterId, getStopHostileSpawnId, getContinueHostileSpawnId, getCages_4Id, getCages_5Id } from "./RoundBegin/Hostile";
import { getTeleportEntityId, getTimeSetterId } from "./RoundBegin/Null/nullTeleport";
import { getSanityId } from "./RoundBegin/Sanity";

import { getTeleportStalkerId } from "./Stalker";
import { getPlayerCanShootId } from "./cursorController";
import { getPanelItemCountdownId } from "./panels";

import { getPlayerLookingId } from "./RoundBegin/playerLooking";
import { getStaminaId } from "./RoundBegin/Stamina";
import { getBatteryId } from "./RoundBegin/batteryController";
import { getCoinId } from "./RoundBegin/coinSpawner";
import { getWarnPlayerAboutCamId } from "./RoundBegin/cameraController";
import { getInitiateCamId } from "./cameraUsage";
import { getSoulsAmountCheckId } from "./RoundBegin/soulController";

import { stopAmbiance } from "./RoundBegin/ambianceController";
import { resetBatteryIntervalId } from "./RoundBegin/batteryController";
import { resetCameraWarningIntervalId } from "./RoundBegin/cameraController";
import { resetCoinIntervalId } from "./RoundBegin/coinSpawner";


// ==========================================
// SYSTEM: MAP IMPORTS
// ==========================================

import { listOfPlayersLookingMap, playerStatesOfPlayerLookingMap, listOfPlayersPlayingStaticMap } from "./RoundBegin/playerLooking";

import { playerStatesOfBatteryMap, playerDrainingBatteryCountdownMap, playerIsBatteryCriticalCountdownMap } from "./RoundBegin/batteryController";

import { playerResetStaminaCooldownMap } from "./RoundBegin/Stamina";

import { getPlaysoundHeartMap, getSanityLowStaticSoundMap, getSanityLowStaticEventMap } from "./RoundBegin/Sanity";

import { getCursorStates, getShootingStates } from "./cursorController";

import { checkIfPositionClear } from "./gameStarter";

import { getTeleportCooldown } from "./Teleporter";

import { getCompassStates } from "./UI/fastUiTick";

// ==========================================
// CONSTANTS
// ==========================================

const COMMANDS_TO_RESET_GAME = [
    "tag @a remove in_game",
    "tag @a remove waiting_for_start",
    "tag @a remove starting",
    "tag @a remove starter",
    "tag @a remove aa_matched",
    "tag @a remove hasNotification",
    "tag @a remove show_in_round_personal_ui",
    "kill @e[type=game:stalker_cursor]",
    "kill @e[type=game:cage]",
    "kill @e[type=game:coin]",
    "kill @e[type=game:hostile]",
    "setblock -54 75 -152 air",
    "setblock -61 76 -153 air",
    "setblock -49 75 -154 air",
    "fill 148 56 -323 136 56 -323 air",
    "fill 148 56 -316 142 56 -316 air",
    "scoreboard players set value souls_freed 0",
    "scoreboard players set @a stalker_match_id 0",
    "scoreboard players set value game_started 0",
    "scoreboard players set value game_restarted 0",
    "scoreboard players set value game_ended_early 0",
    "scoreboard players set value show_position 1",
    "scoreboard players set value global_ui 91",
    "fog @a remove b",
    "clear @a",
    "camerashake stop @a"
];

// ==========================================
// RESET FUNCTIONS
// ==========================================

// ======= PLAYER INFORMATION =======

export function commandsToResetPlayerData(player, playerJoined = false) {
  const isTheRoundRestarted = world.getDynamicProperty("gameRestart");
  const isTheRoundEndedEarly = world.getDynamicProperty("roundEndedEarly");

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
  player.runCommand("fog @s remove default_fog");
  player.runCommand("scoreboard players set @s Stamina 10");
  player.runCommand("scoreboard players set @s stamina_limit 10");
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
  player.setDynamicProperty("camUsing", false);
  player.setDynamicProperty("canTurnOffCam", false);
  player.setDynamicProperty("toldPlayerTurnOffCam", false);
  player.setDynamicProperty("initializationBeforeLockingTheCam", false);
  player.setDynamicProperty("lookingCooldown", false);
  player.setDynamicProperty("notLookingCooldown", false);
  player.setDynamicProperty("nowPlayerWillGetNoSignal", false);
  player.setDynamicProperty("isShooting", false);
}

export function clearPlayerMaps(playerId) { // Clears maps of player
  getCompassStates().delete(playerId);
  
  getCursorStates().delete(playerId);
  getShootingStates().delete(playerId);

  checkIfPositionClear().delete(playerId);

  getTeleportCooldown().delete(playerId);

  playerStatesOfBatteryMap().delete(playerId);
  playerDrainingBatteryCountdownMap().delete(playerId);
  playerIsBatteryCriticalCountdownMap().delete(playerId);

  getPlaysoundHeartMap().delete(playerId);
  getSanityLowStaticSoundMap().delete(playerId);
  getSanityLowStaticEventMap().delete(playerId);

  listOfPlayersLookingMap().delete(playerId);
  playerStatesOfPlayerLookingMap().delete(playerId);

  playerResetStaminaCooldownMap().delete(playerId);
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
  world.setDynamicProperty("roundOver", false);
  world.setDynamicProperty("starter", false);
  world.setDynamicProperty("nullTeleportChecking", false);
  world.setDynamicProperty("cages4Activated", false);
  world.setDynamicProperty("cages5Activated", false);
  world.setDynamicProperty("nowPlayersWillGetNoSignalWhenUseCam", false);
}

export function stopTheFunctions() {
  system.clearRun(getInitiateCamId());
  system.clearRun(getPlayerLookingId());
  system.clearRun(getBatteryId());
  system.clearRun(getStaminaId());
  system.clearRun(getCoinId());
  system.clearRun(getWarnPlayerAboutCamId());
  system.clearRun(getPlayerCanShootId());
  system.clearRun(getPanelItemCountdownId());
  
  system.clearRun(getSoulsAmountCheckId());
  system.clearRun(getHostileCounterId());
  system.clearRun(getContinueHostileSpawnId());
  system.clearRun(getStopHostileSpawnId());
  system.clearRun(getCages_4Id());
  system.clearRun(getCages_5Id());
  
  system.clearRun(getSanityId());
  
  system.clearRun(getTeleportStalkerId());
  
  system.clearRun(getTeleportEntityId());
  system.clearRun(getTimeSetterId());

  stopAmbiance();
  resetBatteryIntervalId();
  resetCameraWarningIntervalId();
  resetCoinIntervalId();
}

export async function commandsToResetTheGame(dimension) {
  const gameRestarted = world.getDynamicProperty("gameRestart");
  const gameEndedEarly = world.getDynamicProperty("roundEndedEarly");
  for (const cmd of COMMANDS_TO_RESET_GAME) {
        await dimension.runCommand(cmd);
    }

    //If game restarted, the door shall remain closed
    //If game ended early, a different file will open the door
    if (gameRestarted || gameEndedEarly) return;

    dimension.runCommand(`event entity @e[type=game:door] "0"`);
    dimension.runCommand("fill -180 68 -92 -180 71 -84 air");
}

// ==========================================
// RESET MAPS
// ==========================================

export function resetMaps() {
  playerStatesOfPlayerLookingMap().clear(); //playerLooking
  listOfPlayersLookingMap().clear();
  listOfPlayersPlayingStaticMap().clear();

  playerStatesOfBatteryMap().clear(); //batteryController
  playerDrainingBatteryCountdownMap().clear();
  playerIsBatteryCriticalCountdownMap().clear();

  playerResetStaminaCooldownMap().clear(); //Stamina

  getPlaysoundHeartMap().clear(); //Sanity
  getSanityLowStaticSoundMap().clear();
  getSanityLowStaticEventMap().clear();
}