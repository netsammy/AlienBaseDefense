# May 12 GLB Asset Import

Source folder: `G:\AI Games\3D glb Assets\May 12`

Destination folder: `public/assets/models`

## Imported Assets

| Source file | Imported as | Notes |
| --- | --- | --- |
| `Copilot3D-09930625-be2b-4f59-a4ff-e41487ca88d1.glb` | `alien_boss_horned.glb` | Horned boss alien |
| `Copilot3D-09976895-94e8-458a-9466-79274f4a4f90.glb` | `alien_runner_purple.glb` | Purple runner-style alien |
| `Copilot3D-1672707d-c3d2-464c-9b9a-f1af4d720a0c.glb` | `weapon_plasma_cannon.glb` | Heavy plasma weapon |
| `Copilot3D-1b7e33e4-3cf0-405c-8c07-e8e5995b5782.glb` | `peshawar_gate.glb` | Gate / city landmark prop |
| `Copilot3D-1ef1419a-ebc5-44b9-bbc7-e005aacc3292.glb` | `city_watchtower.glb` | Watchtower / tower prop |
| `Copilot3D-202e2fd5-260d-457a-95d2-7af13f1f31b1.glb` | `alien_grunt_green.glb` | Green alien grunt |
| `Copilot3D-305ac4b0-9424-4253-9d7c-6c1c4c4b8e35.glb` | `karachi_shipping_container.glb` | Container prop |
| `Copilot3D-86f53fcb-0327-41e4-a7a1-f616ed74e5ad.glb` | `road_barricade_urdu.glb` | Road barricade prop |
| `Copilot3D-9d08e747-81b9-4d62-9b78-f657da0c446e.glb` | `upgrade_shop_workbench.glb` | Shop/workbench prop |
| `Copilot3D-a6db2b8e-c617-4675-aaa7-93043d744f23.glb` | `alien_brute_armored.glb` | Armored brute alien |
| `Copilot3D-ad484590-0245-4e65-9330-cbc42cb60084.glb` | `street_planter_barrier.glb` | Street planter/barrier prop |
| `Copilot3D-b9c48747-d7ed-4ac1-a335-6acdfed4ea1b.glb` | `alien_brute_purple.glb` | Purple brute alien |
| `Copilot3D-c1406fca-ec82-4151-9c5f-c69b4233db04.glb` | `sector_sign_board.glb` | Sign board prop |
| `Copilot3D-cd4b7016-86ee-44ef-8dc5-02c28fb984a4.glb` | `sandbag_wall.glb` | Sandbag / cover wall |
| `Copilot3D-d1e6c082-25b2-4df8-8420-b7b6e52bf34b.glb` | `market_stall_crates.glb` | Market stall / crates prop |

## Duplicate Source Files Skipped

These files had identical SHA-256 hashes to imported files and were not copied again:

| Duplicate source file | Same as imported asset |
| --- | --- |
| `Copilot3D-eaa7d662-c584-4c60-8b23-b282c83b1ea8.glb` | `alien_boss_horned.glb` |
| `Copilot3D-50d0ca9d-ceb6-4f08-b1f2-ec4a972e3eb1.glb` | `peshawar_gate.glb` |
| `Copilot3D-d5e51f45-bbc7-4dc3-8f0f-87a2bc424bdb.glb` | `karachi_shipping_container.glb` |
| `Copilot3D-ed054049-662d-4666-98e8-2d5b69f7bce7.glb` | `market_stall_crates.glb` |

## Inspection Notes

- All imported files loaded successfully in Babylon.js.
- All imported files are static GLBs with no animation clips.
- Each imported GLB uses a small mesh count but high vertex count, roughly 84k-95k indices per model.
- Several models should be optimized before mobile/Android builds.
- The unused original `alien_withanimations.glb` was removed from `public/assets/models`; the game uses `alien_withanimations_webp.glb`.
