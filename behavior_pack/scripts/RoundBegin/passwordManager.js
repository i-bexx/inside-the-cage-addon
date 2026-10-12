import { world, ItemStack } from "@minecraft/server";

const PASSWORDS = ["A7K2", "9F3B", "R4D8", "6HW1", "M5X9", "3JP6", "T8C4", "2YN7"];
let chosenPasswords = [];

world.afterEvents.playerInteractWithEntity.subscribe(({ player, target }) => {
    if (target.typeId !== "game:password_desktop") return;

    
})

export function decidePasswords() {
    const firstPasswordIndex = Math.floor(Math.random() * PASSWORDS.length);
    let secondPasswordIndex;

    do {
        secondPasswordIndex = Math.floor(Math.random() * PASSWORDS.length);
    } while (firstPasswordIndex == secondPasswordIndex);

    chosenPasswords[0] = PASSWORDS[firstPasswordIndex];
    chosenPasswords[1] = PASSWORDS[secondPasswordIndex];
    world.sendMessage(`${chosenPasswords[0]} ${chosenPasswords[1]}`)
}

export function passwordEnteredCorrect(player) {
    player.addTag("passwordCorrect");
    player.playSound("random.orb");
}

export function passwordManager() {
    const players = world.getPlayers({ tags: ["passwordCorrect"] });

    for (const player of players) {
        player.addItem(new ItemStack("game:kit"));
        player.removeTag("passwordCorrect");
    }
}

export function getPasswords() { return chosenPasswords; }