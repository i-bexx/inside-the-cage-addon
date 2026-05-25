import { world } from "@minecraft/server";

import { setGlobalVariables as playerJoinSetGlobalVariables } from "./Player/playerJoin";
import { setGlobalVariables as playerSituationSetGlobalVariables } from "./Player/playerSituation";

import { setGlobalVariables as nullTeleportSetGlobalVariables } from "./RoundBegin/Null/nullTeleport";
import { setGlobalVariables as finishRoundEarlySetGlobalVariables } from "./RoundBegin/RoundOperations/finishRoundEarly";
import { setGlobalVariables as restartRoundSetGlobalVariables } from "./RoundBegin/RoundOperations/restartRound";
import { setGlobalVariables as cageControllerSetGlobalVariables } from "./RoundBegin/cageController";
import { setGlobalVariables as coinSpawnerSetGlobalVariables } from "./RoundBegin/coinSpawner";
import { setGlobalVariables as playerLookingSetGlobalVariables } from "./RoundBegin/playerLooking";

import { setGlobalVariables as gameStarterSetGlobalVariables } from "./gameStarter";
import { setGlobalVariables as gameStatsSetGlobalVariables } from "./gameStats";
import { setGlobalVariables as panelsSetGlobalVariables } from "./panels";
import { setGlobalVariables as preStartSetGlobalVariables } from "./preStart";
import { setGlobalVariables as stalkerEntitySetGlobalVariables } from "./stalkerEntity";
import { setGlobalVariables as teleporterSetGlobalVariables } from "./Teleporter";
import { setGlobalVariables as voteManagerSetGlobalVariables } from "./voteManager";

import { setForms as voteManagerSetForms } from "./voteManager";


world.afterEvents.worldLoad.subscribe(() => {
  playerJoinSetGlobalVariables();
  playerSituationSetGlobalVariables();

  nullTeleportSetGlobalVariables();
  finishRoundEarlySetGlobalVariables();
  restartRoundSetGlobalVariables();
  cageControllerSetGlobalVariables();
  coinSpawnerSetGlobalVariables();
  playerLookingSetGlobalVariables();

  gameStarterSetGlobalVariables();
  gameStatsSetGlobalVariables();
  panelsSetGlobalVariables();
  preStartSetGlobalVariables();
  stalkerEntitySetGlobalVariables();
  teleporterSetGlobalVariables();
  voteManagerSetGlobalVariables();

  voteManagerSetForms();

  world.setDynamicProperty("in_menu", true);
  world.setDynamicProperty("skip_cutscene_limit", 0);
})