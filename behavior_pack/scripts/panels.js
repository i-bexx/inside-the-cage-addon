import { world, system } from "@minecraft/server";
import { ActionFormData, FormCancelationReason } from "@minecraft/server-ui";

import { votePanel } from "./voteManager";
import { getGameStartedObjective, getValueParticipant, getObjectiveScore } from "./Scoreboards";

const DIMENSION = world.getDimension("overworld");

const PANELS = [ shopPanel, votePanel, shopPanel, votePanel ];
const SHOP_ITEMS = [ "game:gun", "game:knife", "game:kit", "game:toxic_bomb", "game:ammo" ];

let timeoutId = 0;

function mainPanel(player) {
 	new ActionFormData()
    .title ("MAIN PANEL")
    .body ("")
    .button ("Shop", "textures/ui/promo_holiday_gift_small")
    .button ("Vote Manager", "textures/ui/invite_base")
    .button ("")
    .button ("")
        .show(player).then(({ cancelationReason, canceled, selection }) => {
            if (cancelationReason === FormCancelationReason.UserBusy) {
                return mainPanel(player);
            }
            if (canceled) return;

            const isGameStarted = getObjectiveScore(getGameStartedObjective(), getValueParticipant());
            if (isGameStarted == 0) {
                player.sendMessage("§c§l[!] §r§cPanel is currently locked!");
                player.playSound("note.bass");
                return;
            }

            PANELS[selection](player);
    })
}

function shopPanel(player) {
	new ActionFormData()
    .title ("SHOP")
    .body ("") 
    .button ("Gun", "textures/ui/panels/shop/gun")
    .button ("Knife", "textures/ui/panels/shop/knife")
    .button ("Kit", "textures/ui/panels/shop/kit")
    .button ("toxic_bomb", "textures/ui/panels/shop/toxic_bomb")
    .button ("Ammo", "textures/ui/panels/shop/ammo")
    .button ("Battery", "textures/ui/panels/shop/battery")
		.show(player).then(({ cancelationReason, canceled, selection }) => {
            if (cancelationReason === FormCancelationReason.UserBusy) {
                return shopPanel(player);
            }
            if (canceled) return;

				if (selection != 5) {
					player.runCommand(`give @s ${SHOP_ITEMS[selection]}`);
					return;
				}

				// --- Runs when player buys battery ---

				if (player.getDynamicProperty("batteryLevel") < 4) {
						player.setDynamicProperty("batteryIsCollected", true)
				} else {
						world.getDimension("overworld").runCommand(`say "${player.name}" Your battery is already full`)
						player.runCommand("playsound notification @s")
				}
    });
}


export function givePanelItem() {
    timeoutId = system.runTimeout(() => {
        DIMENSION.runCommand("replaceitem entity @a[tag=in_game] slot.inventory 0 minecraft:compass");
    }, 2400)
}
export function getPanelItemCountdownId() {
    return timeoutId;
}


    
world.afterEvents.itemUse.subscribe((eventData) => {
      const { source, itemStack } = eventData
      
      if (itemStack.typeId != "minecraft:compass") return;
      mainPanel(source);
})




