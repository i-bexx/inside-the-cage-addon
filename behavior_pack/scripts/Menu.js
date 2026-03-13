import { world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData, FormCancelationReason } from "@minecraft/server-ui";

function showMenu(player) {
    new ActionFormData()
    .title("SHOP")
    .body("Testing action form")
    .button("Gun")
    .button("Knife")
    .button("Kit")
    .button("Toxic bomb")
    .button("Ammo")
    .button("Battery")
    .show(player).then(({ cancelationReason, canceled, selection }) => {
        if (cancelationReason === FormCancelationReason.UserBusy) {
            return showMenu(player);
        }
        if (canceled) return;
        if (selection == 0) {
            player.runCommand("give @s game:gun")
        } else if (selection == 1) {
            player.runCommand("give @s game:knife")
        } else if (selection == 2) {
            player.runCommand("give @s game:kit")
        } else if (selection == 3) {
            player.runCommand("give @s game:toxic_bomb")
        } else if (selection == 4) {
            player.runCommand("give @s game:ammo")
        } else if (selection == 5) {
            if (player.getDynamicProperty("batteryLevel") < 4) {
                player.setDynamicProperty("batteryIsCollected", true)
            } else {
                world.getDimension("overworld").runCommand(`say "${player.name}" Your battery is already full`)
                player.runCommand("playsound notification @s")
            }
        }
    })
}

world.afterEvents.itemUse.subscribe((event) => {

    const { itemStack, source } = event
    if (itemStack.typeId == "game:shop") {
        showMenu(source);
    } else if (itemStack.typeId == "minecraft:iron_ingot") {
        MessageForm()
    }
})

