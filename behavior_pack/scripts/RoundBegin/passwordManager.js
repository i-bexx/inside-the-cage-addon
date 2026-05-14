const PASSWORDS = ["A7K2", "9F3B", "R4D8", "6HW1", "M5X9", "3JP6", "T8C4", "2YN7"];
let chosenPasswords = [];

export function getPasswords() {
    return chosenPasswords;
}

export function decidePasswords() {
    const firstPasswordIndex = Math.floor(Math.random() * PASSWORDS.length);
    let secondPasswordIndex;

    do {
        secondPasswordIndex = Math.floor(Math.random() * PASSWORDS.length);
    } while (firstPasswordIndex == secondPasswordIndex);

    chosenPasswords[0] = PASSWORDS[firstPasswordIndex];
    chosenPasswords[1] = PASSWORDS[secondPasswordIndex]
}

export function resetPasswords() {
    chosenPasswords.length = 0;
}