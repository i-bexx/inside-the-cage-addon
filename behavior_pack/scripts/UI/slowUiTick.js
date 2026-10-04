import { system } from "@minecraft/server";
import { getSanityObjective, getObjectiveScore } from "../scoreboards";
import { COMPASS_SHOWING_SET } from "./fastUiTick";

system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id === "game:update_sanity") {
        slowUiTick(event.sourceEntity);
    }
});

// ----- MAIN FUNCTION -----

export function slowUiTick(player) {
        let sanityState;
        let uiString;
        if (player.hasTag("show_in_round_personal_ui")) {
            sanityState = sanityString(player);
            uiString = `${sanityState}`;
        } else uiString = "sanityUIx"
        
        if (player.hasTag("hasNotification")) {
            uiString += "\nnew_notification";
        }
        player.onScreenDisplay.setTitle(uiString);

        COMPASS_SHOWING_SET.delete(player.id); // Hides compass when time is out
}

// ----- HELPER FUNCTION -----

function sanityString(player) {
    const score = getObjectiveScore(getSanityObjective(), player.scoreboardIdentity);
    if (score === undefined) return;

    let stage = 1;
    if (score <= 82 && score >= 66) stage = 2;
    else if (score <= 65 && score >= 49) stage = 3;
    else if (score <= 48 && score >= 32) stage = 4;
    else if (score <= 31 && score >= 15) stage = 5;
    else if (score <= 14 && score >= 1) stage = 6;
    else if (score === 0) stage = 7;

    return `sanityUI${stage}`;
}
