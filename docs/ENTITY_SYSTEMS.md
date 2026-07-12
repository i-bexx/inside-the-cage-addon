# 🔧 Entity Systems & Molang Usage

This document details the specific entities and Molang logic driving the gameplay in *Inside the Cage*.

*← Back to [Main README](../README.md)*

## Custom Entities

| Entity | Description | Key Components |
|--------|-------------|----------------|
| `minecraft:player` (modified) | 20+ component groups, 30+ events for cursor state, shooting, static effects, battery, movement control | `mark_variant`, `skin_id`, `variant`, `type_family`, `movement` |
| `game:stalker_cursor` | Per-player invisible tracker entity — follows player's line-of-sight via Script API raycast | Scoreboard-based hash matching for multiplayer sync |
| `game:hostile` | Dynamic enemy with hunt/patrol AI, death animation states | `navigation.walk`, `behavior.nearest_attackable_target`, conditional animations |
| `game:cage` | Interactable cage entity with broken/unbroken states | `mark_variant` state switching via events |
| `game:coin` / `game:battery` / `game:bottle` | Collectible items with pickup detection | `interact` component + Script API event handlers |
| `game:door` | State-driven door with host-waiting and open states | Multi-state `mark_variant` event system |
| `game:null` | Slenderman-style stalker entity — constantly follows player and triggers rapid sanity drain when looked at | Line-of-sight detection & proximity tracking |
| `game:password_label` | Static visual text entity | Displays the password to the player |
| `game:random_peep` | Story-driven interactive NPC | `interact` → Script API panel routing |
| `menu:new_game` / `menu:continue` | Interactive menu system entities | Used for main menu state routing |
| `game:teleporter` | Multi-destination teleport pads | Scoreboard-indexed destination mapping |

## Molang Usage

Molang is heavily utilized across the project for state-driven rendering and animation triggers:

- **Conditional rendering:** `q.variant`, `q.mark_variant`, and `q.skin_id` are used across render controllers to dynamically switch textures based on the game state (e.g., swapping crosshair colors when aiming at different targets).
- **Animation conditions:** `q.is_item_equipped` and `q.get_equipped_item_name` gate weapon-specific animation triggers, preventing invalid state transitions.
- **Math expressions:** Expressions like `math.floor` and `math.mod` are injected into animation files to control frame-based UI animations, ensuring smooth playback independent of server lag.
