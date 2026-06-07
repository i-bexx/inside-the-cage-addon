import { world } from "@minecraft/server";
import { ActionFormData, FormCancelationReason } from "@minecraft/server-ui";

world.afterEvents.playerInteractWithEntity.subscribe(({ player, target }) => {
    if (target.typeId !== "game:random_peep") return;

    const conversationIsConcluded = target.getDynamicProperty("conversationIsConcluded");
    const conversationIsGoing = target.getDynamicProperty("conversationIsGoing");
    const isHealed = target.getDynamicProperty("isHealed");

    if (conversationIsConcluded) {
        if (isHealed) randomPeepPanel_6(player);
        else randomPeepPanel_7(player);
        return;
    }
    if (conversationIsGoing) {
        player.sendMessage("Someone else is talking");
        return;
    }
    randomPeepPanel_1(player, target);
})

function randomPeepPanel_1(player, target) {
    target.setDynamicProperty("conversationIsGoing", true);

    new ActionFormData()
    .title("random_peep_panel")
    .body("conversation_part")
    .button("Next")
    .button("H-hey...")
    .button("Ple... please... help me-!")
    .show(player).then(({ cancelationReason, canceled }) => {
        if (cancelationReason === FormCancelationReason.UserBusy || canceled) {
            target.setDynamicProperty("conversationIsGoing", false);
            return;
        }
            randomPeepPanel_2(player, target);
    })
}

function randomPeepPanel_2(player, target) {
    new ActionFormData()
    .title("random_peep_panel")
    .body("conversation_part")
    .button("Next")
    .button("I've been stuck here for... I don't even know how long.")
    .button("Something in this place... it made me sick.")
    .show(player).then(({ cancelationReason, canceled }) => {
        if (cancelationReason === FormCancelationReason.UserBusy || canceled) {
            target.setDynamicProperty("conversationIsGoing", false);
            return;
        }

            randomPeepPanel_3(player, target);
    })
}

function randomPeepPanel_3(player, target) {
    new ActionFormData()
    .title("random_peep_panel")
    .body("conversation_part")
    .button("Next")
    .button("I can barely move... my body feels so heavy.")
    .button("If only I had some medicine... anything...")
    .show(player).then(({ cancelationReason, canceled }) => {
        if (cancelationReason === FormCancelationReason.UserBusy || canceled) {
            target.setDynamicProperty("conversationIsGoing", false);
            return;
        }

            randomPeepHelpPanel(player, target);
    })
}

function randomPeepHelpPanel(player, target) {
    new ActionFormData()
    .title("random_peep_panel")
    .body("question_part")
    .button("Yes")
    .button("No")
    .button("§eWill you help him?")
    .show(player).then(({ cancelationReason, canceled, selection }) => {
        if (cancelationReason === FormCancelationReason.UserBusy || canceled) {
            target.setDynamicProperty("conversationIsGoing", false);
            return;
        }

            if (selection == 0) {
                target.setDynamicProperty("isHealed", true);
                target.triggerEvent("is_drinking_medicine_event");
                randomPeepPanel_4(player, target);
            }
            else {
                target.setDynamicProperty("isHealed", false);
                randomPeepPanel_5(player, target);
            }
            target.setDynamicProperty("conversationIsConcluded", true);
    })
}

function randomPeepPanel_4(player, target) {
    player.runCommand(`give @s game:kit 1 0 {"minecraft:item_lock": {"mode": "lock_in_inventory"}}`);

    new ActionFormData()
    .title("random_peep_panel")
    .body("conversation_part")
    .button("Ok")
    .button("Wow... A mere stranger saves my life... I won't forget this.")
    .button("Here, take these. I'm pretty sure you will need them.")
    .show(player).then(({ cancelationReason, canceled }) => {
            if (cancelationReason === FormCancelationReason.UserBusy || canceled) {
            target.setDynamicProperty("conversationIsGoing", false);
            return;
        }

            target.setDynamicProperty("conversationIsGoing", false);
    })  
}

function randomPeepPanel_5(player, target) {
    new ActionFormData()
    .title("random_peep_panel")
    .body("conversation_part")
    .button("Ok")
    .button("Heh... farewell o walking spirit.")
    .show(player).then(({ cancelationReason, canceled }) => {
            if (cancelationReason === FormCancelationReason.UserBusy || canceled) {
            target.setDynamicProperty("conversationIsGoing", false);
            return;
        }

            target.setDynamicProperty("conversationIsGoing", false);
    })  
}

function randomPeepPanel_6(player, target) {
    new ActionFormData()
    .title("random_peep_panel")
    .body("farewell_part")
    .button("Ok")
    .button("Thanks again.")
    .show(player).then(({ cancelationReason, canceled }) => {
            if (cancelationReason === FormCancelationReason.UserBusy || canceled) return;
    })  
}

function randomPeepPanel_7(player, target) {
    new ActionFormData()
    .title("random_peep_panel")
    .body("farewell_part")
    .button("Ok")
    .button("Do take your leave.")
    .show(player).then(({ cancelationReason, canceled }) => {
            if (cancelationReason === FormCancelationReason.UserBusy || canceled) return;
    })  
}