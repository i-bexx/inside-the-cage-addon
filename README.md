# Inside the Cage ⛓️

> **Developed by [i-bexx](https://github.com/i-bexx)** — Software Engineering Student & Minecraft Bedrock Add-On Developer  
> 📧 yigitkarabacak364@gmail.com

**Inside the Cage** is a complex, server-side Minecraft Bedrock Add-On built primarily with the **Minecraft Script API (`@minecraft/server`)**. It transforms the base game into a psychological horror survival experience.

It serves as a technical showcase of architecting complex systems—such as reactive state management, custom UI frameworks, and robust event-driven entities—within the strict constraints of an undocumented, single-threaded environment.

## 📊 Project at a Glance

| Metric | Value |
|--------|------:|
| Script API Modules | 30+ |
| Custom JSON UI Files | 39 |
| Custom Entities | 13 |
| Animation Controllers | 10+ |
| Custom Particle Effects | 8 |

<div align="center">
  <img src="./assets/images/full_hud.png" alt="Full Gameplay HUD" width="800"/>
  <br>
  <i>Full custom HUD featuring dynamic tracking, live stamina, and animated overlays.</i>
</div>

---

## 🚀 Engineering Highlights

- 🧠 **Reactive State Management:** Built a custom `Proxy`-based state system from scratch to decouple game logic from rendering updates, ensuring deterministic state propagation and reliable UI synchronization.
- 🎨 **JSON UI Reverse Engineering:** Overhauled Minecraft's hardcoded UI engine using Factory patterns to create dynamic, real-time data binding for custom HUDs and radar systems.
- 👁️ **Concurrent Raycast Tracking:** Engineered a multiplayer-safe, line-of-sight tracking system utilizing server-side raycasting and hash-based entity matching for stalker AI mechanics.
- 📡 **Real-Time Data Processing:** Implemented 3D Euclidean distance algorithms and ETA calculations for the "Cage Detector" radar, injecting calculated data directly into vanilla UI components.

---

## 🛠️ Core Technologies

`JavaScript (ES6+)` · `Minecraft Script API` · `JSON UI` · `Molang` · `Event-Driven Architecture` · `State Machines` · `Blockbench`

---

## 🏗️ Architecture & System Design

### Modular Codebase (`@minecraft/server`)

The core game loop is managed through 30+ modular JavaScript modules with a strict separation of concerns, enabling maintainable and scalable gameplay systems.

- **Per-Player Memory Isolation:** Utilized `Map()` objects to maintain isolated player state. Player disconnect events trigger cleanup of all associated references, preventing stale state and memory growth during long-running multiplayer sessions.
- **Entity-Script Bridge:** A seamless two-way communication layer where the Script API drives entity states via `triggerEvent()`, while entity Animation Controllers execute commands that feed telemetry back to the scripts.
- **Centralized Data Access:** Null-safe getter modules that prevent runtime crashes when game objects despawn unexpectedly.

### Advanced UI

Minecraft Bedrock exposes no official runtime UI API. To overcome this limitation, the project reverse-engineers the vanilla JSON UI framework to build a dynamic, real-time interface system.

- **Server Form Routing:** Modified vanilla `server_form.json` components to act as a dynamic router, switching between panels based on injected string data.
- **Vanilla Notification Hijacking:** Repurposed the engine's hardcoded "recipe unlock" toast notifications. By modifying scope resolution (`resolve_sibling_scope`), the system displays custom in-game alerts (e.g., "Coin Bag is Full").
- **Live 3D Rendering:** Embedded `live_player_renderer` components within custom HUD frames, synchronized with global engine variables (`#hud_title_text_string`) to update without redundant server-side polling.

---

## 📸 Visual Showcase

<table>
  <tr>
    <td align="center"><b>Live 3D HUD & Sanity Feedback</b><br><img src="./assets/gifs/mini_player.gif" alt="Mini Player" width="400"/></td>
    <td align="center"><b>Real-Time Radar Calculation</b><br><img src="./assets/gifs/main_panel.gif" alt="Radar Panel" width="400"/></td>
  </tr>
  <tr>
    <td align="center"><b>VHS Static Rendering via Molang</b><br><img src="./assets/gifs/static_normal.gif" alt="Static Normal" width="400"/></td>
    <td align="center"><b>Frame-by-Frame UI Animations</b><br><img src="./assets/gifs/compass.gif" alt="Compass" width="400"/></td>
  </tr>
</table>

---

## 📚 Detailed Documentation

For deeper technical discussions, refer to the following documentation:

- 🔬 **[Advanced UI Systems](./docs/ADVANCED_UI.md):** Interactive dialogue engines, radar logic, and toast hijacking.
- ⚙️ **[Entity Systems & Molang](./docs/ENTITY_SYSTEMS.md):** Custom entity components, render controllers, and conditional Molang expressions.
- 🎬 **[Animation State Machines](./docs/ANIMATION_STATE_MACHINES.md):** Weapon systems, AI transitions, and behavior-pack animation logic.
- 🎮 **[Gameplay Mechanics](./docs/GAMEPLAY_MECHANICS.md):** Overview of the survival, horror, and progression systems.

---

## 📥 Current Status & Availability

This project is currently in **active development** and is published primarily as a software engineering portfolio and technical showcase.

A compiled, playable `.mcpack` release will be made publicly available once development reaches a stable milestone.

---

**⚖️ Legal Disclaimer:** *This project is an independent community creation for Minecraft Bedrock Edition and contains modified versions of original game UI code structures (e.g., `server_form.json`). © Mojang AB and © Microsoft Corporation. All rights reserved for the original game assets and baseline code structures. It is not an official Minecraft product and is not approved by or associated with Mojang or Microsoft.*