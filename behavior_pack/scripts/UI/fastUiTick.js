import { system } from "@minecraft/server";

const playerCompassStates = new Map();
const LAST_SUBTITLE_MAP = new Map();
export const COMPASS_SHOWING_SET = new Set();

let staminaTick = 0;
let staminaTickTimerActive = false;

// ----- MAIN FUNCTION -----

export function fastUiTick(player, playerState, isRoundCompleted) {
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
        COMPASS_SHOWING_SET.add(player.id);
        playerCompassStates.set(player.id, compassState.compassString);
        uiString += `\n${compassState.compassString}`;
    }
    else uiString += "\ncompass_zz";
    

    // Stamina state
    uiString += staminaString(playerState);


    // Round complete state
    if (isRoundCompleted) uiString += "\nround_completed_x";
    else uiString += "\nround_completed_y";

    // Set the subtitle only if it has changed
    if (LAST_SUBTITLE_MAP.get(player.id) !== uiString) {
        LAST_SUBTITLE_MAP.set(player.id, uiString);
        player.onScreenDisplay.updateSubtitle(uiString);
    }

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
  cursorState.isHoldingGun = playerState.mainHandTypeId === "game:gun";

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

  compassState.compassString = compassString(player);
  compassState.shouldCompassShown = Boolean(playerCompassStates.get(player.id) !== compassState.compassString || playerState.compassShowing);

  return compassState;
}


// -----  OTHER HELPER FUNCTIONS -----

function cursorString(playerState) { return "cursorState_0" + playerState.skinId; }

function shootingCursorString(playerState) {
  return "cursorState_x" + playerState.skinId;
}

function compassString(player) {
  const rotation = player.getRotation();
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