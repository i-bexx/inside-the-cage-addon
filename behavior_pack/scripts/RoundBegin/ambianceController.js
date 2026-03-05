import { system } from "@minecraft/server";
import { getPlayersInRound } from "../getPlayersArray";

// =============================================================
// VARIABLES
// =============================================================

const TICKS = [ 4950, 5260, 7210, 3250, 4210 ];
const COMMAND = "playsound ambiance @s";

let timeoutId = 0;
let isRunning = false;

// =============================================================
// MAIN AND HELPER FUNCTIONS
// =============================================================

export function Ambiance_control() {
    if (isRunning) return;
    
    isRunning = true;
    playAmbiance();
}

function playAmbiance() {
    if (!isRunning) return;

    const index = getIndex();
    const chosenTick = TICKS[index];

    timeoutId = system.runTimeout(() => {
        if (!isRunning) return;

        const players = getPlayersInRound();

        for (const player of players) {
            if (player.isValid()) {
                player.runCommand(COMMAND); 
            }
        }
        
        playAmbiance();
        
    }, chosenTick);
}

function getIndex() {
    return Math.floor(Math.random() * TICKS.length);
}

export function stopAmbiance() {
    isRunning = false;
    if (timeoutId !== 0) {
        system.clearRun(timeoutId);
        timeoutId = 0;
    }
}