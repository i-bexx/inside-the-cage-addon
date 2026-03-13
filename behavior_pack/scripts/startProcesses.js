import { world, system } from "@minecraft/server";

import { isLookingAtMenuEntity } from "./preStart";

export function startProcesses() {
    
}

export function startProcessesAfterMenuReady() {
    isLookingAtMenuEntity();
}