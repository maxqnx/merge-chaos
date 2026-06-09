# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Merge Chaos** is a mobile HTML5 tower defense game built with Phaser 3.60. Players drop creatures into a 7×3 grid, identical adjacent creatures merge into stronger versions (level 1–8 evolution chain), and creatures auto-attack waves of enemies approaching from the right. There is no build step — plain ES6 JavaScript loaded directly in the browser.

## Running the Game

```bash
python3 server.py
# Game available at http://localhost:3000
```

The server serves static files and exposes a `POST /audit` endpoint that appends game analytics to `audit.log` (JSONL). Phaser 3.60 is loaded from CDN — there is no npm, no bundler, no transpilation.

There is no automated test suite. Verify changes by running the server and playing the game. Monitor `audit.log` for event traces:

```bash
tail -f audit.log
```

## Architecture

### Scene Pipeline

```
BootScene  →  GameScene  ←→  UIScene
(start screen)  (game logic)    (HUD overlay)
```

Scenes are declared in `js/main.js` and run in order. Restart sends `GameScene → BootScene → GameScene`.

**GameScene** is the source of truth for all game state. It emits Phaser events (`statsUpdate`, `waveUpdate`, `gameOver`) that UIScene listens to for HUD updates. UIScene never owns state — it only reads and renders.

### File Roles

| File | Role |
|------|------|
| `js/config.js` | Static data: `CREATURES[8]`, `ENEMY_TYPES[4]`, `SHOP_POOL[4]`, `GAME_CONFIG` |
| `js/main.js` | Phaser `Game` instance (canvas size, physics, scene list) |
| `js/AudioManager.js` | All sound via Web Audio API — zero audio files, pure oscillator/noise synthesis |
| `js/scenes/BootScene.js` | Animated start screen (hex badge, evolution chain, PLAY NOW) |
| `js/scenes/GameScene.js` | All gameplay: grid, creatures, enemies, merges, waves, shop, tutorial |
| `js/scenes/UIScene.js` | HUD: HP/score/coins/wave bar, bottom guide with creature silhouettes, death screen |
| `server.py` | Dev server (`ThreadingHTTPServer`) + `/audit` POST endpoint |

### Grid System

`this.grid[row][col]` — 7 rows × 3 columns. Row 0 is the top, row 6 is the bottom (near the base). Enemies approach from the right edge and travel left toward the base on col=0.

Creature objects: `{ id, level, cfg, x, y, row, col, hp, maxHp, lastAttack, removing }`.  
Enemy objects: `{ id, x, col, hp, maxHp, cfg, removing, speed, reward, moveTween }`.

### Critical GameScene Methods

- `dropCreature()` — places a creature in `this.selectedLane`, triggers gravity
- `checkMergesAt(row, col)` — checks 4 neighbors for same-level pair, triggers cascade
- `executeMerge(cA, cB)` — removes both, spawns next-level creature
- `applyGravity(col)` — compacts creatures downward after removal; called after every merge/death
- `spawnWave()` — generates the enemy plan, shows a preview countdown, then spawns
- `runAttacks()` — fires every 700 ms; creatures target enemies within ±1 column, 200 px range
- `damageBase(amount, col)` — base damage capped at 30% of `maxBaseHP` per hit
- `triggerGameOver()` — stops all tweens, emits `gameOver` event to UIScene

### State That Persists Across Waves

`GAME_CONFIG.attackMultiplier` and `GAME_CONFIG.hpMultiplier` are modified by shop purchases and must be reset in `create()` on each restart (not the constructor — `create()` runs on every restart).

### Shop

Opens automatically after clearing a wave (skipped for waves 1–2 as tutorial). Shows 4 items drawn from `SHOP_POOL` with a 10-second timer. Effects:
- `attack` → `attackMultiplier × 1.25` (capped at 3.0)
- `repair` → `baseHP + 25` (capped at `maxBaseHP`)
- `freeze` → delays next wave by 25 s
- `armor` → `hpMultiplier × 1.3`

## Conventions

### Visuals
All graphics use the **Phaser Graphics API — never OS emoji, never image assets**. Color tokens used throughout:
- `0xc8a951` gold, `0x00e5cc` teal, `0xe84040` danger, `0x6c9fff` info, `0x7c5cfc` violet

Entrance easing: `Back.easeOut`. Exit/fall easing: `Power2.easeIn`. Fonts: Arial Black (titles), Arial (body).

### Naming
- Private/helper methods: `_camelCase` (e.g. `_log`, `_drawShieldIcon`)
- Main flow methods: `camelCase` (e.g. `dropCreature`, `spawnWave`)
- Section separators in GameScene: `// ─── SECTION ─────`

### Creature Evolution Chain
Slime (L1) → Goblin → Orc → Troll → Dragon → Phoenix → Titan → God (L8).  
Damage and HP double roughly every level (see `CREATURES` in `config.js`).

### Enemy Scaling
HP scales by `1 + wave × 0.25` each wave. Boss spawns every 5 waves (W5, W10, W15…). Enemy types unlock progressively: Rat (W1), Zombie (W2), Demon (W4+).

## Deployment

Netlify static hosting — the repo root is the publish directory (`netlify.toml`). No build command needed. Push to deploy.
