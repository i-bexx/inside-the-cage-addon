import { world, system } from "@minecraft/server";
import { ActionFormData, FormCancelationReason } from "@minecraft/server-ui";

import { votePanel } from "./voteManager";
import { getGameStartedObjective, getCoinAmountObjective, getStaminaLimitObjective, getValueParticipant, getObjectiveScore } from "./Scoreboards";

const DIMENSION = world.getDimension("overworld");

const PANELS = [ shopPanel, votePanel, shopPanel, increaseStaminaLimit ];
const SHOP_ITEMS = { "game:gun": 4, "game:knife": 2, "game:kit": 7, "game:toxic_bomb": 6, "game:ammo": 1, "battery": 3 };

let timeoutId = 0;

function mainPanel(player) {
 	new ActionFormData()
    .title ("MAIN PANEL")
    .body ("")
    .button ("Shop", "textures/ui/promo_holiday_gift_small")
    .button ("Vote Manager", "textures/ui/invite_base")
    .button ("")
    .button ("Upgrade Stamina", "textures/ui/panels/main_panel/icons/stamina_limit_increase")
        .show(player).then(({ cancelationReason, canceled, selection }) => {
            if (cancelationReason === FormCancelationReason.UserBusy) {
                return mainPanel(player);
            }
            if (canceled) return;

            const isGameStarted = getObjectiveScore(getGameStartedObjective(), getValueParticipant());
            if (isGameStarted == 0) {
                player.sendMessage(" §6[§e!§6] §c§lPanel is currently locked!");
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

            const coinAmount = getObjectiveScore(getCoinAmountObjective(), player.scoreboardIdentity);

						const [itemName, itemCost] = Object.entries(SHOP_ITEMS)[selection] || [];

						if (coinAmount >= itemCost) {
							let transactionSuccessful = false;

							if (itemName !== "battery") {
									player.runCommand(`give @s ${itemName}`);
									transactionSuccessful = true;
							} else if (player.getDynamicProperty("batteryLevel") < 4) {
									player.setDynamicProperty("batteryIsCollected", true);
									transactionSuccessful = true;
							} else {
									player.sendMessage(" §6[§e!§6] §cYour battery is already full");
									player.runCommand("playsound notification @s");
							}

							if (transactionSuccessful) {
									player.runCommand(`xp -${itemCost} @s`);
									player.runCommand(`scoreboard players remove @s coin_amount ${itemCost}`);
							}
					} else {
							player.sendMessage(" §6[§e!§6] §cYou don't have enough coins!");
							player.playSound("note.bass");
					}
						return;
    });
}

function increaseStaminaLimit(player) {
    const coinAmount = getObjectiveScore(getCoinAmountObjective(), player.scoreboardIdentity);
    const staminaLimit = getObjectiveScore(getStaminaLimitObjective(), player.scoreboardIdentity);

    if (staminaLimit > 10) {
        player.sendMessage(" §6[§e!§6] §cYou already have this feat!");
		player.playSound("note.bass");
        return;
    }

    if (coinAmount >= 7) {
        player.runCommand("scoreboard players set @s stamina_limit 20");
        player.runCommand(`xp -7 @s`);
		player.runCommand(`scoreboard players remove @s coin_amount 7`);
    } else {
        player.sendMessage(" §6[§e!§6] §cYou need 7 coins!");
		player.playSound("note.bass");
    }
    return;
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




