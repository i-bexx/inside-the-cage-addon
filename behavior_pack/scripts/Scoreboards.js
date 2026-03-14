import { world } from "@minecraft/server";

const OBJECTIVE_IDS = {
  GAMESTARTED: "game_started",
  GAME_RESTARTED: "game_restarted",
  GAME_ENDED_EARLY: "game_ended_early",
  PLAYERS_IN_ROUND: "players_in_round",
  SOULS_FREED: "souls_freed",
  SANITY: "Sanity",
  STAMINA: "Stamina",
  STAMINA_LIMIT: "stamina_limit",
  IS_SHOOTING: "is_shooting",
  AMMO: "ammo",
  USED_TOXIC_BOMB: "used_toxic_bomb",
  COIN_AMOUNT: "coin_amount",
  STALKER_MATCH_ID: "stalker_match_id",
  NEW_GAME: "new_game"
};

const PARTICIPANT_IDS = {
  LEVEL: "value",
  WORLD: "world"
};

// Global Objectives
export function getGameStartedObjective() {
  return world.scoreboard.getObjective(OBJECTIVE_IDS.GAMESTARTED);
}
export function getGameRestartedObjective() {
  return world.scoreboard.getObjective(OBJECTIVE_IDS.GAME_RESTARTED);
}
export function getGameEndedObjective() {
  return world.scoreboard.getObjective(OBJECTIVE_IDS.GAME_ENDED_EARLY);
}
export function getPlayersInRoundObjective() {
  return world.scoreboard.getObjective(OBJECTIVE_IDS.PLAYERS_IN_ROUND);
}
export function getSoulsFreedObjective() {
  return world.scoreboard.getObjective(OBJECTIVE_IDS.SOULS_FREED);
}

// Player Objectives
export function getSanityObjective() {
  return world.scoreboard.getObjective(OBJECTIVE_IDS.SANITY);
}
export function getStaminaObjective() {
  return world.scoreboard.getObjective(OBJECTIVE_IDS.STAMINA);
}
export function getStaminaLimitObjective() {
  return world.scoreboard.getObjective(OBJECTIVE_IDS.STAMINA_LIMIT);
}
export function getIsShootingObjective() {
  return world.scoreboard.getObjective(OBJECTIVE_IDS.IS_SHOOTING);
}
export function getAmmoObjective() {
  return world.scoreboard.getObjective(OBJECTIVE_IDS.AMMO);
}
export function getUsedToxicBombObjective() {
  return world.scoreboard.getObjective(OBJECTIVE_IDS.USED_TOXIC_BOMB);
}
export function getCoinAmountObjective() {
  return world.scoreboard.getObjective(OBJECTIVE_IDS.COIN_AMOUNT);
}
export function getStalkerMatchIdObjective() {
  return world.scoreboard.getObjective(OBJECTIVE_IDS.STALKER_MATCH_ID);
}

// Global-Player Objectives
export function getNewGamedObjective() {
  return world.scoreboard.getObjective(OBJECTIVE_IDS.NEW_GAME);
}

// Participants
export function getValueParticipant() {
  return world.scoreboard.getParticipants()
    .find(p => p.displayName === PARTICIPANT_IDS.LEVEL);
}
export function getWorldParticipant() {
  return world.scoreboard.getParticipants()
    .find(p => p.displayName === PARTICIPANT_IDS.WORLD);
}

// Scores
export function getObjectiveScore(Objective, Participant) {
  return Objective.getScore(Participant);
}
