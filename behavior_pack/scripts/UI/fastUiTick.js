import { world, system, EquipmentSlot } from "@minecraft/server";

import { slowUiTick } from "./slowUiTick";
import { getStaminaObjective, getStaminaLimitObjective, getObjectiveScore } from "../scoreboards";

const playerCompassStates = new Map();
let staminaTick = 0;

// ----- MAIN FUNCTION -----

function fastUiTick() {
  const players = world.getPlayers();

  for (const player of players) {
    let cursorState;

    const isShooting = player.getComponent("variant").value == 5;
    const compassState = compassString(player);

    if (isShooting) cursorState = shootingCursorString(player);
    else cursorState = cursorString(player);

    // Check if player is holding the gun
    const equippable = player.getComponent("minecraft:equippable");
    const mainHandItem = equippable.getEquipment(EquipmentSlot.Mainhand);
    const isHoldingGun = mainHandItem?.typeId === "game:gun";

    // ----- STAMINA INFO -----
    const staminaObjective = getStaminaObjective();
    const staminaLimitObjective = getStaminaLimitObjective();
    const playerStamina = getObjectiveScore(staminaObjective, player.scoreboardIdentity) ?? 10;
    const playerStaminaLimit = getObjectiveScore(staminaLimitObjective, player.scoreboardIdentity) ?? 10;

    let uiString = "";
    let staminaTickString = "";

    if (isHoldingGun) uiString = `${cursorState}`;
    else uiString = "cursorState_zz";

    const shouldCompassShown = playerCompassStates.get(player.id) !== compassState || player.getDynamicProperty("compassShowing");
    
    if (shouldCompassShown) {
        player.setDynamicProperty("compassShowing", true);
        playerCompassStates.set(player.id, compassState);
        uiString += ` ${compassState}`;
    } else {
      uiString += " compass_zz";
    }

    if (staminaTick % 2 == 0) staminaTickString = "§z";
    else staminaTickString = "§y";

    if (playerStaminaLimit == 10) uiString += ` stamina_x${playerStamina}${staminaTickString}`;
    else if (playerStaminaLimit == 20) uiString += ` stamina_y${playerStamina}${staminaTickString}`;


    player.onScreenDisplay.updateSubtitle(uiString);

    if (player.hasTag("updateSanityUI")) { // When kit is used, sanity info updates right away
      slowUiTick();
      player.removeTag("updateSanityUI");
    }
  }
  if (staminaTick % 2 == 0) staminaTick++;
    else staminaTick--;
}

// ----- HELPER FUNCTIONS -----

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

export function getCompassStates() {
  return playerCompassStates;
}

// ----- RUN MAIN FUNCTION -----

system.runInterval(fastUiTick, 2);