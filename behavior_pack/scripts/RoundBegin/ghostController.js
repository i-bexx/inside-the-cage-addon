import { world, Difficulty } from "@minecraft/server";

export function startDifficultyMonitor(inGamePlayers) {
  const difficulty = world.getDifficulty();

    if (difficulty != Difficulty.Peaceful) return;

    for (const player of inGamePlayers)
      player.onScreenDisplay.setActionBar("The difficulty has been set to peaceful; you may yet continue, but no ghost shall spawn.");
}

export function stopDifficultyMonitor() {
    world.setDifficulty(Difficulty.Peaceful);
}

world.afterEvents.entityHitEntity.subscribe(({ damagingEntity, hitEntity }) => {
  if (damagingEntity.typeId != "game:ghost") return;

  hitEntity.runCommand("scoreboard players remove @s Sanity 1");
})