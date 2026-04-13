import { world, system } from "@minecraft/server";

// ----- MAIN FUNCTION -----

export function slowUiTick() {
    const players = world.getAllPlayers();

    for (const player of players) {
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

        player.setDynamicProperty("compassShowing", false); // Hides compass when time is out
    }
}

// ----- HELPER FUNCTION -----

function sanityString(player) {
    let score;
    let sanityObjective = world.scoreboard.getObjective("Sanity");
        try {
            score = sanityObjective.getScore(player);
        } catch (e) {
            return;
        }

        let stage = 1;
        if (score <= 82 && score >= 66) stage = 2;
        else if (score <= 65 && score >= 49) stage = 3;
        else if (score <= 48 && score >= 32) stage = 4;
        else if (score <= 31 && score >= 15) stage = 5;
        else if (score <= 14 && score >= 1) stage = 6;
        else if (score === 0) stage = 7;

        return `sanityUI${stage}`;
}

// ----- RUN MAIN FUNCTION -----

system.runInterval(slowUiTick, 80);
