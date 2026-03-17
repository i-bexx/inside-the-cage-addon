import { world, system } from "@minecraft/server";

const playerCompassStates = new Map();

// ----- MAIN FUNCTION -----

function fastUiTick() {
  const players = world.getPlayers();

  for (const player of players) {
    const cursorState = cursorString(player);
    const compassState = compassString(player);

    let uiString = `${cursorState}`;

    const shouldCompassShown = playerCompassStates.get(player.id) !== compassState || player.getDynamicProperty("compassShowing")
    
    if (shouldCompassShown) {
        player.setDynamicProperty("compassShowing", true);
        playerCompassStates.set(player.id, compassState);

        uiString += ` ${compassState}`;
    }
    player.onScreenDisplay.updateSubtitle(uiString);
  }
}

// ----- HELPER FUNCTIONS -----

function cursorString(player) {
  return "cursorState_0" + player.getComponent("skin_id").value.toString();
}

function compassString(player) {
  const rotation = player.getRotation().y;
  const currentFrame = Math.floor(((rotation + 180) / 360) * 32) % 32;

  const paddedFrame = String(currentFrame).padStart(2, '0');
  let newCompassString = `compass_${paddedFrame}`;

  return newCompassString;
}

// ----- RUN MAIN FUNCTION -----

system.runInterval(fastUiTick, 2);