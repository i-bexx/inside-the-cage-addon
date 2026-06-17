import { world } from "@minecraft/server";
import { ActionFormData, FormCancelationReason } from "@minecraft/server-ui";

world.afterEvents.itemUse.subscribe(({itemStack, source}) => {
  if (itemStack.typeId != "game:cage_detector") return;

  openCageDetector(source);
})

function openCageDetector(player) {
  new ActionFormData()
  .title("cage_detector_panel")
  .body("body")
  .button("button1")
  .button("button2")
  .button("button3")
  .button("button4")
  .show(player).then(({ cancelationReason, canceled }) => {
    if (cancelationReason === FormCancelationReason.UserBusy || canceled) {
            return;
    }
  });
}