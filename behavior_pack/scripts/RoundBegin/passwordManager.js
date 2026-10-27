import { world, ItemStack } from "@minecraft/server";

const PASSWORDS = ["A7K2", "9F3B", "R4D8", "6HW1", "M5X9", "3JP6", "T8C4", "2YN7"];
let chosenPasswords = [];

let firstEntity = undefined;
let secondEntity = undefined;
let labelEntities = [];

function resolvePasswordLabelEntities(dimension) {
    const firstId = world.getDynamicProperty("password_label_first_id") ?? "-25297357373382";
    const secondId = world.getDynamicProperty("password_label_second_id") ?? "-25318832209864";

    firstEntity = world.getEntity(firstId) ?? dimension.getEntities({ type: "ibexx_itc:password_label", tags: ["password_label_first"] })[0];
    secondEntity = world.getEntity(secondId) ?? dimension.getEntities({ type: "ibexx_itc:password_label", tags: ["password_label_second"] })[0];
    labelEntities = [ firstEntity, secondEntity ];
}

world.afterEvents.entityLoad.subscribe(({entity}) => {
    if (entity.typeId !== "ibexx_itc:password_label") return;
    resolvePasswordLabelEntities(entity.dimension);
});

export function decidePasswords() {
    if (!firstEntity || !firstEntity.isValid || !secondEntity || !secondEntity.isValid) {
        resolvePasswordLabelEntities(world.getDimension("overworld"));
    }

    const firstPasswordIndex = Math.floor(Math.random() * PASSWORDS.length);
    let secondPasswordIndex;

    do secondPasswordIndex = Math.floor(Math.random() * PASSWORDS.length);
    while (firstPasswordIndex == secondPasswordIndex);

    chosenPasswords[0] = PASSWORDS[firstPasswordIndex];
    chosenPasswords[1] = PASSWORDS[secondPasswordIndex];

    for (let i = 0; i < 2; i++)
        labelEntities[i]?.triggerEvent(`set_${chosenPasswords[i]}`); // Triggers the event based on the chosen password index
}

export function passwordEnteredCorrect(player) {
    player.addTag("passwordCorrect");
    player.playSound("random.orb");
    player.sendMessage(" §a[!] Correct Password!");
}

export function passwordManager() {
    const players = world.getPlayers({ tags: ["passwordCorrect"] });

    for (const player of players) {
        player.addItem(new ItemStack("ibexx_itc:kit"));
        player.removeTag("passwordCorrect");
    }
}

export function getPasswords() { return chosenPasswords; }
