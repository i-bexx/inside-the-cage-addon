import { world } from "@minecraft/server";

const OBJECTIVE_IDS = [
  "players_in_round",
  "souls_freed",
  "Sanity",
  "ammo",
  "coin_amount",
  "stalker_match_id",
  "new_game"
];

const PARTICIPANT_IDS = [
  "value",
  "world"
];

const ScoreboardCache = {
  objectives: {
    PLAYERS_IN_ROUND: undefined,
    SOULS_FREED:      undefined,
    SANITY:           undefined,
    AMMO:             undefined,
    COIN_AMOUNT:      undefined,
    STALKER_MATCH_ID: undefined,
    NEW_GAME:         undefined
  },
  participants: {
    VALUE: undefined,
    WORLD: undefined
  }
};

export function setScoreboardCache() {
  for (const [ index, element ] of Object.keys(ScoreboardCache.objectives).entries())
    ScoreboardCache.objectives[element] = world.scoreboard.getObjective(OBJECTIVE_IDS[index]);

  const allParticipants = world.scoreboard.getParticipants();
  
  for (const [ index, element ] of Object.keys(ScoreboardCache.participants).entries())
    ScoreboardCache.participants[element] = allParticipants.find(p => p.displayName === PARTICIPANT_IDS[index]);
}

// Global Objectives
export function getPlayersInRoundObjective() { return ScoreboardCache.objectives.PLAYERS_IN_ROUND; }
export function getSoulsFreedObjective() { return ScoreboardCache.objectives.SOULS_FREED; }

// Player Objectives
export function getSanityObjective() { return ScoreboardCache.objectives.SANITY; }
export function getAmmoObjective() { return ScoreboardCache.objectives.AMMO; }
export function getUsedToxicBombObjective() { return ScoreboardCache.objectives.USED_TOXIC_BOMB; }
export function getCoinAmountObjective() { return ScoreboardCache.objectives.COIN_AMOUNT; }
export function getStalkerMatchIdObjective() { return ScoreboardCache.objectives.STALKER_MATCH_ID; }

// Global-Player Objectives
export function getNewGameObjective() { return ScoreboardCache.objectives.NEW_GAME; }

// Participants
export function getValueParticipant() { return ScoreboardCache.participants.VALUE; }
export function getWorldParticipant() { return ScoreboardCache.participants.WORLD; }

// Scores
export function getObjectiveScore(Objective, Participant) {
  if (!Objective || !Participant) return undefined;
  return Objective.getScore(Participant);
}