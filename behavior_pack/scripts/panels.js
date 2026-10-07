import { world, system, EntityComponentTypes } from "@minecraft/server";
import { ActionFormData, ModalFormData, FormCancelationReason } from "@minecraft/server-ui";

import { getCoinAmountObjective, getSoulsFreedObjective, getValueParticipant, getObjectiveScore } from "./scoreboards";
import { pickupBattery } from "./RoundBegin/batteryController";
import { getPasswords } from "./RoundBegin/passwordManager";
import { votePanel } from "./voteManager";
import { ROUND_STATE_MAP } from "./gameStats";
import { PlayerCache } from "./Player/playerCache";

let dimension;

const MAIN_PANELS = [ shopPanel, votePanel, upgradeBattery, increaseStaminaLimit ];
const SHOP_ITEMS = { "game:gun": 4, "game:knife": 2, "game:kit": 7, "game:toxic_bomb": 6, "game:ammo": 1, "game:battery": 3, "game:cage_detector": 9 };
const ORIGINAL_PRICES = [ 4, 2, 7, 6, 1, 3, 9 ];

const ITEMS_NOT_ALLOWED_WHEN_CAM_IS_WORKING = new Set(["game:gun", "game:knife", "game:toxic_bomb", "game:ammo"]);

let timeoutId = undefined;

// --- PASSWORD PANEL ---

function customPanel(player) {
    new ModalFormData()
    .title("PASSWORD PANEL")
    .textField("First Password", "Type here...")
    .textField("Second Password", "Type here...")
    .submitButton("Submit")
        .show(player).then(({ cancelationReason, canceled, formValues }) => {
            if (cancelationReason === FormCancelationReason.UserBusy) return;
            if (canceled) return;

           const isGameStarted = ROUND_STATE_MAP.get("ROUND_STARTED");
            if (isGameStarted == 0) {
                player.sendMessage(" §6[§e!§6] §c§lPanel is currently locked!");
                player.playSound("note.bass");
                return;
            }

            const firstPassword = getPasswords()[0];
            const secondPassword = getPasswords()[1];

            const firstPasswordInput = formValues[0];
            const secondPasswordInput = formValues[1];
            
            if (firstPasswordInput === firstPassword && secondPasswordInput === secondPassword) {
                player.playSound("random.orb");
                // FUNCTION
            } else {
                player.sendMessage(" §c[!] Incorrect Password!");
                player.playSound("note.bass");
            }
    })
}

// --- MAIN PANELS ---

function mainPanel(player) {
 	new ActionFormData()
    .title("MAIN PANEL")
    .body("")
    .button("Shop", "textures/ui/promo_holiday_gift_small")
    .button("Vote Manager", "textures/ui/panels/main_panel/icons/vote")
    .button("Upgrade Battery", "textures/ui/panels/main_panel/icons/battery_upgrade")
    .button("Upgrade Stamina", "textures/ui/panels/main_panel/icons/stamina_limit_increase")
        .show(player).then(({ cancelationReason, canceled, selection }) => {
            if (cancelationReason === FormCancelationReason.UserBusy) return;
            if (canceled) return;

            const isGameStarted = ROUND_STATE_MAP.get("ROUND_STARTED");
            if (isGameStarted == 0) {
                player.sendMessage(" §6[§e!§6] §c§lPanel is currently locked!");
                player.playSound("note.bass");
                return;
            }

            MAIN_PANELS[selection](player);
    })
}

function shopPanel(player) {
    const itemsObject = { ...SHOP_ITEMS };
    hasItem(itemsObject, "checkAllNecessaryItems", player);

    const getText = (val) => (itemsObject[val] === "§l§7Not Sale") ? itemsObject[val] : itemsObject[val] + " Coins";

	new ActionFormData()
    .title("SHOP")
    .body("") 
    .button(`Gun-${getText("game:gun")}`, "textures/ui/panels/shop/gun")
    .button(`Knife-${getText("game:knife")}`, "textures/ui/panels/shop/knife")
    .button(`Kit-${itemsObject["game:kit"]} Coins`, "textures/ui/panels/shop/kit")
    .button(`toxic_bomb-${itemsObject["game:toxic_bomb"]} Coins`, "textures/ui/panels/shop/toxic_bomb")
    .button(`Ammo-${itemsObject["game:ammo"]} Coins`, "textures/ui/panels/shop/ammo")
    .button(`Battery-${itemsObject["game:battery"]} Coins`, "textures/ui/panels/shop/battery")
    .button(`Detector-${getText("game:cage_detector")}`, "textures/ui/panels/shop/cage_detector")
    .button(`...`, "")
    .button(`...`, "")
		.show(player).then(({ cancelationReason, canceled, selection }) => {
            if (cancelationReason === FormCancelationReason.UserBusy) return;
            if (canceled || [7, 8].includes(selection)) return;

            const coinAmount = getObjectiveScore(getCoinAmountObjective(), player.scoreboardIdentity);
            const soulsFreedValue = getObjectiveScore(getSoulsFreedObjective(), getValueParticipant());

						const [itemName, itemCost] = Object.entries(itemsObject)[selection] || [];

                        if (ITEMS_NOT_ALLOWED_WHEN_CAM_IS_WORKING.has(itemName) && (soulsFreedValue != 4 && soulsFreedValue != 5)) {
                            player.sendMessage(" §6[§e!§6] §cYou can't buy this item right now");
                            player.playSound("note.bass");
                            return;
                        }

                        const isAlreadyOwned = hasItem(itemsObject, itemName, player);

                        if (isAlreadyOwned) {
                            player.sendMessage(" §6[§e!§6] §cYou can't buy this item twice");
                            player.playSound("note.bass");
                            return;
                        }

						if (coinAmount >= itemCost) {
							let transactionSuccessful = false;

							if (itemName !== "game:battery") {
									player.runCommand(`give @s ${itemName} 1 0 {"minecraft:item_lock": {"mode": "lock_in_inventory"}}`);
                                    if (itemName == "game:gun")
                                        player.runCommand(`give @s game:ammo_shoot 10 0 {"minecraft:item_lock": {"mode": "lock_in_inventory"}}`);
									transactionSuccessful = true;
							} else if (player.getDynamicProperty("batteryLevel") < 4) {
                                    player.setDynamicProperty("batteryIsCollected", true);
                                    pickupBattery(player, undefined);
									transactionSuccessful = true;
							} else {
									player.sendMessage(" §6[§e!§6] §cYour battery is already full");
									player.runCommand("playsound notification @s");
							}

							if (transactionSuccessful) {
									player.runCommand(`xp -${itemCost}L @s`);
									player.runCommand(`scoreboard players remove @s coin_amount ${itemCost}`);
							}
					} else {
							player.sendMessage(" §6[§e!§6] §cYou don't have enough coins!");
							player.playSound("note.bass");
					}
						return;
    });
}

function upgradeBattery(player) {
    const coinAmount = getObjectiveScore(getCoinAmountObjective(), player.scoreboardIdentity);
    const hasUpgraded = player.getDynamicProperty("batteryIsUpgraded");

    if (hasUpgraded) {
        player.sendMessage(" §6[§e!§6] §cYou already have this feat!");
		player.playSound("note.bass");
        return;
    }

    if (coinAmount < 7) {
        player.sendMessage(" §6[§e!§6] §cYou need 7 coins!");
		player.playSound("note.bass");
        return;
    }
    player.setDynamicProperty("batteryIsUpgraded", true);
    player.sendMessage(" §6[§e!§6] §aBattery efficiency upgraded!");
    player.playSound("random.levelup");

    player.runCommand(`xp -7L @s`);
	player.runCommand(`scoreboard players remove @s coin_amount 7`);
    return;
}

function increaseStaminaLimit(player) {
    const coinAmount = getObjectiveScore(getCoinAmountObjective(), player.scoreboardIdentity);
    const cache = PlayerCache.get(player.id);
    const staminaLimit = cache ? cache.staminaLimit : 10;

    if (staminaLimit > 10) {
        player.sendMessage(" §6[§e!§6] §cYou already have this feat!");
		player.playSound("note.bass");
        return;
    }

    if (coinAmount < 7) {
        player.sendMessage(" §6[§e!§6] §cYou need 7 coins!");
		player.playSound("note.bass");
        return;
    }
    if (cache) cache.staminaLimit = 20;
    player.sendMessage(" §6[§e!§6] §aStamina upgraded!");
    player.playSound("random.levelup");

    player.runCommand(`xp -7L @s`);
	player.runCommand(`scoreboard players remove @s coin_amount 7`);
    return;
}

function hasItem(itemsObject, itemTypeId, player) {
    if (itemTypeId == "checkAllNecessaryItems") {
        const container = player.getComponent(EntityComponentTypes.Inventory).container;
        const itemsToCheck = ["game:gun", "game:knife", "game:cage_detector"];

        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);

            if (item && itemsToCheck.includes(item.typeId)) itemsObject[item.typeId] = "§l§7Not Sale";
        }
        return;
    }
    if (itemsObject[itemTypeId] == "§l§7Not Sale") return true;
    else return false;
}

    
world.afterEvents.itemUse.subscribe((eventData) => {
      const { source, itemStack } = eventData
      
      if (itemStack.typeId == "minecraft:compass") mainPanel(source);
      else if (itemStack.typeId == "minecraft:gold_ingot") customPanel(source);

      else if (itemStack.typeId == "game:discount_ticket") {
        for (const [key, value] of Object.entries(SHOP_ITEMS)) {
            const newCost = Math.max(1, Math.ceil(value / 2));
            SHOP_ITEMS[key] = newCost;
        }
        source.runCommand("clear @s game:discount_ticket");
      }
})

export function givePanelItem() {
    if (timeoutId !== undefined) return;
    
    timeoutId = system.runTimeout(() => {
        dimension.runCommand(`replaceitem entity @a[tag=in_game] slot.inventory 0 minecraft:compass 1 0 {"minecraft:item_lock": {"mode": "lock_in_inventory"}}`);
    }, 2400)
}

export function stopGivePanelItem() {
    if (timeoutId === undefined) return;
    system.clearRun(timeoutId);
    timeoutId = undefined;
}

export function resetPrices() {
    const keys = Object.keys(SHOP_ITEMS);
    for (let i = 0; i < keys.length; i++) {
        SHOP_ITEMS[keys[i]] = ORIGINAL_PRICES[i];
    }
}

export function setGlobalVariables() { dimension = world.getDimension("overworld"); }