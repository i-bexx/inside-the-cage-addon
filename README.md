# Inside the Cage ⛓️

> **Developed by [i-bexx](https://github.com/i-bexx)** — Software Engineering Student & Minecraft Bedrock Add-On Developer  
> 📧 yigitkarabacak364@gmail.com ·

**Inside the Cage** is a complex, server-side Minecraft Bedrock Add-On. Built heavily upon the **Minecraft Script API (`@minecraft/server`)**, this project transforms the base game into a psychological horror survival experience. 

It serves as a technical showcase of architecting complex systems—such as reactive state management, custom UI frameworks, and robust event-driven entities—within the strict constraints of an undocumented, single-threaded environment.

---

## 🚀 Engineering Highlights

- 🧠 **Reactive State Management:** Built a custom `Proxy`-based state system from scratch to decouple game logic from rendering updates, preventing race conditions and ensuring deterministic UI sync.
- 🎨 **JSON UI Reverse Engineering:** Overhauled Minecraft's hardcoded UI engine using Factory patterns to create dynamic, real-time data binding for custom HUDs and radar systems.
- 👁️ **Concurrent Raycast Tracking:** Engineered a multiplayer-safe, line-of-sight tracking system utilizing server-side raycasting and hash-based entity matching for stalker AI mechanics.
- ⏱️ **Optimized Tick Architecture:** Designed a multi-threaded-style tick controller (separating high-frequency stamina updates from low-frequency state polling) to maintain 20 TPS on mobile clients.
- 📡 **Real-Time Data Processing:** Implemented 3D Euclidean distance algorithms and ETA calculations for the "Cage Detector" radar, injecting calculated data directly into Vanilla UI components.

---

## 🛠️ Core Technologies

`JavaScript (ES6+)` · `Minecraft Script API` · `JSON UI` · `Molang` · `Event-Driven Architecture` · `State Machines` · `Blockbench` 

---

## 🏗️ Architecture & System Design

### Modular Codebase (`@minecraft/server`)
The core game loop is managed by 30+ modular JavaScript files with a strict separation of concerns, avoiding the "spaghetti code":

- **Per-Player Memory Isolation:** Utilized `Map()` objects for isolated player states. Disconnect events trigger rigorous garbage collection to prevent memory leaks in long-running servers.
- **Entity-Script Bridge:** A seamless two-way communication layer where the Script API drives entity states via `triggerEvent()`, and entity Animation Controllers execute commands that feed telemetry back to the scripts.
- **Centralized Data Access:** Null-safe getter modules, preventing runtime crashes when game objects despawn unexpectedly.

### Advanced UI
Minecraft Bedrock lacks an official UI API. This project relies on extensive reverse-engineering of the vanilla JSON UI framework:
- **Server Form Routing:** Modified vanilla `server_form.json` components to act as a dynamic router, switching between panels based on injected string data.
- **Vanilla Notification Hijacking:** Repurposed the engine's hardcoded "recipe unlock" toast notifications. By modifying scope resolution (`resolve_sibling_scope`), the system now displays custom in-game alerts (e.g., "Coin bag is Full").
- **Live 3D Rendering:** Embedded `live_player_renderer` components within custom HUD frames, synchronized with global engine variables (`#hud_title_text_string`) to update without redundant server-side polling.

---

## 📸 Visual Showcase

<table>
  <tr>
    <td align="center"><b>Live 3D HUD & Sanity Feedback</b><br><img src="./assets/gifs/mini_player.gif" alt="Mini Player" width="400"/></td>
    <td align="center"><b>Real-Time Radar Calculation</b><br><img src="./assets/gifs/main_panel.gif" alt="Radar Panel" width="400"/></td>
  </tr>
  <tr>
    <td align="center"><b>VHS Static rendering via Molang</b><br><img src="./assets/gifs/static_normal.gif" alt="Static Normal" width="400"/></td>
    <td align="center"><b>Frame-by-frame UI Animations</b><br><img src="./assets/gifs/compass.gif" alt="Compass" width="400"/></td>
  </tr>
</table>

---

## 📚 Detailed Documentation

For deep dives into specific implementations, refer to the following documentation:

- 🔬 **[Advanced UI Systems](./docs/ADVANCED_UI.md):** Interactive dialogue engines, radar logic, and toast hijacking.
- ⚙️ **[Entity Systems & Molang](./docs/ENTITY_SYSTEMS.md):** Breakdown of custom entity components and conditional rendering math.
- 🎬 **[Animation State Machines](./docs/ANIMATION_STATE_MACHINES.md):** How the behavior pack handles complex weapon logic and AI transitions.
- 🎮 **[Gameplay Mechanics](./docs/GAMEPLAY_MECHANICS.md):** Overview of the psychological horror and survival features.

---

## 📥 Current Status & Availability

This project is currently in **Active Development**. The source code is provided here primarily for portfolio and peer review purposes. 

A compiled, playable `.mcpack` release will be made available to the public upon finalization.

---

**⚖️ Legal Disclaimer:** *This project is an independent community creation for Minecraft Bedrock Edition and contains modified versions of original game UI code structures (e.g., `server_form.json`). (c) Mojang AB and (c) Microsoft Corporation. All rights reserved for the original game assets and baseline code structures. It is not an official Minecraft product and is not approved by or associated with Mojang or Microsoft.*
