import { world } from "@minecraft/server";

import { clearPlayerMaps } from "../resetStats";
import { stopFunctionsInMaps } from "../resetStats";

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
  stopFunctionsInMaps(playerId);
  clearPlayerMaps(playerId);
})



