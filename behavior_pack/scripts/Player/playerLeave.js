import { world } from "@minecraft/server";

import { clearPlayerMaps } from "../resetStats";
import { stopFunctionsInMaps } from "../resetStats";
import { PlayerCache } from "./playerCache";

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  stopFunctionsInMaps(playerId);
  clearPlayerMaps(playerId);
  PlayerCache.remove(playerId);
})



