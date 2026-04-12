import { world, system, EquipmentSlot } from "@minecraft/server";

import { slowUiTick } from "./slowUiTick";
import { getStaminaObjective, getStaminaLimitObjective, getObjectiveScore } from "../scoreboards";

const playerCompassStates = new Map();
let staminaTick = 0;
let staminaTickTimerActive = false;

// ----- MAIN FUNCTION -----

function fastUiTick() {
  const players = world.getPlayers();

  for (const player of players) {
    let uiString = "";


    // Cursor state
    const cursorState = getCursorState(player);

    // Set UI string for cursor state
    if (cursorState.isHoldingGun) uiString = `${cursorState.cursorString}`;
    else uiString = "cursorState_zz";


    // Compass state
    const compassState = getCompassState(player);
    
    // Set UI string for compass state
    if (compassState.shouldCompassShown) {
        player.setDynamicProperty("compassShowing", true);
        playerCompassStates.set(player.id, compassState.compassString);
        uiString += ` ${compassState.compassString}`;
    }
    else uiString += " compass_zz";
    

    // Stamina state
    const staminaState = staminaString(player);

    // Set UI string for stamina state
    uiString += staminaState;


    // When kit is used, sanity info updates right away
    if (player.hasTag("updateSanityUI")) {
      slowUiTick();
      player.removeTag("updateSanityUI");
    }


    // Set the subtitle
    player.onScreenDisplay.updateSubtitle(uiString);
  }
  if (!staminaTickTimerActive) {
    staminaTickTimerActive = true;
    system.runTimeout(staminaTickTimer, 40);
  }
}


// -----  MAIN HELPER FUNCTIONS -----

function getCursorState(player) {
  const cursorState = {
    cursorString: "",
    isHoldingGun: false
  };

  // Check if player is holding the gun
  const equippable = player.getComponent("minecraft:equippable");
  const mainHandItem = equippable.getEquipment(EquipmentSlot.Mainhand);
  cursorState.isHoldingGun = mainHandItem?.typeId === "game:gun";

  // Check if player is shooting
  const isShooting = player.getComponent("variant").value == 5;

  // Set the string
  if (isShooting) cursorState.cursorString = shootingCursorString(player);
  else cursorState.cursorString = cursorString(player);

  return cursorState;
}

function getCompassState(player) {
  const compassState = {
    compassString: "",
    shouldCompassShown: true
  };

  compassState.compassString = compassString(player);
  compassState.shouldCompassShown = Boolean(playerCompassStates.get(player.id) !== compassState.compassString || player.getDynamicProperty("compassShowing"));

  return compassState;
}


// -----  OTHER HELPER FUNCTIONS -----

function cursorString(player) {
  return "cursorState_0" + player.getComponent("skin_id").value.toString();
}

function shootingCursorString(player) {
  return "cursorState_x" + player.getComponent("skin_id").value.toString();
}

function compassString(player) {
  const rotation = player.getRotation().y;
  const currentFrame = Math.floor(((rotation + 180) / 360) * 32) % 32;

  const paddedFrame = String(currentFrame).padStart(2, '0');
  let newCompassString = `compass_${paddedFrame}`;

  return newCompassString;
}

function staminaString(player) {
  const staminaObjective = getStaminaObjective();
  const staminaLimitObjective = getStaminaLimitObjective();
  const playerStaminaLimit = getObjectiveScore(staminaLimitObjective, player.scoreboardIdentity) ?? 10;
  let playerStamina = getObjectiveScore(staminaObjective, player.scoreboardIdentity) ?? 10;

  let staminaTickString = "";
  if (staminaTick % 2 == 0) staminaTickString = "§z";
  else staminaTickString = "§y";

  playerStamina = String(playerStamina).padStart(2, '0');

  if (playerStaminaLimit == 10) return ` stamina_x${playerStamina}${staminaTickString}`;
  else if (playerStaminaLimit == 20) return ` stamina_y${playerStamina}${staminaTickString}`;
}

function staminaTickTimer() {
  if (staminaTick % 2 == 0) staminaTick++;
  else staminaTick--;

  staminaTickTimerActive = false;
}


export function getCompassStates() {
  return playerCompassStates;
}

// ----- RUN MAIN FUNCTION -----

system.runInterval(fastUiTick, 2);