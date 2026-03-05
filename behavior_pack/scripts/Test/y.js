import { world, system, BlockPermutation } from "@minecraft/server";

export function leverOn (targetLocation) {

    const cobblestone = targetLocation.dimension.getBlock(targetLocation);
    const lever = targetLocation.dimension.getBlock({
        x: targetLocation.x,
        y: targetLocation.y + 1,
        z: targetLocation.z
    })

    if (cobblestone == undefined || lever == undefined) {
         world.sendMessage("didnt work")
         return 1;   
        }


        cobblestone.setPermutation(BlockPermutation.resolve("minecraft:cobblestone"));
        lever.setPermutation(BlockPermutation.resolve("minecraft:lever").withState("open_bit", false).withState("lever_direction", 1));


        return 0;
} 
