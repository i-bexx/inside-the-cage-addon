import { world, system } from "@minecraft/server";
import { ItemStack, ItemLockMode, EntityComponentTypes, EquipmentSlot } from "@minecraft/server";
import { ActionFormData, ModalFormData, FormCancelationReason } from "@minecraft/server-ui";

import { getCoinAmountObjective, getSoulsFreedObjective, getValueParticipant, getObjectiveScore } from "./scoreboards";
import { pickupBattery } from "./RoundBegin/batteryController";
import { getPasswords, passwordEnteredCorrect } from "./RoundBegin/passwordManager";
import { votePanel } from "./voteManager";
import { ROUND_STATE_MAP } from "./gameStats";
import { PlayerCache } from "./Player/playerCache";

const MAIN_PANELS = [ shopPanel, votePanel, upgradeBattery, increaseStaminaLimit ];

const DEFAULT_PRICES = {
    "ibexx_itc:gun": 4,
    "ibexx_itc:knife": 2,
    "ibexx_itc:kit": 7,
    "ibexx_itc:toxic_bomb": 6,
    "ibexx_itc:ammo": 1,
    "ibexx_itc:battery": 3,
    "ibexx_itc:cage_detector": 9
};
let shopPrices = { ...DEFAULT_PRICES };

const UNIQUE_SHOP_ITEMS = new Set(["ibexx_itc:gun", "ibexx_itc:knife", "ibexx_itc:cage_detector"]);
const ITEMS_NOT_ALLOWED_WHEN_CAM_IS_WORKING = new Set(["ibexx_itc:gun", "ibexx_itc:knife", "ibexx_itc:toxic_bomb", "ibexx_itc:ammo"]);

let timeoutId = undefined;

// --- EVENTS ---

world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
    if (itemStack.typeId === "minecraft:compass") mainPanel(source);
    else if (itemStack.typeId === "ibexx_itc:discount_ticket") {
        for (const [key, value] of Object.entries(shopPrices)) {
            shopPrices[key] = Math.max(1, Math.ceil(value / 2));
        }
        source.getComponent(EntityComponentTypes.Equippable).setEquipment(EquipmentSlot.Mainhand, undefined);
    }
});

world.afterEvents.playerInteractWithEntity.subscribe(({ player, target }) => {
    if (target.typeId !== "ibexx_itc:computer_desk") return;
    customPanel(player);
});

// --- PASSWORD PANEL ---

async function customPanel(player) {
    const { cancelationReason, canceled, formValues } = await new ModalFormData()
        .title("PASSWORD PANEL")
        .textField("First Password", "Type here...")
        .textField("Second Password", "Type here...")
        .submitButton("Submit")
        .show(player);

    if (canceled || cancelationReason === FormCancelationReason.UserBusy) return;

    const [firstPassword, secondPassword] = getPasswords();
    const [firstPasswordInput, secondPasswordInput] = formValues;

    if (firstPasswordInput === firstPassword && secondPasswordInput === secondPassword) {
        passwordEnteredCorrect(player);
    } else {
        notifyError(player, " §c[!] Incorrect Password!");
    }
}

// --- MAIN PANELS ---

async function mainPanel(player) {
    const { cancelationReason, canceled, selection } = await new ActionFormData()
        .title("MAIN PANEL")
        .body("")
        .button("Shop", "textures/ui/promo_holiday_gift_small")
        .button("Vote Manager", "textures/ui/panels/main_panel/icons/vote")
        .button("Upgrade Battery", "textures/ui/panels/main_panel/icons/battery_upgrade")
        .button("Upgrade Stamina", "textures/ui/panels/main_panel/icons/stamina_limit_increase")
        .show(player);

    if (canceled || cancelationReason === FormCancelationReason.UserBusy) return;

    if (!ROUND_STATE_MAP.get("ROUND_STARTED")) {
        return notifyError(player, " §6[§e!§6] §c§lPanel is currently locked!");
    }

    MAIN_PANELS[selection](player);
}

async function shopPanel(player) {
    const ownedItems = getOwnedUniqueItems(player);
    const getPriceLabel = (id) => ownedItems.has(id) ? "§l§7Not Sale" : `${shopPrices[id]} Coins`;

    const { cancelationReason, canceled, selection } = await new ActionFormData()
        .title("SHOP")
        .body("")
        .button(`Gun-${getPriceLabel("ibexx_itc:gun")}`, "textures/ui/panels/shop/gun")
        .button(`Knife-${getPriceLabel("ibexx_itc:knife")}`, "textures/ui/panels/shop/knife")
        .button(`Kit-${getPriceLabel("ibexx_itc:kit")}`, "textures/ui/panels/shop/kit")
        .button(`toxic_bomb-${getPriceLabel("ibexx_itc:toxic_bomb")}`, "textures/ui/panels/shop/toxic_bomb")
        .button(`Ammo-${getPriceLabel("ibexx_itc:ammo")}`, "textures/ui/panels/shop/ammo")
        .button(`Battery-${getPriceLabel("ibexx_itc:battery")}`, "textures/ui/panels/shop/battery")
        .button(`Detector-${getPriceLabel("ibexx_itc:cage_detector")}`, "textures/ui/panels/shop/cage_detector")
        .button("...", "")
        .button("...", "")
        .show(player);

    if (canceled || cancelationReason === FormCancelationReason.UserBusy || [7, 8].includes(selection)) return;

    const [itemName, itemCost] = Object.entries(shopPrices)[selection] || [];
    const coinAmount = getObjectiveScore(getCoinAmountObjective(), player.scoreboardIdentity);
    const soulsFreedValue = getObjectiveScore(getSoulsFreedObjective(), getValueParticipant());

    if (ITEMS_NOT_ALLOWED_WHEN_CAM_IS_WORKING.has(itemName) && soulsFreedValue !== 4 && soulsFreedValue !== 5) {
        return notifyError(player, " §6[§e!§6] §cYou can't buy this item right now");
    }
    if (ownedItems.has(itemName)) {
        return notifyError(player, " §6[§e!§6] §cYou can't buy this item twice");
    }
    if (coinAmount < itemCost) {
        return notifyError(player, " §6[§e!§6] §cYou don't have enough coins!");
    }

    if (itemName !== "ibexx_itc:battery") {
        giveLockedItem(player, itemName, 1);
        if (itemName === "ibexx_itc:gun") {
            giveLockedItem(player, "ibexx_itc:ammo_shoot", 10);
        }
        deductCoins(player, itemCost);
    } else if (player.getDynamicProperty("batteryLevel") < 4) {
        player.setDynamicProperty("batteryIsCollected", true);
        pickupBattery(player, undefined);
        deductCoins(player, itemCost);
    } else {
        notifyError(player, " §6[§e!§6] §cYour battery is already full", "ibexx_itc:notification");
    }
}

function upgradeBattery(player) {
    const coinAmount = getObjectiveScore(getCoinAmountObjective(), player.scoreboardIdentity);
    const hasUpgraded = player.getDynamicProperty("batteryIsUpgraded");

    if (hasUpgraded) {
        return notifyError(player, " §6[§e!§6] §cYou already have this feat!");
    }
    if (coinAmount < 7) {
        return notifyError(player, " §6[§e!§6] §cYou need 7 coins!");
    }

    player.setDynamicProperty("batteryIsUpgraded", true);
    player.sendMessage(" §6[§e!§6] §aBattery efficiency upgraded!");
    player.playSound("random.levelup");
    deductCoins(player, 7);
}

function increaseStaminaLimit(player) {
    const coinAmount = getObjectiveScore(getCoinAmountObjective(), player.scoreboardIdentity);
    const cache = PlayerCache.get(player.id);
    const staminaLimit = cache ? cache.staminaLimit : 10;

    if (staminaLimit > 10) {
        return notifyError(player, " §6[§e!§6] §cYou already have this feat!");
    }
    if (coinAmount < 7) {
        return notifyError(player, " §6[§e!§6] §cYou need 7 coins!");
    }

    if (cache) cache.staminaLimit = 20;
    player.sendMessage(" §6[§e!§6] §aStamina upgraded!");
    player.playSound("random.levelup");
    deductCoins(player, 7);
}

// --- HELPERS & EXPORTS ---

function getOwnedUniqueItems(player) {
    const owned = new Set();
    const container = player.getComponent(EntityComponentTypes.Inventory).container;

    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item && UNIQUE_SHOP_ITEMS.has(item.typeId)) {
            owned.add(item.typeId);
        }
    }
    return owned;
}

function giveLockedItem(player, typeId, amount = 1) {
    const container = player.getComponent(EntityComponentTypes.Inventory).container;
    const item = new ItemStack(typeId, amount);
    item.lockMode = ItemLockMode.inventory;
    container.addItem(item);
}

function deductCoins(player, cost) {
    player.addLevels(-cost);
    getCoinAmountObjective().addScore(player.scoreboardIdentity, -cost);
}

function notifyError(player, message, sound = "note.bass") {
    player.sendMessage(message);
    player.playSound(sound);
}

export function givePanelItem() {
    if (timeoutId !== undefined) return;

    timeoutId = system.runTimeout(() => {
        const compass = new ItemStack("minecraft:compass", 1);
        compass.lockMode = ItemLockMode.inventory;

        for (const player of world.getPlayers({ tags: ["in_game"] })) {
            const container = player.getComponent(EntityComponentTypes.Inventory).container;
            container.setItem(9, compass);
        }
    }, 2400);
}

export function stopGivePanelItem() {
    if (timeoutId === undefined) return;
    system.clearRun(timeoutId);
    timeoutId = undefined;
}

export function resetPrices() {
    shopPrices = { ...DEFAULT_PRICES };
}