import { world } from "@minecraft/server";

import { clearPlayerMaps, stopFunctionsInMaps } from "../resetStats";
import { PlayerCache } from "./playerCache";
import { checkVoteOnPlayerLeave } from "../voteManager";

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  checkVoteOnPlayerLeave();
  stopFunctionsInMaps(playerId);
  clearPlayerMaps(playerId);
  PlayerCache.remove(playerId);
});



