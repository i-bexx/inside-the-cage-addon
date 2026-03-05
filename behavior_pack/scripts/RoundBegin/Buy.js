import { world, system } from "@minecraft/server";
import { MessageFormData, FormCancelationReason } from "@minecraft/server-ui";

import { getCoinAmountObjective, getObjectiveScore } from "../Scoreboards";

// ==========================================
// VARIABLES
// ==========================================

let coinAmountObjective;
let isInitialized = false;

const CONFIG = {
    TITLES: {
        TITLE: "",
				BODY: "Do you want to buy this drink?",
				BUTTON1: "No",
				BUTTON2: "Yes",
    },
		COMMANDS_ACCEPT: {
			PLAYSOUND: "playsound note.didgeridoo @s",
			MESSAGE: "You don't have enough coins!"
		},
    COMMANDS_DECLINE: {
			PLAYSOUND1: "playsound note.iron_xylophone @s",
			PLAYSOUND2: "playsound bottle_drink @s",
			DECREASE_COIN: "scoreboard players remove @s coin_amount 1",
			DECREASE_XP: "xp -1L @s"
    }
}

// ==========================================
// FUNCTIONS
// ==========================================

function initialFunction() {
  coinAmountObjective = getCoinAmountObjective();

	// Security Check
	if (!coinAmountObjective) return;
	
    isInitialized = true;
}

// Run when world loads
system.run(initialFunction);

let scoreSecurityInterval = system.runInterval(() => {
    if (!isInitialized) {
        initialFunction();
        return;
    } else system.clearRun(scoreSecurityInterval);
}, 40);

// ------------ LOGICAL FUNCTIONS ------------

function buyBottle(p) {
    new MessageFormData()
    .title(CONFIG.TITLES.TITLE)
    .body(CONFIG.TITLES.BODY)
    .button1(CONFIG.TITLES.BUTTON1)
    .button2(CONFIG.TITLES.BUTTON2)
    .show(p)
				.then(({ cancelationReason, canceled, selection }) => {
						if (canceled || cancelationReason === FormCancelationReason.UserBusy) return;
						else if (selection != 1) return;
						Purchase(p);
    })
}

function Purchase(player) {
    const amount = getObjectiveScore(coinAmountObjective, player.scoreboardIdentity)

    if (amount == 0 || amount == undefined) {
        player.sendMessage(CONFIG.COMMANDS_ACCEPT.MESSAGE);
        player.runCommand(CONFIG.COMMANDS_ACCEPT.PLAYSOUND);
    } else {
				for (const [_, value] of Object.entries(CONFIG.COMMANDS_DECLINE)) {
					player.runCommand(value);
				}
    }   
}

// ==========================================
// LISTENER
// ==========================================

world.afterEvents.entityHitEntity.subscribe(({damagingEntity, hitEntity}) => {
    if (hitEntity.typeId == "game:bottle") {
        buyBottle(damagingEntity)
    }
})
    