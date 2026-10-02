import { system } from "@minecraft/server";

import { slowUiTick } from "./slowUiTick";

const playerCompassStates = new Map();

let staminaTick = 0;
let staminaTickTimerActive = false;

// ----- MAIN FUNCTION -----

export function fastUiTick(player, playerState, isRoundCompleted, allPlayers) {
    let uiString = "";

    // Cursor state
    const cursorState = getCursorState(playerState);

    // Set UI string for cursor state
    if (cursorState.isHoldingGun) uiString = `${cursorState.cursorString}`;
    else uiString = "cursorState_zz";


    // Compass state
    const compassState = getCompassState(player, playerState);
    
    // Set UI string for compass state
    if (compassState.shouldCompassShown) {
        player.setDynamicProperty("compassShowing", true);
        playerCompassStates.set(player.id, compassState.compassString);
        uiString += `\n${compassState.compassString}`;
    }
    else uiString += "\ncompass_zz";
    

    // Stamina state
    uiString += staminaString(playerState);


    // Round complete state
    if (isRoundCompleted) uiString += "\nround_completed_x";
    else uiString += "\nround_completed_y";


    // When kit is used, sanity info updates right away
    if (player.hasTag("updateSanityUI")) {
      slowUiTick(allPlayers);
      player.removeTag("updateSanityUI");
    }

    // Set the subtitle
    player.onScreenDisplay.updateSubtitle(uiString);

  if (!staminaTickTimerActive) {
    staminaTickTimerActive = true;
    system.runTimeout(staminaTickTimer, 40);
  }
}


// -----  MAIN HELPER FUNCTIONS -----

function getCursorState(playerState) {
  const cursorState = {
    cursorString: "",
    isHoldingGun: false
  };

  // Check if player is holding the gun
  const mainHandItem = playerState.mainHand;
  cursorState.isHoldingGun = mainHandItem?.typeId === "game:gun";

  // Check if player is shooting
  const isShooting = playerState.variant == 1;

  // Set the string
  if (isShooting) cursorState.cursorString = shootingCursorString(playerState);
  else cursorState.cursorString = cursorString(playerState);

  return cursorState;
}

function getCompassState(player, playerState) {
  const compassState = {
    compassString: "",
    shouldCompassShown: true
  };

  compassState.compassString = compassString(playerState);
  compassState.shouldCompassShown = Boolean(playerCompassStates.get(player.id) !== compassState.compassString || playerState.compassShowing);

  return compassState;
}


// -----  OTHER HELPER FUNCTIONS -----

function cursorString(playerState) { return "cursorState_0" + playerState.skinId; }

function shootingCursorString(playerState) {
  return "cursorState_x" + playerState.skinId;
}

function compassString(playerState) {
  const rotation = playerState.rotation.y;
  const currentFrame = Math.floor(((rotation + 180) / 360) * 32) % 32;

  const paddedFrame = String(currentFrame).padStart(2, '0');
  let newCompassString = `compass_${paddedFrame}`;

  return newCompassString;
}

function staminaString(playerState) {
  const playerStaminaLimit = playerState.staminaLimit ?? 10;
  let playerStamina = playerState.stamina ?? 10;

  let staminaTickString = "";
  if (staminaTick % 2 == 0) staminaTickString = "§z";
  else staminaTickString = "§y";

  playerStamina = String(playerStamina).padStart(2, '0');

  if (playerStaminaLimit == 10) return `\nstamina_x${playerStamina}${staminaTickString}`;
  else if (playerStaminaLimit == 20) return `\nstamina_y${playerStamina}${staminaTickString}`;
}

function staminaTickTimer() {
  if (staminaTick % 2 == 0) staminaTick++;
  else staminaTick--;

  staminaTickTimerActive = false;
}


export function getCompassStates() { return playerCompassStates; }