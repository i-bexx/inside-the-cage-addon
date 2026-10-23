import { world } from "@minecraft/server";

import { sleep } from "../../utils";
import { ROUND_STATE_MAP } from "../../gameStats";
import { cameraDeactivated } from "../../cameraUsage";
import { slowUiTick } from "../../UI/slowUiTick";
import { playerCurtainMap } from "../../UI/fastUiTick";
import { resetPlayerDynamicPropertyData, resetPlayerProperties, clearPlayerMaps, setPlayerMaps, stopFunctionsInMaps, commandsToResetPlayerData } from "../../resetStats";
import { resetFunctions, resetMaps, resetWorldDynamicPropertyData, resetEntitiesData } from "../../resetStats";

export async function roundCompleted() {
  ROUND_STATE_MAP.set("ROUND_COMPLETED", true);
  const players = world.getPlayers({tags: ["in_game"]});

  for (const player of players) {
    cameraDeactivated(player, true);

		player.runCommand("inputpermission set @s movement disabled");
    player.triggerEvent("cannot_move_event");
    player.removeTag("show_in_round_personal_ui");

    stopFunctionsInMaps(player.id);
    clearPlayerMaps(player.id);
    setPlayerMaps(player.id);
    resetPlayerDynamicPropertyData(player);
    resetPlayerProperties(player);

    slowUiTick(player);
	}

  resetFunctions();
  resetMaps();
  resetWorldDynamicPropertyData();
  resetEntitiesData();

  players.forEach(player => playerCurtainMap.set(player.id, true));

  await sleep(40);

  players.forEach(player => {
    if (player.isValid) player.teleport({x: -186, y: 53, z: -82});
  });

  await sleep(40);

  players.forEach(player => {
    if (player.isValid) {
      playerCurtainMap.delete(player.id);
      player.triggerEvent("round_completed_dialog_event");
    }
  });

  await sleep(400);

  players.forEach(player => {
    if (player.isValid) commandsToResetPlayerData(player);
  });

  ROUND_STATE_MAP.set("ROUND_COMPLETED", false);
  ROUND_STATE_MAP.set("ROUND_STARTED", false);
}
