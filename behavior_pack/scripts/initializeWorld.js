import { world, system } from "@minecraft/server";

import { playerJoinSetVariables } from "./Player/playerJoin";
import { playerSituationSetVariables } from "./Player/playerSituation";

import { nullTeleportSetVariables } from "./RoundBegin/Null/nullTeleport";
import { finishRoundEarlySetVariables } from "./RoundBegin/RoundOperations/finishRoundEarly";
import { restartRoundSetVariables } from "./RoundBegin/RoundOperations/restartRound";
import { cageControllerSetVariables } from "./RoundBegin/cageController";
import { coinSpawnerSetVariables } from "./RoundBegin/coinSpawner";
import { playerLookingSetVariables } from "./RoundBegin/playerLooking";

import { gameStarterSetVariables } from "./gameStarter";
import { gameStatsSetVariables } from "./gameStats";
import { panelsSetVariables } from "./panels";
import { preStartSetVariables } from "./preStart";
import { stalkerEntitySetVariables } from "./stalkerEntity";
import { teleporterSetVariables } from "./Teleporter";
import { voteManagerSetVariables } from "./voteManager";


world.afterEvents.worldLoad.subscribe(() => {
  playerJoinSetVariables();
  playerSituationSetVariables();

  nullTeleportSetVariables();
  finishRoundEarlySetVariables();
  restartRoundSetVariables();
  cageControllerSetVariables();
  coinSpawnerSetVariables();
  playerLookingSetVariables();

  gameStarterSetVariables();
  gameStatsSetVariables();
  panelsSetVariables();
  preStartSetVariables();
  stalkerEntitySetVariables();
  teleporterSetVariables();
  voteManagerSetVariables();

  world.setDynamicProperty("in_menu", true);
  world.setDynamicProperty("skip_cutscene_limit", 0);
})