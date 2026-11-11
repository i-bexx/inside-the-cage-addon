import { world, system } from "@minecraft/server";
import { ActionFormData, FormCancelationReason } from "@minecraft/server-ui";

import { getPlayersInRound } from "./utils";
import { ROUND_STATE_MAP } from "./gameStats";
import { slowUiTick } from "./UI/slowUiTick";

let dimension;

// ======= CONFIGURATION =======

const VOTE_TYPES = {
    RESTART: "restart_confirmation",
    END_ROUND: "end_round_confirmation"
};

const TAGS = {
    REQUESTER: "requester",
    ACCEPTED: "accepted_request",
    HAS_NOTIFICATION: "hasNotification"
};

const ITEMS = {
    NOTIFICATION_PREFIX: "ibexx_itc:"
};

const VOTE_CONFIG = {
    TIMEOUT_TICKS: 600, // 30 Seconds
};

// ======= PANELS =======
let mainPanel;
let confirmPanels;

// ======= STATE =======

let voteTimeout = undefined;
let requestExists = false;
let currentVoteType = undefined;

// ======= CORE FUNCTIONS =======

function cleanup(type) {
    Object.values(TAGS).forEach(tag => {
        dimension.runCommand(`tag @a remove ${tag}`);
    });
    if (type) {
        dimension.runCommand(`clear @a ${ITEMS.NOTIFICATION_PREFIX}${type}`);
    } else {
        dimension.runCommand(`clear @a ${ITEMS.NOTIFICATION_PREFIX}${VOTE_TYPES.RESTART}`);
        dimension.runCommand(`clear @a ${ITEMS.NOTIFICATION_PREFIX}${VOTE_TYPES.END_ROUND}`);
    }
    
    currentVoteType = undefined;
    requestExists = false;

    if (voteTimeout == undefined) return;
    system.clearRun(voteTimeout);
    voteTimeout = undefined;
}

export function votePanel(source) {
    if (requestExists) {
        source.sendMessage("§cThere is already a request submitted at the moment");
        source.playSound("note.bass");
        return;
    }

    mainPanel.show(source).then((response) => {
      const { cancelationReason, canceled, selection } = response;

      if (cancelationReason === FormCancelationReason.UserBusy) return;
      if (canceled) return;

      const types = [VOTE_TYPES.RESTART, VOTE_TYPES.END_ROUND];
      const selectedType = types[selection];
      
      if (selectedType) startRequest(source, selectedType);
    });
}

export function openNotificationPanel(source, itemStack) {
    const itemType = itemStack.typeId.split(":")[1];

    if (confirmPanels[itemType] && !source.hasTag(TAGS.REQUESTER))
        handleVote(source, itemType);
}

function startRequest(player, type) {
    confirmPanels[type].show(player).then((response) => {
      const { cancelationReason, canceled, selection } = response;

        if (cancelationReason === FormCancelationReason.UserBusy) return;
        if (canceled) return;
        if (selection == 1) return;

        const players = getPlayersInRound();

        if (players.length == 1) runOperation(type);

        else if (players.length > 1) {
            player.addTag(TAGS.REQUESTER);
            requestExists = true;
            currentVoteType = type;
            
            players.filter(p => p.id !== player.id).forEach(p => {
                p.addTag(TAGS.HAS_NOTIFICATION);
                p.runCommand(`give @s ${ITEMS.NOTIFICATION_PREFIX}${type} 1 0 {"minecraft:item_lock": {"mode": "lock_in_inventory"}}`);
                
                slowUiTick(p);
            });

            voteTimeout = system.runTimeout(() => {
                const req = getPlayersInRound().find(p => p.hasTag(TAGS.REQUESTER));
                if (req) req.runCommand("title @s actionbar §cRequest timed out");
                cleanup(type);
            }, VOTE_CONFIG.TIMEOUT_TICKS);
        }
    });
}

// Will run when player uses the voting item (except for the requester)
function handleVote(player, type) {
    confirmPanels[type].show(player).then((response) => {
      const { cancelationReason, canceled, selection } = response;
        if (cancelationReason === FormCancelationReason.UserBusy) return;
        if (canceled) return;

        const requester = getPlayersInRound().find(p => p.hasTag(TAGS.REQUESTER));
        const others = getPlayersInRound().filter(p => !p.hasTag(TAGS.REQUESTER));

        if (!requester) {
            cleanup(type);
            others.forEach(player => slowUiTick(player));
            return;
        }

        if (selection === 0) { // Yes
            player.addTag(TAGS.ACCEPTED);
            player.removeTag(TAGS.HAS_NOTIFICATION);
            player.runCommand(`clear @s ${ITEMS.NOTIFICATION_PREFIX}${type}`);

            const acceptedCount = others.filter(p => p.hasTag(TAGS.ACCEPTED)).length;

            if (others.length === acceptedCount) {
                runOperation(type);
                cleanup(type);
                others.forEach(player => slowUiTick(player));
            }
        } else { // No
            requester.runCommand("title @s actionbar §cRequest has been refused");
            cleanup(type);
            others.forEach(player => slowUiTick(player));
        }
    });
}

function runOperation(type) {
    if (type === VOTE_TYPES.RESTART) ROUND_STATE_MAP.set("ROUND_RESTARTED", true);
    else if (type === VOTE_TYPES.END_ROUND) ROUND_STATE_MAP.set("ROUND_ENDED_EARLY", true);
}

export function checkVoteOnPlayerDeath(eliminatedPlayer) {
    if (!requestExists) return;

    // Silently clean up if the requester dies
    if (eliminatedPlayer.hasTag(TAGS.REQUESTER)) {
        cleanup(currentVoteType);
        return;
    }

    const remainingInRound = getPlayersInRound().filter(p => p.id !== eliminatedPlayer.id);
    const others = remainingInRound.filter(p => !p.hasTag(TAGS.REQUESTER));

    // Cancel vote if only the requester remains but no one else left
    if (others.length === 0) {
        cleanup(currentVoteType);
        return;
    }

    // Execute operation if all remaining players have accepted
    const acceptedCount = others.filter(p => p.hasTag(TAGS.ACCEPTED)).length;
    if (others.length === acceptedCount) {
        runOperation(currentVoteType);
        cleanup(currentVoteType);
    }
}

export function checkVoteOnPlayerLeave() {
    if (!requestExists) return;

    // Silently clean up if the requester leaves the game
    const requester = getPlayersInRound().find(p => p.hasTag(TAGS.REQUESTER));
    if (!requester) {
        cleanup(currentVoteType);
        return;
    }

    const others = getPlayersInRound().filter(p => !p.hasTag(TAGS.REQUESTER));

    // Cancel vote if only the requester remains but no one else left
    if (others.length === 0) {
        cleanup(currentVoteType);
        return;
    }

    // Execute operation if all remaining players have accepted
    const acceptedCount = others.filter(p => p.hasTag(TAGS.ACCEPTED)).length;
    if (others.length === acceptedCount) {
        runOperation(currentVoteType);
        cleanup(currentVoteType);
    }
}

export function stopVoteManager() {
    cleanup(currentVoteType);
}

export function setGlobalVariables() { dimension = world.getDimension("overworld"); }
export function setForms() {
    mainPanel = new ActionFormData()
    .title("VOTE PANEL")
    .button("Restart Round")
    .button("End Round")
    .button("Go Back");

    confirmPanels = {
    [VOTE_TYPES.RESTART]: new ActionFormData()
        .title("")
        .body("Do you want to restart?")
        .button("Yes").button("No"),
    [VOTE_TYPES.END_ROUND]: new ActionFormData()
        .title("")
        .body("Do you want to end this round?")
        .button("Yes").button("No"),
    };
}