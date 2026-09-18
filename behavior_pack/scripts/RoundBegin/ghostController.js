import { world, system, Difficulty } from "@minecraft/server";

let hasWarnedPlayers = false;
let intervalId = undefined;

export function startDifficultyMonitor() {
  if (intervalId !== undefined) return;
  
  world.setDifficulty(Difficulty.Hard);

  intervalId = system.runInterval(() => {
    const difficulty = world.getDifficulty();

    if (difficulty != Difficulty.Peaceful || hasWarnedPlayers) return;

    const players = world.getPlayers({ tags: ["in_game"] });

    for (const player of players)
      player.onScreenDisplay.setActionBar("The difficulty has been set to peaceful; you may yet continue, but no ghost shall spawn.");
    hasWarnedPlayers = true;
  }, 40);
}

export function stopDifficultyMonitor() {
    if (intervalId === undefined) return;

    system.clearRun(intervalId);
    intervalId = undefined;

    world.setDifficulty(Difficulty.Peaceful);
    hasWarnedPlayers = false;
}