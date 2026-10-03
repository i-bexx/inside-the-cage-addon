import { world, system, EquipmentSlot } from "@minecraft/server";

import { getPlayersInRound } from "./utils";
import { getSoulsFreedObjective, getStaminaObjective, getStaminaLimitObjective, getSanityObjective } from "./scoreboards";
import { getObjectiveScore, getValueParticipant } from "./scoreboards";

// Imports
import { fastUiTick } from "./UI/fastUiTick";
import { slowUiTick } from "./UI/slowUiTick";
import { formerIntervalPlayerSituation } from "./Player/playerSituation";
import { formerIntervalTeleporter } from "./Teleporter";
import { gameStarter, isGameStarting } from "./gameStarter";
import { ROUND_STATE_MAP, checkGameStatus } from "./gameStats";

// --- IN ROUND IMPORTS ---
import { startDifficultyMonitor } from "./RoundBegin/ghostController";
import { startCrosshairTracker } from "./cursorController";
import { playerLookingControl } from "./RoundBegin/playerLooking";
import { nullTeleportTimeSetter } from "./RoundBegin/Null/nullController";
import { teleportStalkerLoop } from "./stalkerEntity";
import { Battery_control } from "./RoundBegin/batteryController";
import { Sanity_control } from "./RoundBegin/Sanity";
import { soulsAmountCheck } from "./RoundBegin/soulController";
import { Stamina_control } from "./RoundBegin/Stamina";
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

        // 80 TICK
        if (currentTick % 80 === 0)
            slowUiTick(allPlayers);

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
            
            let playerState = {
                skinId: player.getComponent("skin_id")?.value,
                mainHand: player.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Mainhand),
                variant: player.getComponent("minecraft:variant")?.value,
                rotation: player.getRotation(),
                velocity: player.getVelocity(),
                camUsing: player.getDynamicProperty("camUsing"),
                compassShowing: player.getDynamicProperty("compassShowing"),
                stamina: getObjectiveScore(getStaminaObjective(), player.scoreboardIdentity),
                staminaLimit: getObjectiveScore(getStaminaLimitObjective(), player.scoreboardIdentity)
            };

            fastUiTick(player, playerState, isRoundCompleted, allPlayers);
            formerIntervalPlayerSituation(player, playerState);

            if (isGameStarted && player.hasTag("in_game")) {
                // 1 TICK
                if (!isPhase4or5) {
                    playerState.viewDirection = player.getViewDirection();
                    playerState.headLocation = player.getHeadLocation();
                    teleportStalkerLoop(player, playerState);
                }

                // 2 TICK
                if (currentTick % 2 === 0 && !isPhase4or5) {
                    const nullEntity = getNullEntity();
                    playerLookingControl(player, nullEntity);
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
                if (currentTick % 20 === 0) Stamina_control(player, playerState);
            }
        }
    }, 1);
}
