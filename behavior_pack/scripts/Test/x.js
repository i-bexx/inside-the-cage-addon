import { world, system, BlockPermutation } from "@minecraft/server";

export function buttonPushEvent(targetLocation) {
    const cobblestone = targetLocation.dimension.getBlock(targetLocation);
    const button = targetLocation.dimension.getBlock({
        x: targetLocation.x,
        y: targetLocation.y + 1,
        z: targetLocation.z
    });

    if (!cobblestone || !button) {
        world.sendMessage("couldn't find the block");
        return 1;
    }


    cobblestone.setPermutation(BlockPermutation.resolve("minecraft:cobblestone"));
    button.setPermutation(BlockPermutation.resolve("minecraft:acacia_button").withState("facing_direction", 1) // on top
    );

    return 0;
}


