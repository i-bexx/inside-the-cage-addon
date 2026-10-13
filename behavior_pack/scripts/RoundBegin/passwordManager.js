import { world, ItemStack } from "@minecraft/server";

const PASSWORDS = ["A7K2", "9F3B", "R4D8", "6HW1", "M5X9", "3JP6", "T8C4", "2YN7"];
let chosenPasswords = [];

let firstEntity = undefined;
let secondEntity = undefined;
let labelEntities = [];

world.afterEvents.entityLoad.subscribe(({entity}) => {
    if (entity.typeId !== "game:password_label") return;

    firstEntity = world.getEntity("-25297357373382");
    secondEntity = world.getEntity("-25318832209864");
    labelEntities = [ firstEntity, secondEntity ];
})

export function decidePasswords() {
    const firstPasswordIndex = Math.floor(Math.random() * PASSWORDS.length);
    let secondPasswordIndex;

    do secondPasswordIndex = Math.floor(Math.random() * PASSWORDS.length);
    while (firstPasswordIndex == secondPasswordIndex);

    chosenPasswords[0] = PASSWORDS[firstPasswordIndex];
    chosenPasswords[1] = PASSWORDS[secondPasswordIndex];

    for (let i = 0; i < 2; i++)
        labelEntities[i].triggerEvent(`set_${chosenPasswords[i]}`); // Triggers the event based on the chosen password index
}

export function passwordEnteredCorrect(player) {
    player.addTag("passwordCorrect");
    player.playSound("random.orb");
    player.sendMessage(" §a[!] Correct Password!");
}

export function passwordManager() {
    const players = world.getPlayers({ tags: ["passwordCorrect"] });

    for (const player of players) {
        player.addItem(new ItemStack("game:kit"));
        player.removeTag("passwordCorrect");
    }
}

export function getPasswords() { return chosenPasswords; }