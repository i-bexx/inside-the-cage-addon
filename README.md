# Inside the Cage ⛓️

> **Developed by [i-bexx](https://github.com/i-bexx)** — Minecraft Bedrock Systems & UI Developer  
> 📧 yigitkarabacak364@gmail.com

**Inside the Cage** is a full-scale, multiplayer-ready survival and action experience built in Minecraft Bedrock Edition.

<div align="center">
  <img src="./assets/images/full_hud.png" alt="Full Gameplay HUD" width="850"/>
  <br>
  <i>Custom in-game HUD featuring live 3D character rendering, stamina tracking, radar telemetry, and animated overlays.</i>
</div>

---

## 🎮 Gameplay Showcase

### 1. Branching NPC Dialogue Engine
A multi-scene conversation system with player choices, persistent NPC memory, and synchronized entity animations—built entirely without external mods.
- **Typewriter Text Reveal:** Progressive left-to-right text animation with custom dialogue framing.
- **Choices With Consequences:** Selecting *"Yes"* triggers an entity animation where the injured NPC physically stands up; the NPC remembers your decision across visits.
- **Multiplayer Locking:** Prevents overlapping interactions while a player is mid-conversation.

<div align="center">
  <img src="./assets/gifs/random_peep.gif" alt="Interactive NPC Dialogue" width="750"/>
</div>

---

### 2. Handheld Radar Scanner (`Cage Detector`)
A custom tracking device players use to hunt down 7 hidden cages across the map, displaying real-time spatial telemetry inside a custom UI panel.
- **Live 3D Math:** Calculates real-time 3D Euclidean distance, compass direction, elevation difference, and walking ETA.
- **Dynamic Signal & Noise:** Shifts signal-strength icons based on proximity, layered over a 3-phase flickering radar static animation.

<div align="center">
  <img src="./assets/gifs/cage_detector.gif" alt="Cage Detector Radar" width="750"/>
</div>

---

### 3. VHS Camera Overlay & Line-of-Sight Sanity System
Players carry a custom camera that applies a full-screen lens overlay and interacts directly with enemy visibility.
- **Raycast Sanity Drain:** Maintaining line-of-sight with the Stalker triggers progressive sanity loss, intensifying VHS static, screen shake, and heartbeat audio.
- **Signal Interference:** Dropping to zero sanity triggers a full camera signal-loss state and animated Game Over sequence.

<table>
  <tr>
    <td align="center"><b>Active Camera View (Normal Signal)</b><br><img src="./assets/gifs/static_normal.gif" alt="Camera Static Normal" width="420"/></td>
    <td align="center"><b>Sanity Drain & Signal Interference</b><br><img src="./assets/gifs/static_glitch.gif" alt="Camera Glitch" width="420"/></td>
  </tr>
</table>

---

### 4. Real-Time HUD Telemetry, Stamina & Custom Alerts
Every element on the player's screen is dynamically driven by server state.

<table>
  <tr>
    <td align="center"><b>Live 3D Doll & Sanity Feedback</b><br><img src="./assets/gifs/mini_player.gif" alt="Mini Player" width="420"/></td>
    <td align="center"><b>Dynamic Status Panel</b><br><img src="./assets/gifs/main_panel.gif" alt="Main Panel" width="420"/></td>
  </tr>
  <tr>
    <td align="center"><b>Live Compass & Coordinates</b><br><img src="./assets/gifs/compass.gif" alt="Compass" width="420"/></td>
    <td align="center"><b>Signal / Position Lost Alert</b><br><img src="./assets/gifs/position_lost.gif" alt="Position Lost" width="420"/></td>
  </tr>
  <tr>
    <td align="center"><b>Stamina Depletion</b><br><img src="./assets/gifs/stamina_bar_deplete.gif" alt="Stamina Deplete" width="420"/></td>
    <td align="center"><b>Stamina Regeneration</b><br><img src="./assets/gifs/stamina_bar_fill.gif" alt="Stamina Fill" width="420"/></td>
  </tr>
</table>

<div align="center">
  <b>Custom Toast Notification Popup (Vanilla Toast Hijacking)</b><br>
  <img src="./assets/gifs/toast_screen.gif" alt="Custom Toast" width="420"/>
</div>

---

## 📥 Project Status

**Inside the Cage** is actively developed as a flagship technical showcase. A compiled `.mcpack` build will be released upon reaching the next major milestone.
