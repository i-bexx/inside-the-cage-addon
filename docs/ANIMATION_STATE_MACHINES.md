# 🎬 Animation State Machines & Render Controllers

*← Back to [Main README](../README.md)*

## Behavior Pack Animation Controllers (State Machines)

Complex state machines drive player and entity behaviors on the server side:

- **Gun System** (`controller.animation.gun`): Multi-state weapon logic. Handles the flow of `idle → draw → aim → shoot → not_shooting` with Molang-driven transitions based on `q.variant` and `q.mark_variant`.
- **Ammo System** (`controller.animation.gun_no_ammo`, `controller.animation.ammo_reload`): Evaluates Molang queries against the `ammo` scoreboard objective (e.g., `query.scoreboard('ammo') == 0`) to trigger empty magazine warnings, reload animations, and synchronize state with the custom UI.
- **Toxic Bomb** (`controller.animation.toxic_bomb`): Deployable area-of-effect weapon logic, utilizing `q.is_item_equipped` gating to ensure proper deployment states.
- **Kit System** (`controller.animation.kit`): Item-use detection utilizing `query.is_using_item` to trigger specific behavior-pack animations and server events.
- **Camera Static Effects** (`controller.animation.camera_no_signal`, `controller.animation.used_cam_when_could`): Sanity-driven state machine that applies VHS noise, screen shake, and signal loss effects based on player stats.
  <br><img src="../assets/gifs/static_glitch.gif" alt="Glitch Static" width="400"/>
- **Hostile AI** (`controller.animation.hostile`): Manages entity behavior transitions like Patrol → Chase → Attack.

## Animations

- **Server-Side (Behavior Pack):** Executed via `/execute`, `playsound`, and `camerashake` commands, these animations are tightly synchronized with Script API state changes to ensure deterministic outcomes.
- **Client-Side (Resource Pack):** Handles frame-by-frame flipbook animations for UI elements (like weapon hitmarkers), player bone animations for weapon draw/aim/shoot cycles, and visual screen effects like VHS glitches.

## Render Controllers

Three custom render controllers handle conditional texture switching based on entity state data provided by the server:

| Controller | Purpose | Molang Logic |
|-----------|---------|------|
| `controller.render.hostile` | Core render controller for the hostile entity. | Binds geometry and defaults materials/textures. |
| `controller.render.stalker_cursor` | Per-player cursor color system (normal/green/blue/red). | Relies on `q.skin_id` index mapping to assign colors uniquely per client. |
