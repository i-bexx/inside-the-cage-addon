import { world, system } from "@minecraft/server";

function init() {
    const players = world.getAllPlayers();
    const sanityObjective = world.scoreboard.getObjective("Sanity");

    if (!sanityObjective) return; 

    for (const player of players) {
        let score;
        try {
            score = sanityObjective.getScore(player);
        } catch (e) {
            continue;
        }

        let stage = 1;
        if (score <= 82 && score >= 66) stage = 2;
        else if (score <= 65 && score >= 49) stage = 3;
        else if (score <= 48 && score >= 32) stage = 4;
        else if (score <= 31 && score >= 15) stage = 5;
        else if (score <= 14 && score >= 1) stage = 6;
        else if (score === 0) stage = 7;

        let uiString = `sanityUI${stage}`;
        
        if (player.hasTag("hasNotification")) {
            uiString += " new_notification";
        }
        player.onScreenDisplay.setTitle(uiString);
    }
}

system.runInterval(init, 80);