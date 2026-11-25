import { world, system } from "@minecraft/server";
import { EasingType, InputPermissionCategory, HudVisibility, HudElement } from "@minecraft/server";
import { getSoulsFreedObjective, getValueParticipant, getObjectiveScore } from "./scoreboards";

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const DOSSIER_ITEM_ID = "ibexx_itc:case_dossier";
const DOSSIER_ENTITY_ID = "ibexx_itc:dossier";
const DOSSIER_ICON_ENTITY_ID = "ibexx_itc:dossier_icon";

const OWNER_DYNAMIC_PROP = "ibexx_itc:dossier_owner";
const SAVED_STATE_PROP = "ibexx_itc:dossier_saved_state";
const LAST_PAGE_PROP = "ibexx_itc:dossier_last_page";

// 400 x 260 Canvas & Cursor Math (Matches dossier.entity.json pre_animation)
const CANVAS_CENTER_X = 200;
const CANVAS_CENTER_Y = 130;
const PIXELS_PER_DEGREE = 2.5;
const MAX_YAW_DEG = 80;
const MAX_PITCH_DEG = 52;

// Camera & World Positioning Constants
const CAMERA_HEIGHT_OFFSET = (13 + 11.5) / 16; // 1.53125 blocks above player feet
const CAMERA_FOV = 70;
const MAX_AHEAD_OFFSET = 0.45;
const WALL_CLEARANCE = 0.5;
const OPEN_EASE_SECONDS = 0.3;
const CLOSE_EASE_SECONDS = 0.35;

const LOCKED_INPUT_CATEGORIES = [
    InputPermissionCategory.LateralMovement,
    InputPermissionCategory.Jump,
    InputPermissionCategory.Sneak
];

const HIDDEN_HUD_ELEMENTS = Object.values(HudElement).filter(
    (v) => typeof v === "number" && v !== HudElement.TouchControls
);

// Top Tab Bar Hitboxes [x0, y0, x1, y1] (Matches dossier.entity.json pre_animation)
const TOP_TAB_BUTTONS = [
    { x0: 16,  y0: 8, x1: 68,  y1: 30, action: "page", targetPage: 0 }, // BRIEF
    { x0: 72,  y0: 8, x1: 124, y1: 30, action: "page", targetPage: 1 }, // GEAR
    { x0: 128, y0: 8, x1: 180, y1: 30, action: "page", targetPage: 2 }, // WEAPONS
    { x0: 184, y0: 8, x1: 236, y1: 30, action: "page", targetPage: 3 }, // THREATS
    { x0: 240, y0: 8, x1: 292, y1: 30, action: "page", targetPage: 4 }, // FIELD
    { x0: 296, y0: 8, x1: 348, y1: 30, action: "page", targetPage: 5 }, // STATUS
    { x0: 360, y0: 8, x1: 386, y1: 30, action: "close" }                // [X] CLOSE
];

// 3D Held-Item Slots for Page 1 (GEAR) and Page 2 (WEAPONS)
// Slot Centers: Top-Left (49, 98), Top-Right (231, 98), Bottom-Left (49, 188), Bottom-Right (231, 188)
const PAGE_3D_ICONS = {
    1: [
        { pixelX: 49,  pixelY: 98,  scale: 1.0, itemId: "ibexx_itc:cage_detector" },
        { pixelX: 231, pixelY: 98,  scale: 1.0, itemId: "ibexx_itc:kit" },
        { pixelX: 49,  pixelY: 188, scale: 1.0, itemId: "minecraft:redstone_torch" },
        { pixelX: 231, pixelY: 188, scale: 1.0, itemId: "ibexx_itc:discount_ticket" }
    ],
    2: [
        { pixelX: 49,  pixelY: 98,  scale: 1.0, itemId: "ibexx_itc:gun" },
        { pixelX: 231, pixelY: 98,  scale: 1.0, itemId: "ibexx_itc:ammo" },
        { pixelX: 49,  pixelY: 188, scale: 1.0, itemId: "ibexx_itc:knife" },
        { pixelX: 231, pixelY: 188, scale: 1.0, itemId: "ibexx_itc:toxic_bomb" }
    ]
};

// Active dossier sessions keyed by player.id
const activeSessions = new Map();
const lastOpenAttemptTick = new Map();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
}

function isEntityValid(entity) {
    try {
        return entity?.isValid === true;
    } catch {
        return false;
    }
}

function isHoldingDossier(player) {
    try {
        return (
            player
                .getComponent("minecraft:equippable")
                ?.getEquipment("Mainhand")?.typeId === DOSSIER_ITEM_ID
        );
    } catch {
        return false;
    }
}

function getCurrentSoulsFreed() {
    try {
        const objective = getSoulsFreedObjective();
        const participant = getValueParticipant();
        if (!objective || !participant) return 0;
        const score = getObjectiveScore(objective, participant);
        return clamp(typeof score === "number" ? score : 0, 0, 7);
    } catch {
        return 0;
    }
}

function getCursorPixelsFromRotation(player) {
    const rot = player.getRotation();
    return {
        cursorX: CANVAS_CENTER_X + PIXELS_PER_DEGREE * clamp(rot.y, -MAX_YAW_DEG, MAX_YAW_DEG),
        cursorY: CANVAS_CENTER_Y + PIXELS_PER_DEGREE * clamp(rot.x, -MAX_PITCH_DEG, MAX_PITCH_DEG)
    };
}

function computeAheadOffset(player, headPos, forwardDir) {
    try {
        const hit = player.dimension.getBlockFromRay(
            headPos,
            { x: forwardDir.x, y: 0, z: forwardDir.z },
            {
                maxDistance: MAX_AHEAD_OFFSET + WALL_CLEARANCE + 0.5,
                includeLiquidBlocks: false,
                includePassableBlocks: false
            }
        );
        if (!hit) return MAX_AHEAD_OFFSET;
        const hitX = hit.block.location.x + hit.faceLocation.x;
        const hitZ = hit.block.location.z + hit.faceLocation.z;
        const dist = (hitX - headPos.x) * forwardDir.x + (hitZ - headPos.z) * forwardDir.z;
        return clamp(dist - WALL_CLEARANCE - 0.1, 0, MAX_AHEAD_OFFSET);
    } catch {
        return MAX_AHEAD_OFFSET;
    }
}

function easeOptions(seconds) {
    return {
        easeTime: seconds,
        easeType: EasingType.InOutSine
    };
}

// ============================================================================
// 3D ICON MANAGEMENT (GEAR & WEAPONS PAGES)
// ============================================================================

function spawnIconEntity(session) {
    const iconEntity = session.player.dimension.spawnEntity(
        DOSSIER_ICON_ENTITY_ID,
        session.entity.location
    );
    iconEntity.setRotation({ x: 0, y: 0 });
    iconEntity.setDynamicProperty(OWNER_DYNAMIC_PROP, session.player.id);
    iconEntity.setProperty("ibexx_itc:rotation", session.yaw);
    iconEntity.setProperty("ibexx_itc:ahead", session.ahead);
    iconEntity.setProperty("ibexx_itc:icon_scale", 0);
    session.player.setPropertyOverrideForEntity(iconEntity, "ibexx_itc:visible", true);

    const holder = { entity: iconEntity, itemId: undefined };
    session.icons.push(holder);
    return holder;
}

function updatePage3DIcons(session) {
    const slots = PAGE_3D_ICONS[session.page] ?? [];

    while (session.icons.length < slots.length) {
        spawnIconEntity(session);
    }

    for (let i = 0; i < session.icons.length; i++) {
        const holder = session.icons[i];
        if (!isEntityValid(holder.entity)) continue;

        const slot = slots[i];
        if (!slot) {
            holder.entity.setProperty("ibexx_itc:icon_scale", 0);
            continue;
        }

        if (holder.itemId !== slot.itemId) {
            holder.itemId = slot.itemId;
            try {
                holder.entity.runCommand(
                    `replaceitem entity @s slot.weapon.mainhand 0 ${slot.itemId}`
                );
            } catch {}
        }

        const iconPosX = (slot.pixelX - CANVAS_CENTER_X) / 10;
        const iconPosY = (CANVAS_CENTER_Y - slot.pixelY) / 10;

        holder.entity.setProperty("ibexx_itc:icon_pos_x", iconPosX);
        holder.entity.setProperty("ibexx_itc:icon_pos_y", iconPosY);
        holder.entity.setProperty("ibexx_itc:icon_scale", slot.scale);
    }
}

function clearSessionIcons(session) {
    for (const holder of session?.icons ?? []) {
        if (isEntityValid(holder.entity)) {
            try {
                holder.entity.remove();
            } catch {}
        }
    }
    if (session) session.icons = [];
}

// ============================================================================
// OPEN / PAGE SWITCH / CLICK / CLOSE LIFECYCLE
// ============================================================================

export function isDossierOpen(player) {
    return activeSessions.has(player?.id);
}

function setDossierPage(session, newPage) {
    const clampedPage = clamp(newPage | 0, 0, 5);
    session.page = clampedPage;
    session.entity.setProperty("ibexx_itc:page", clampedPage);

    const soulsFreed = getCurrentSoulsFreed();
    session.soulsFreed = soulsFreed;
    session.entity.setProperty("ibexx_itc:souls_freed", soulsFreed);

    updatePage3DIcons(session);

    try {
        session.player.playSound("item.book.page_turn", { volume: 0.6, pitch: 1.0 });
    } catch {}
}

export function openDossier(player) {
    if (!isEntityValid(player) || activeSessions.has(player.id)) return;

    const nowTick = system.currentTick;
    if (nowTick - (lastOpenAttemptTick.get(player.id) ?? -100) < 10) return;
    lastOpenAttemptTick.set(player.id, nowTick);

    if (
        !isHoldingDossier(player) ||
        player.isSneaking ||
        !player.isOnGround ||
        player.isFlying ||
        player.isGliding ||
        player.isSwimming ||
        player.getComponent("minecraft:riding")
    ) {
        return;
    }

    restorePlayerStateIfNeeded(player);

    const savedPage = player.getDynamicProperty(LAST_PAGE_PROP);
    const initialPage = typeof savedPage === "number" && savedPage >= 0 && savedPage <= 5 ? savedPage : 0;

    const initialRot = player.getRotation();
    const radYaw = (initialRot.y * Math.PI) / 180;
    const forwardDir = {
        x: -Math.sin(radYaw),
        z: Math.cos(radYaw)
    };
    const headPos = {
        x: player.location.x,
        y: player.location.y + CAMERA_HEIGHT_OFFSET,
        z: player.location.z
    };

    let dossierEntity;
    try {
        dossierEntity = player.dimension.spawnEntity(DOSSIER_ENTITY_ID, player.location);
        dossierEntity.setRotation({ x: 0, y: 0 });
        dossierEntity.setDynamicProperty(OWNER_DYNAMIC_PROP, player.id);

        let modelYaw = initialRot.y - 180;
        if (modelYaw < -180) modelYaw += 360;

        dossierEntity.setProperty("ibexx_itc:rotation", modelYaw);
        dossierEntity.setProperty("ibexx_itc:souls_freed", getCurrentSoulsFreed());
        player.setPropertyOverrideForEntity(dossierEntity, "ibexx_itc:visible", true);

        const currentlyHiddenHud = player.onScreenDisplay.getHiddenHudElements();
        const hudToRestore = HIDDEN_HUD_ELEMENTS.filter((el) => !currentlyHiddenHud.includes(el));
        const permsToRestore = LOCKED_INPUT_CATEGORIES.filter((cat) =>
            player.inputPermissions.isPermissionCategoryEnabled(cat)
        );

        const savedState = {
            rx: initialRot.x,
            ry: initialRot.y,
            hud: hudToRestore,
            perms: permsToRestore
        };
        player.setDynamicProperty(SAVED_STATE_PROP, JSON.stringify(savedState));

        const aheadOffset = computeAheadOffset(player, headPos, forwardDir);
        dossierEntity.setProperty("ibexx_itc:ahead", aheadOffset);

        const session = {
            player,
            entity: dossierEntity,
            page: initialPage,
            soulsFreed: getCurrentSoulsFreed(),
            lastClickTick: 0,
            startTick: nowTick,
            yaw: modelYaw,
            ahead: aheadOffset,
            headPos,
            icons: [],
            savedState
        };

        activeSessions.set(player.id, session);
        setDossierPage(session, initialPage);

        for (const cat of permsToRestore) {
            player.inputPermissions.setPermissionCategory(cat, false);
        }
        if (hudToRestore.length > 0) {
            player.onScreenDisplay.setHudVisibility(HudVisibility.Hide, hudToRestore);
        }

        const camPos = {
            x: headPos.x + forwardDir.x * aheadOffset,
            y: headPos.y,
            z: headPos.z + forwardDir.z * aheadOffset
        };

        player.camera.setCamera("minecraft:free", {
            location: camPos,
            facingLocation: {
                x: camPos.x + forwardDir.x,
                y: camPos.y,
                z: camPos.z + forwardDir.z
            },
            easeOptions: easeOptions(OPEN_EASE_SECONDS)
        });

        try {
            player.camera.setFov({
                fov: CAMERA_FOV,
                easeOptions: easeOptions(OPEN_EASE_SECONDS)
            });
        } catch {}

        // Tick +1: Zero player head rotation so cursor starts at center (200, 130)
        system.runTimeout(() => {
            if (activeSessions.get(player.id) !== session || !isEntityValid(player)) return;
            player.teleport(player.location, {
                rotation: { x: 0, y: 0 },
                keepVelocity: false
            });
        }, 1);

        // Tick +2: Mount player onto dossier rideable seat to lock movement & catch Sneak dismount
        system.runTimeout(() => {
            if (
                activeSessions.get(player.id) !== session ||
                !isEntityValid(player) ||
                !isEntityValid(dossierEntity)
            ) {
                return;
            }
            try {
                dossierEntity.getComponent("minecraft:rideable")?.addRider(player);
            } catch {
                closeDossier(player);
            }
        }, 2);
    } catch {
        clearSessionIcons(activeSessions.get(player.id));
        activeSessions.delete(player.id);
        if (isEntityValid(dossierEntity)) {
            try {
                dossierEntity.remove();
            } catch {}
        }
        restorePlayerStateIfNeeded(player);
    }
}

export function closeDossier(player) {
    const session = activeSessions.get(player?.id);
    activeSessions.delete(player?.id);

    if (session && isEntityValid(player)) {
        player.setDynamicProperty(LAST_PAGE_PROP, session.page);
    }

    clearSessionIcons(session);

    const dossierEntity = session?.entity;
    if (isEntityValid(dossierEntity)) {
        try {
            player.clearPropertyOverridesForEntity(dossierEntity);
        } catch {}
        system.run(() => {
            if (isEntityValid(dossierEntity)) {
                try {
                    dossierEntity.remove();
                } catch {}
            }
        });
    }

    if (!isEntityValid(player)) return;
    if (!session) {
        restorePlayerStateIfNeeded(player);
        return;
    }

    try {
        player.playSound("item.book.page_turn", { volume: 0.6, pitch: 0.8 });
    } catch {}

    const saved = session.savedState;
    if (typeof saved?.rx !== "number") {
        restorePlayerStateIfNeeded(player);
        return;
    }

    try {
        player.teleport(player.location, {
            rotation: { x: saved.rx, y: saved.ry },
            keepVelocity: false
        });
        player.camera.setCamera("minecraft:free", {
            location: session.headPos,
            rotation: { x: saved.rx, y: saved.ry },
            easeOptions: easeOptions(CLOSE_EASE_SECONDS)
        });
    } catch {
        restorePlayerStateIfNeeded(player);
        return;
    }

    system.runTimeout(() => {
        if (isEntityValid(player) && !activeSessions.has(player.id)) {
            restorePlayerStateIfNeeded(player);
        }
    }, Math.round(CLOSE_EASE_SECONDS * 20));
}

function restorePlayerStateIfNeeded(player) {
    if (!isEntityValid(player)) return;
    const raw = player.getDynamicProperty(SAVED_STATE_PROP);
    if (typeof raw !== "string") return;

    let saved = {};
    try {
        saved = JSON.parse(raw);
    } catch {}

    try {
        player.camera.clear();
    } catch {}
    try {
        player.runCommand("camera @s fov_clear");
    } catch {}

    const perms = Array.isArray(saved.perms) ? saved.perms : LOCKED_INPUT_CATEGORIES;
    for (const cat of perms) {
        try {
            player.inputPermissions.setPermissionCategory(cat, true);
        } catch {}
    }

    if (Array.isArray(saved.hud) && saved.hud.length > 0) {
        try {
            player.onScreenDisplay.setHudVisibility(HudVisibility.Reset, saved.hud);
        } catch {}
    }

    if (typeof saved.rx === "number" && typeof saved.ry === "number") {
        try {
            player.teleport(player.location, {
                rotation: { x: saved.rx, y: saved.ry },
                keepVelocity: false
            });
        } catch {}
    }

    player.setDynamicProperty(SAVED_STATE_PROP, undefined);
}

function handleDossierClick(player) {
    const session = activeSessions.get(player.id);
    if (!session || system.currentTick - session.lastClickTick < 4) return;
    session.lastClickTick = system.currentTick;

    const { cursorX, cursorY } = getCursorPixelsFromRotation(player);

    for (const btn of TOP_TAB_BUTTONS) {
        if (
            cursorX >= btn.x0 &&
            cursorX <= btn.x1 &&
            cursorY >= btn.y0 &&
            cursorY <= btn.y1
        ) {
            if (btn.action === "page") {
                if (session.page !== btn.targetPage) {
                    setDossierPage(session, btn.targetPage);
                }
            } else if (btn.action === "close") {
                closeDossier(player);
            }
            return;
        }
    }
}

// ============================================================================
// EVENT SUBSCRIPTIONS & TICK MONITOR
// ============================================================================

// 1. Right-click / Use Case File Dossier item to open
world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
    if (itemStack?.typeId !== DOSSIER_ITEM_ID || source?.typeId !== "minecraft:player") return;
    system.run(() => openDossier(source));
});

// 2. Left-click on the Dossier entity to click tabs or [X] close button
world.afterEvents.entityHitEntity.subscribe(({ damagingEntity, hitEntity }) => {
    if (
        hitEntity?.typeId !== DOSSIER_ENTITY_ID ||
        damagingEntity?.typeId !== "minecraft:player"
    ) {
        return;
    }
    const session = activeSessions.get(damagingEntity.id);
    if (!session || session.entity.id !== hitEntity.id) return;

    try {
        damagingEntity.runCommand("stopsound @s game.player.attack.strong");
        damagingEntity.runCommand("stopsound @s game.player.attack.nodamage");
    } catch {}

    handleDossierClick(damagingEntity);
});

// 3. Per-tick monitor: check dismount (Sneak), hotbar switch, or live souls_freed update
system.runInterval(() => {
    for (const [playerId, session] of activeSessions) {
        const player = session.player;
        if (!isEntityValid(player)) {
            activeSessions.delete(playerId);
            clearSessionIcons(session);
            if (isEntityValid(session.entity)) {
                try {
                    session.entity.remove();
                } catch {}
            }
            continue;
        }

        try {
            if (!isEntityValid(session.entity) || !isHoldingDossier(player) || player.isSneaking) {
                closeDossier(player);
                continue;
            }

            if (system.currentTick - session.startTick > 5) {
                const rideable = session.entity.getComponent("minecraft:rideable");
                if (rideable?.getRiders()[0]?.id !== player.id) {
                    closeDossier(player);
                    continue;
                }
            }

            // Live sync souls_freed scoreboard every 20 ticks while viewing STATUS (Page 5)
            if (system.currentTick % 20 === 0) {
                const currentSouls = getCurrentSoulsFreed();
                if (currentSouls !== session.soulsFreed) {
                    session.soulsFreed = currentSouls;
                    session.entity.setProperty("ibexx_itc:souls_freed", currentSouls);
                }
            }
        } catch {
            closeDossier(player);
        }
    }
}, 1);
