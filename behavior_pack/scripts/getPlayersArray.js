import { world } from "@minecraft/server";

export function setAllPlayers() {
  const players = world.getPlayers();
    return players;
}

export function setPlayersInRound() {
  const playersInRound = world.getPlayers()
                        .filter(p => p.hasTag("in_game"));
    return playersInRound;
}

export function getAllPlayers() {
  const players = setAllPlayers();
    return players;
}

export function getPlayersInRound() {
  const playersInRound = setPlayersInRound();
    return playersInRound;
}

world.afterEvents.playerLeave.subscribe(() => {
  setAllPlayers();
  setPlayersInRound();
})