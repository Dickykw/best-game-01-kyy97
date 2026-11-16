# Dusty Yard — a golden-hour tactical FPS

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/Dickykw/best-game-01-kyy97/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/Dickykw/best-game-01-kyy97/reward.svg)](https://make.fun/bounty/best-game-01)

A complete, original three.js tactical FPS that runs offline from static
files in a desktop browser — and on a phone. Golden-hour industrial yard,
56 × 40 m, three lanes, two bomb sites.

## The game

- **Objective:** plant the charge at site A or B, defend it for 35 seconds —
  or eliminate all five Viper bots. First to 3 rounds takes the match.
- **Combat:** three weapons (Kestrel P9 pistol, Longbow AR-7 rifle, Hornet
  VK-9 SMG) with deterministic recoil spray tables, headshot multipliers,
  and frag grenades with bounce physics.
- **Bots:** five Vipers that patrol lanes, hold sites, engage on sight
  (reaction delay, strafing, real miss chance), investigate gunshots and
  defuse a planted charge.
- **Economy:** $800 to start, $300 per elimination, $900 per round win.
  Buy menu (B) during the 15 s buy phase.
- **Feel:** procedural WebAudio gunshots, directional bot audio, tracers,
  hitmarkers, kill feed, damage vignette, round banners and a Tab
  scoreboard.
- **Mobile:** virtual joystick, drag-to-look, FIRE / reload / jump / crouch /
  plant / grenade / weapon / buy buttons. `?judge` jumps straight into
  round 1 with a full loadout.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: every script, texture and sound is a
file under `game/` or generated at runtime. three.js 0.187.0 is vendored
under `game/vendor/three/`.

## Entry

- Competition: [best-game-01](https://make.fun/bounty/best-game-01) on make.fun
- `main.ts` (Node 22) copies `game/` and `screenshots/` to `/output` and
  writes `dossier.json` with `vendor/makefun-game.ts`.
- License: MIT.

## Screenshots

`1-start.jpg` — title screen · `2-play.jpg` — live combat with HUD ·
`3-plant.jpg` — charge planted at site A · `4-end.jpg` — round won.
