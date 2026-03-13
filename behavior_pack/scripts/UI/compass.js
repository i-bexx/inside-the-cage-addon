import { world, system } from "@minecraft/server";

const playerCompassStates = new Map();

function compass() {
  const players = world.getPlayers();

  for (const player of players) {
    const rotation = player.getRotation().y;
    const currentFrame = Math.floor(((rotation + 180) / 360) * 32) % 32;
    const newCompassString = `compass_${currentFrame}`;

    if (playerCompassStates.get(player.id) !== newCompassString) {
        
        player.onScreenDisplay.updateSubtitle(newCompassString);
        
        playerCompassStates.set(player.id, newCompassString);
    }
  }
}

system.runInterval(compass, 2);