import { world, system } from "@minecraft/server";
import { ActionFormData, MessageFormData, FormCancelationReason } from "@minecraft/server-ui";

import { getPlayersInRound } from "./getPlayersArray";

let timeoutId = 0;
const DIMENSION = world.getDimension("overworld");

// ======= CONFIGURATION =======

const VOTE_TYPES = {
    RESTART: "restartConfirmation",
    END_ROUND: "endRoundConfirmation"
};

const TAGS = {
    REQUESTER: "requester",
    ACCEPTED: "accepted",
    REFUSED: "requestRefused",
    HAS_NOTIFICATION: "hasNotification"
};

const ITEMS = {
    NOTIFICATION_PREFIX: "notification:"
};

const VOTE_CONFIG = {
    TIMEOUT_TICKS: 600, // 30 Seconds
};

// ======= PANELS =======
const mainPanel = new ActionFormData()
    .title("MENU")
    .button("Restart Round")
    .button("End Round")
    .button("Go Back");

const confirmPanels = {
    [VOTE_TYPES.RESTART]: new MessageFormData()
        .title("RESTART")
        .body("Do you want to restart?")
        .button1("No").button2("Yes"),
    [VOTE_TYPES.END_ROUND]: new MessageFormData()
        .title("END ROUND")
        .body("Do you want to end this round?")
        .button1("No").button2("Yes")
};

// ======= STATE =======

let voteTimeout = null;
let requestExists = false;

// ======= CORE FUNCTIONS =======

function cleanup(type) {
    Object.values(TAGS).forEach(tag => {
        DIMENSION.runCommand(`tag @a remove ${tag}`);
    });
    DIMENSION.runCommand(`clear @a ${ITEMS.NOTIFICATION_PREFIX}${type}`);
    
    requestExists = false;
    if (voteTimeout) {
        system.clearRun(voteTimeout);
        voteTimeout = null;
    }
}

export function votePanel(source) {
    if (requestExists) {
        source.sendMessage("§cThere is already a request submitted at the moment");
        source.playSound("note.bass");
        return;
    }

    mainPanel.show(source).then((response) => {
      const { cancelationReason, canceled, selection } = response;

      if (cancelationReason === FormCancelationReason.UserBusy) {
        return votePanel(source);
      } 
      if (canceled) return;

      const types = [VOTE_TYPES.RESTART, VOTE_TYPES.END_ROUND];
      const selectedType = types[selection];
      
      if (selectedType) startRequest(source, selectedType);
    });
}

function startRequest(player, type) {
    confirmPanels[type].show(player).then((response) => {
      const { cancelationReason, canceled, selection } = response;

        if (cancelationReason === FormCancelationReason.UserBusy) {
          startRequest(player, type);
          return;
        } 
        if (canceled) return;
        if (selection == 0) return;

        const players = getPlayersInRound();

        if (players.length == 1) runOperation(type);

        else if (players.length > 1) {
            player.addTag(TAGS.REQUESTER);
            requestExists = true;
            
            players.filter(p => p.id !== player.id)
                .forEach(p => {
                  p.addTag(TAGS.HAS_NOTIFICATION);
                  p.runCommand(`give @s ${ITEMS.NOTIFICATION_PREFIX}${type}`);
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
        if (cancelationReason === FormCancelationReason.UserBusy) {
          handleVote(player, type);
          return;
        }
        if (canceled) return;

        const requester = getPlayersInRound().find(p => p.hasTag(TAGS.REQUESTER));
        if (!requester) {
            player.sendMessage("§cThe request already been declined");
            return;
        }

        if (selection === 0) { // No
            requester.addTag(TAGS.REFUSED);
            cleanup(type);
        } else { // Yes
            player.addTag(TAGS.ACCEPTED);
            player.removeTag(TAGS.HAS_NOTIFICATION);
            player.runCommand(`clear @s ${ITEMS.NOTIFICATION_PREFIX}${type}`);

            const others = getPlayersInRound().filter(p => !p.hasTag(TAGS.REQUESTER));
            const acceptedCount = others.filter(p => p.hasTag(TAGS.ACCEPTED)).length;

            if (others.length === acceptedCount) {
                runOperation(type);
                cleanup(type);
            }
        }
    });
}

function runOperation(type) {
    if (type === VOTE_TYPES.RESTART) {
        world.setDynamicProperty("gameRestart", true);
        DIMENSION.runCommand("scoreboard players set value game_restarted 1");
    } else if (type === VOTE_TYPES.END_ROUND) {
        world.setDynamicProperty("roundEndedEarly", true);
        DIMENSION.runCommand("scoreboard players set value game_ended_early 1");
    }
}

// ======= EVENTS =======
world.afterEvents.itemUse.subscribe((event) => {
    const { source, itemStack } = event;

    if (itemStack.typeId.startsWith(ITEMS.NOTIFICATION_PREFIX)) {
        const itemType = itemStack.typeId.split(":")[1];

        if (confirmPanels[itemType] && !source.hasTag(TAGS.REQUESTER)) {
            handleVote(source, itemType);
        }
    }
});