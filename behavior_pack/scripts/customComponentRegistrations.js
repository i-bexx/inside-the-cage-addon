import { system } from "@minecraft/server";

import { skipCutscene } from "./preStart";
import { openNotificationPanel } from "./voteManager";
import { cameraUsed, cameraDeactivated } from "./cameraUsage";
import { gunShooting } from "./RoundBegin/weaponController";
import { openCageDetector } from "./RoundBegin/cageDetector";

// ==========================================
// ITEM COMPONENTS
// ==========================================

const ITEM_COMPONENTS = {
  "ibexx_itc:detect_cages":       { onUse: ({ source }) => openCageDetector(source) },
  "ibexx_itc:toggle_camera_on":   { onUse: ({ source }) => cameraUsed(source) },
  "ibexx_itc:toggle_camera_off":  { onUse: ({ source }) => cameraDeactivated(source) },
  "ibexx_itc:shoot_gun":          { onUse: ({ source }) => gunShooting(source) },
  "ibexx_itc:skip_request":       { onUse: ({ source }) => skipCutscene(source) },
  "ibexx_itc:confirm_restart":    { onUse: ({ source, itemStack }) => openNotificationPanel(source, itemStack) },
  "ibexx_itc:confirm_end_round":  { onUse: ({ source, itemStack }) => openNotificationPanel(source, itemStack) }
};

// ==========================================
// REGISTRATION
// ==========================================

function itemRegistration({ itemComponentRegistry }) {
  for (const [componentId, component] of Object.entries(ITEM_COMPONENTS))
    itemComponentRegistry.registerCustomComponent(componentId, component);
}

system.beforeEvents.startup.subscribe(itemRegistration);