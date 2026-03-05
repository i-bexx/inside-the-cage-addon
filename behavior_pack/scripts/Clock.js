import { world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

const ui = new ActionFormData()
    .title ("Form")
    .body ("") 
    .button ("button1")
    .button ("button2")
    .button ("button3");

const customUi = new ActionFormData()
    .title ("Custom Form")
    .body ("") 
    .button ("Rewards", "textures/ui/promo_holiday_gift_small")
    .button ("Shop", "textures/ui/ican_deals")
    .button ("Ban Tool", "textures/ui/hammer_1")
    .button ("Skins", "textures/ui/icon_hangar");

    
world.afterEvents.itemUse.subscribe((eventData) => {
      const { source, itemStack } = eventData
      switch (itemStack.typeId) {
        case "minecraft:compass": ui.show(source); break;
        case "minecraft:clock": customUi.show(source); break;
      }
})




