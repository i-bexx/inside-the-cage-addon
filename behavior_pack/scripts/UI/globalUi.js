import { world } from "@minecraft/server";

import { slowUiTick } from "./slowUiTick";

export function updateGlobalUi() {
  const dimension = world.getDimension("overworld");
  const showPositionObjective = world.scoreboard.getObjective("show_position");
  const shoulsFreedObjective = world.scoreboard.getObjective("souls_freed");
  const valueParticipant = world.scoreboard.getParticipants().find(p => p.displayName === "value");

  const soulsFreedNumber = shoulsFreedObjective.getScore(valueParticipant);
  const showPosition = showPositionObjective.getScore(valueParticipant);

  dimension.runCommand(`scoreboard players set value global_ui ${soulsFreedNumber}${showPosition}`);
  slowUiTick(); // Force an immediate update for sanity stats and notifications without waiting for the next loop tick.
}