# Alien Base Defense

Alien Base Defense is a Babylon.js browser FPS prototype where you defend a base from waves of alien attackers. Pick a difficulty, stay inside the defense zone, collect supplies, and keep the base shield alive.

## Setup

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
npm run preview
```

## Store Preparation Status

- PWA metadata is in place with `public/manifest.webmanifest`, `public/icon.svg`, and a production service worker.
- Startup now preloads only core combat GLBs first; city/stage prop GLBs lazy-load when their stage is selected.
- Android packaging is not created yet. Next step: add Capacitor, generate an Android project, build a signed `.aab`, and test on real devices.
- Windows Store packaging is not created yet. Next step: package the PWA as MSIX and run the Windows App Certification Kit.
- Store art still needed: PNG icons, feature graphic, screenshots, trailer/key art, privacy policy page, and age-rating answers.

## Controls

- W/A/S/D = move
- Mouse = look around
- Left Click = fire
- R = reload
- Shift = sprint
- Space = jump
- Restart button = restart game

## Current Features

- Babylon.js rendering with FPS camera movement
- Easy, Normal, and Hard difficulty modes
- Wave and stage progression
- 3, 2, 1, Fight wave countdown before enemies spawn
- Inter-wave reward choices for shield repair, ammo capacity, and rifle tuning
- Reward choices are functional: repair increases max shield, ammo increases magazine size, and rifle tuning improves fire rate and damage
- Alien enemies that chase and attack the player
- Alien health bars for clearer combat feedback
- Alien radar map showing base zone, player heading, and alien positions
- Alien variants: grunt, runner, brute, and boss waves
- New static GLB alien variants wired into gameplay: green grunt, purple runner, armored brute, and horned boss
- Alien Test Lab from the main menu to preview imported alien, weapon, and city prop GLBs
- Quick-kill combo score bonuses
- Optional `alien_enemy.glb` enemy model loading with primitive fallback
- Optional `plasma_rifle.glb` weapon model loading with primitive fallback
- Base defense zone and base shield health
- Base shield color/pulse feedback as it takes damage
- Player health, ammo, reload, sprint, and jump
- Health and ammo pickups
- Placeholder oscillator sound effects for gun fire, hits, death, reload, pickups, and base damage
- Pause menu with Resume, Restart, and Main Menu
- Local best score saved in `localStorage`
- Mobile touch controls with joystick, fire, reload, and sprint buttons
- Muzzle flash, recoil, screen shake, bullet tracer, hit flash, impact, and explosion effects
- Lightweight arena dressing with fog, stars, perimeter posts, and crystals
- Lahore-themed first arena props with truck-art base panels, food cart, and chai stall placeholders
- Stage select cities: Lahore, Karachi, Islamabad, and Peshawar themed placeholder arenas
- Imported May 12 GLB props now appear in city arenas, including gates, containers, barricades, signs, stalls, and sandbags
- Core combat GLBs preload at launch; city prop GLBs lazy-load per selected stage for faster startup
- Persistent coin save and permanent upgrade shop
- Starter base-defense towers: plasma turret and slow-field tower
- Visible tower range rings and softer tower damage so defenses support the player without dominating early waves
- Restart flow

## Alien Wave Schedule

- Stage 1, Rookie, waves 1-3: green grunts are the main threat; purple runners start appearing from wave 2.
- Stage 2, Soldier, waves 4-6: every wave includes a stronger special threat mix, with runners and armored brutes pushing the base.
- Stage 3, Veteran, waves 7-10: forced runner/brute pressure plus heavier random mixes.
- Stage 4, Nightmare, waves 11+: all alien types can appear, with extra brute pressure and closer spawn ranges.
- Boss waves: every 5th wave starts with the horned boss alien.
- Wave timing: each wave shows `3, 2, 1`, then aliens spawn after `Fight!`.

## GLB Asset Status

- Required active GLBs are present for current gameplay: green grunt, purple runner, armored brute, horned boss, plasma cannon, and city props.
- Optional missing GLB: `arena_map.glb`. The game safely ignores this and uses the current procedural arena plus city props.

## Roadmap

- Add weapon variety and upgrade choices between waves
- Replace oscillator sounds with authored audio files
- Add stronger base-defense objectives and repairs
- Tune GLB model scale, rotation, and animation clips
- Add authored arena map GLB when ready
- Add persistent high score table
