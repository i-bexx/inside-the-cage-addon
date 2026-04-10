⚠️ Status: Alpha Build
This addon and its accompanying world are currently in the Alpha stage of development. Features are actively being worked on, and gameplay mechanics are subject to change.

🛑 Important Note: This is a World-Specific Addon. It is specifically designed to work exclusively within a custom-built Minecraft map (currently in development). It is not intended for standard, randomly generated survival worlds.

🔦 Core Features
🏃 Stamina & Movement System
To enhance the survival experience, a custom Stamina mechanic is implemented:

Running for extended periods during a round will deplete your stamina.

When exhausted, your movement speed will significantly decrease.

You must stop sprinting and rest to recover your stamina and regain full speed.

📸 Custom Camera & Vision System
Players start with a custom camera item. Using it opens a realistic camera overlay (built with custom geo.json models). Watch your surroundings through the lens, but beware of what lurks in the shadows.

🧠 Sanity Mechanic
A mysterious entity roams the forest.

Looking directly at it drains your Sanity much faster.

As danger approaches, you'll experience screen shaking and static effects on your camera overlay.

If your sanity drops to 0, you are teleported to a dark dimension with an animated, static "Game Over" screen.

💰 Economy & Shop System
Custom coin entities spawn across the map. Collect them to increase your balance and use the Shop Item to purchase gear:

🩹 Survival Kit: Restores sanity to maximum.

⚔️ Weapons & Ammo: Buy a Pistol, Knife, Toxic Bomb, or ammunition.

👻 Win Condition
At the start of each round, 7 lanterns spawn in predefined locations. Find and break them to release the blue souls trapped inside to win.

⚔️ Combat
As time passes, "hostile" entities will spawn and hunt you down. Use your purchased arsenal to defend yourself.

🖥️ Custom HUD (JSON UI)
A fully custom, highly responsive user interface provides real-time data without relying on ticking functions that lag the server:

Bottom Middle (Above Hotbar): A fully animated Stamina Bar providing visual feedback on your exhaustion level.

Top Left (Sanity & Player Model): Housed in a custom wooden frame, this area features a live 3D model of the player. It utilizes a Dual-Feedback Sanity System: a highly detailed, dynamic Eye Icon for immediate visual cues, paired with a precise text readout shifting between STABLE, NORMAL, and POOR.

Bottom Right: Real-time coin balance.

Top Right: Dynamic compass and coordinates. (Survival Twist: Coordinates will be forcefully disabled mid-round, accompanied by custom VHS-style "position lost" visual glitches!)

🛠️ Technical Highlights (Under the Hood)
This project heavily utilizes advanced Bedrock JSON UI scripting to bypass standard engine limitations:

Live 3D UI Rendering: Implementation of the live_player_renderer component to display a real-time, interactive 3D model of the player directly inside the 2D HUD frame.

Dual-State UI Synchronization: Utilizing baseline engine globals (like #hud_title_text_string) as data carriers to seamlessly synchronize multiple UI components—such as the dynamic Eye texture and the Sanity text—without server-side delay.

Scope Resolution & Reactive UI: Custom implementation of sibling scope targeting (resolve_sibling_scope) to create reactive UI elements without redundant scoreboard queries.

Custom Animations: Frame-by-frame UI animations (like the stamina bar depletion) and glitch effects integrated directly into the HUD panels.

⚖️ Legal Disclaimer
This project is an independent community creation for Minecraft Bedrock Edition and contains modified versions of original game UI code structures (e.g., server_form.json).

(c) Mojang AB and (c) Microsoft Corporation. All rights reserved for the original game assets and baseline code structures.

It is not an official Minecraft product and is not approved by or associated with Mojang or Microsoft.

📥 Downloads & Support
This project is currently in active development (Alpha).

Once a playable build is ready, I will be providing:

Free Downloads for the public community.

Patreon Early Access for those who want to support the development and get updates before anyone else.

Stay tuned for updates!
