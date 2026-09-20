import { world, system, Difficulty } from "@minecraft/server";

let intervalId = undefined;

export function startDifficultyMonitor() {
  if (intervalId !== undefined) return;
  
  world.setDifficulty(Difficulty.Normal);

  intervalId = system.runInterval(() => {
    const difficulty = world.getDifficulty();

    if (difficulty != Difficulty.Peaceful) return;

    const players = world.getPlayers({ tags: ["in_game"] });

    for (const player of players)
      player.onScreenDisplay.setActionBar("The difficulty has been set to peaceful; you may yet continue, but no ghost shall spawn.");
    system.clearRun(intervalId);
  }, 40);
}

export function stopDifficultyMonitor() {
    if (intervalId === undefined) return;

    system.clearRun(intervalId);
    intervalId = undefined;

    world.setDifficulty(Difficulty.Peaceful);
}

world.afterEvents.entityHitEntity.subscribe(({ damagingEntity, hitEntity }) => {
  if (damagingEntity.typeId != "game:ghost") return;

  hitEntity.runCommand("scoreboard players remove @s Sanity 1");
})