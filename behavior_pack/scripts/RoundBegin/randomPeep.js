import { world } from "@minecraft/server";
import { ActionFormData, FormCancelationReason } from "@minecraft/server-ui";

world.afterEvents.playerInteractWithEntity.subscribe(({ player, target }) => {
    if (target.typeId !== "game:random_peep") return;

    if (player.getDynamicProperty("hasInteractedWithPeepBefore")) {
        if (player.getDynamicProperty("acceptedHelpingPeep")) randomPeepPanel_6(player);
        else randomPeepPanel_7(player);
        return;
    }
    randomPeepPanel_1(player);
})

function randomPeepPanel_1(player) {
    new ActionFormData()
    .title("random_peep_panel")
    .body("conversation_part")
    .button("Next")
    .button("H-hey... you there...")
    .button("Ple... please... help me-!")
    .show(player).then(({ cancelationReason, canceled }) => {
        if (cancelationReason === FormCancelationReason.UserBusy) {
                return randomPeepPanel_1(player);
            }
            if (canceled) return;

            randomPeepPanel_2(player);
    })
}

function randomPeepPanel_2(player) {
    new ActionFormData()
    .title("random_peep_panel")
    .body("conversation_part")
    .button("Next")
    .button("I've been stuck here for... I don't even know how long.")
    .button("Something in this place... it made me sick.")
    .show(player).then(({ cancelationReason, canceled }) => {
        if (cancelationReason === FormCancelationReason.UserBusy) {
                return randomPeepPanel_2(player);
            }
            if (canceled) return;

            randomPeepPanel_3(player);
    })
}

function randomPeepPanel_3(player) {
    new ActionFormData()
    .title("random_peep_panel")
    .body("conversation_part")
    .button("Next")
    .button("I can barely move... my body feels so heavy.")
    .button("If only I had some medicine... anything...")
    .show(player).then(({ cancelationReason, canceled }) => {
        if (cancelationReason === FormCancelationReason.UserBusy) {
                return randomPeepPanel_3(player);
            }
            if (canceled) return;

            randomPeepHelpPanel(player);
    })
}

function randomPeepHelpPanel(player) {
    new ActionFormData()
    .title("random_peep_panel")
    .body("question_part")
    .button("Yes")
    .button("No")
    .button("§eWill you help him?")
    .show(player).then(({ cancelationReason, canceled, selection }) => {
        if (cancelationReason === FormCancelationReason.UserBusy) {
                return randomPeepHelpPanel(player);
            }
            if (canceled) return;

            if (selection == 0) {
                player.setDynamicProperty("acceptedHelpingPeep", true);
                randomPeepPanel_4(player);
            }
            else {
                player.setDynamicProperty("acceptedHelpingPeep", false);
                randomPeepPanel_5(player);
            }
            player.setDynamicProperty("hasInteractedWithPeepBefore", true);
    })
}

function randomPeepPanel_4(player) {
    new ActionFormData()
    .title("random_peep_panel")
    .body("conversation_part")
    .button("Ok")
    .button("Wow... A mere stranger saves my life... I won't forget this.")
    .button("Here, take these. I'm pretty sure you will need them.")
    .show(player).then(({ cancelationReason, canceled }) => {
            if (cancelationReason === FormCancelationReason.UserBusy) {
                return randomPeepPanel_4(player);
            }
            if (canceled) return;

            player.runCommand("give @s game:kit 4");
    })  
}

function randomPeepPanel_5(player) {
    new ActionFormData()
    .title("random_peep_panel")
    .body("conversation_part")
    .button("Ok")
    .button("Heh... farewell o walking spirit.")
    .show(player).then(({ cancelationReason, canceled }) => {
            if (cancelationReason === FormCancelationReason.UserBusy) {
                return randomPeepPanel_5(player);
            }
            if (canceled) return;
    })  
}

function randomPeepPanel_6(player) {
    new ActionFormData()
    .title("random_peep_panel")
    .body("farewell_part")
    .button("Ok")
    .button("Thanks again.")
    .show(player).then(({ cancelationReason, canceled }) => {
            if (cancelationReason === FormCancelationReason.UserBusy) {
                return randomPeepPanel_6(player);
            }
            if (canceled) return;
    })  
}

function randomPeepPanel_7(player) {
    new ActionFormData()
    .title("random_peep_panel")
    .body("farewell_part")
    .button("Ok")
    .button("Do take your leave.")
    .show(player).then(({ cancelationReason, canceled }) => {
            if (cancelationReason === FormCancelationReason.UserBusy) {
                return randomPeepPanel_6(player);
            }
            if (canceled) return;
    })  
}