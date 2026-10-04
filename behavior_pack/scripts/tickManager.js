import { world, system } from "@minecraft/server";

import { getPlayersInRound } from "./utils";
import { getSoulsFreedObjective, getSanityObjective } from "./scoreboards";
import { getObjectiveScore, getValueParticipant } from "./scoreboards";

// Imports
import { fastUiTick } from "./UI/fastUiTick";
import { slowUiTick } from "./UI/slowUiTick";
import { weaponController } from "./RoundBegin/weaponController";
import { formerIntervalTeleporter } from "./Teleporter";
import { gameStarter, isGameStarting } from "./gameStarter";
import { ROUND_STATE_MAP, checkGameStatus } from "./gameStats";
import { PlayerCache } from "./Player/playerCache";

// --- IN ROUND IMPORTS ---
import { startDifficultyMonitor } from "./RoundBegin/ghostController";
import { startCrosshairTracker } from "./cursorController";
import { playerLookingControl } from "./RoundBegin/playerLooking";
import { nullTeleportTimeSetter } from "./RoundBegin/Null/nullController";
import { teleportStalkerLoop } from "./stalkerEntity";
import { Battery_control } from "./RoundBegin/batteryController";
import { Sanity_control } from "./RoundBegin/sanityController";
import { soulsAmountCheck } from "./RoundBegin/soulController";
import { Stamina_control } from "./RoundBegin/staminaController";
import { getNullEntity } from "./RoundBegin/Null/nullCache";

let currentTick = 0;
let previousSoulsFreedValue = -1;
let cachedAllPlayers = [];
let cachedIsInMenu = false;
let cachedIsRoundCompleted = false;

world.afterEvents.playerSpawn.subscribe(() => {
    cachedAllPlayers = world.getAllPlayers();
});
world.afterEvents.playerLeave.subscribe(() => {
    cachedAllPlayers = world.getAllPlayers();
});

export function startCentralTickManager() {
    cachedAllPlayers = world.getAllPlayers();
    cachedIsInMenu = world.getDynamicProperty("in_menu");
    cachedIsRoundCompleted = world.getDynamicProperty("roundCompleted");

    system.runInterval(() => {
        currentTick++;
        const allPlayers = cachedAllPlayers;
        if (currentTick % 20 === 0) {
            cachedIsInMenu = world.getDynamicProperty("in_menu");
            cachedIsRoundCompleted = world.getDynamicProperty("roundCompleted");
        }

        const isInMenu = cachedIsInMenu;
        const isRoundCompleted = cachedIsRoundCompleted;
        
        const isGameStarted = (ROUND_STATE_MAP.get("ROUND_STARTED") === true);
        let soulsFreedValue;
        let isPhase4or5;

        // =====================================
        // ALWAYS RUNNING SYSTEMS
        // =====================================

        if (!isInMenu) {
            // 5 TICK
            if (currentTick % 5 === 0) {
                const inGamePlayers = getPlayersInRound();
                checkGameStatus(inGamePlayers);
            }
        }

        // 20 TICK
        if (currentTick % 20 === 0)
            formerIntervalTeleporter();

        // =====================================
        // IN LOBBY RUNNING SYSTEMS
        // =====================================
        
        const isInLobby = !isInMenu && !isGameStarting();
        if (isInLobby) {
            if (currentTick % 30 === 0)
                gameStarter(allPlayers);
        }

        // =====================================
        // IN ROUND RUNNING SYSTEMS
        // =====================================

        if (isGameStarted) {
            soulsFreedValue = getObjectiveScore(getSoulsFreedObjective(), getValueParticipant());
            isPhase4or5 = (soulsFreedValue === 4 || soulsFreedValue === 5);
            
            if (soulsFreedValue !== previousSoulsFreedValue) {
                soulsAmountCheck(soulsFreedValue);
                previousSoulsFreedValue = soulsFreedValue;
            }
            
            // 40 TICK
            if (currentTick % 40 === 0 && isPhase4or5) startDifficultyMonitor(getPlayersInRound());

            // 60 TICK
            if (currentTick % 60 === 0 && !isPhase4or5) nullTeleportTimeSetter(soulsFreedValue);
        }


        // =====================================
        // PER-PLAYER TICK SYSTEMS
        // =====================================

        for (const player of allPlayers) {
            const pId = player.id;
            
            let cache = PlayerCache.get(pId);
            if (!cache) {
                PlayerCache.add(player);
                cache = PlayerCache.get(pId);
            }

            let playerState = {
                skinId: cache?.skinIdVal,
                variant: cache?.variantVal,
                mainHandTypeId: cache?.mainHandTypeId,
                camUsing: cache?.camUsing,
                compassShowing: cache?.compassShowing,
                stamina: cache?.stamina,
                staminaLimit: cache?.staminaLimit
            };

            fastUiTick(player, playerState, isRoundCompleted);

            if (currentTick % 5 === 0)
                weaponController(player, playerState);

            // 80 TICK
            if (currentTick % 80 === 0)
                slowUiTick(player);

            if (isGameStarted && player.hasTag("in_game")) {
                // 2 TICK
                if (currentTick % 2 === 0 && !isPhase4or5) {
                    const nullEntity = getNullEntity();
                    playerLookingControl(player, nullEntity);

                    playerState.viewDirection = player.getViewDirection();
                    playerState.headLocation = player.getHeadLocation();
                    teleportStalkerLoop(player, playerState);
                }

                // 4 TICK
                if (currentTick % 4 === 0 && isPhase4or5) startCrosshairTracker(player);

                // 5 TICK
                if (currentTick % 5 === 0) {
                    playerState.sanity = getObjectiveScore(getSanityObjective(), player.scoreboardIdentity);
                    Sanity_control(player, playerState);
                }

                // 10 TICK
                if (currentTick % 10 === 0) Battery_control(player, playerState);

                // 20 TICK
                if (currentTick % 20 === 0) Stamina_control(player);
            }
        }
    }, 1);
}
