import { world, system } from "@minecraft/server";

const playerCompassStates = new Map();

function compassUI() {
  const players = world.getPlayers();

  for (const player of players) {
    const rotation = player.getRotation().y;
    const currentFrame = Math.floor(((rotation + 180) / 360) * 32) % 32;

    const paddedFrame = String(currentFrame).padStart(2, '0');
    const newCompassString = `compass_${paddedFrame}`;
    
    if (playerCompassStates.get(player.id) !== newCompassString) {
        player.onScreenDisplay.updateSubtitle(newCompassString);
        playerCompassStates.set(player.id, newCompassString);
    }
  }
}

system.runInterval(compassUI, 2);