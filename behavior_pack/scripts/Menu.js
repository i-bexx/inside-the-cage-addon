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

function MessageForm() {
    const players = world.getPlayers();
    new MessageFormData()
    .title("Test GUI")
    .body("Testing action form")
    .button1("Warps")
    .button2("Kill all")
    .show(players[0]).then(({ cancelationReason, canceled, selection }) => {
        if (cancelationReason === FormCancelationReason.UserBusy) {
            return showMenu(players[0]);
        }
        if (canceled) return;

        switch (selection) {
            case 0 : return MessageForm(players[0]);
            case 1 : world.getPlayers().forEach((p) => p.kill());
            break;
        }
    })
}

function ModalForm() {
    const players = world.getPlayers();
    new ModalFormData()
    .title("Test GUI")
    .textField("Enter name", "name", "stuppid ass nig")
    .dropdown("Select item", ["item1", "item2", "item3"], 2)
    .slider("Select number", 1, 10, 2, 6)
    .toggle("Select toggle", true)
    .submitButton("OK")
    .show(players[0]).then(({ cancelationReason, canceled, formValues }) => {

        if (cancelationReason === FormCancelationReason.UserBusy) {
            return ModalForm(players[0]);
        }
        if(canceled) return;
        players[0].sendMessage(`Modal form results: ${JSON.stringify(formValues, undefined, 2)}`);
    })
}

world.afterEvents.itemUse.subscribe((event) => {

    const { itemStack, source } = event
    if (itemStack.typeId == "game:shop") {
        showMenu(source);
    } else if (itemStack.typeId == "minecraft:iron_ingot") {
        MessageForm()
    } else if (itemStack.typeId == "minecraft:gold_ingot") {
        ModalForm()
    }
})

