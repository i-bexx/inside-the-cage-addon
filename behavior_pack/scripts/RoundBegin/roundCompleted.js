import { world } from "@minecraft/server";

import { sleep } from "../utils";
import { cameraDeactivated } from "../cameraUsage";
import { resetPlayerDynamicPropertyData, clearPlayerMaps, stopFunctionsInMaps, commandsToResetPlayerData } from "../resetStats";

export async function roundCompleted() {
  const players = world.getPlayers({tags: ["in_game"]});

  for (const player of players) {
    cameraDeactivated(player, true);

		player.runCommand("inputpermission set @s movement disabled");
    player.triggerEvent("cannot_move_event");

    stopFunctionsInMaps(player.id);
    clearPlayerMaps(player.id);
    resetPlayerDynamicPropertyData(player);
	}
	world.setDynamicProperty("roundCompleted", true);

  await sleep(40);

  for (const player of players) {
   player.teleport({x: -186, y: 53, z: -82});
  }

  await sleep(100);

  for (const player of players) {
    commandsToResetPlayerData(player);
  }

  world.getDimension("overworld").runCommand("scoreboard players set value game_started 0");
}