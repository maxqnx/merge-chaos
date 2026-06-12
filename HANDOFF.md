# Merge Chaos — Handoff Document
> Передай этот файл новому Claude в начале сессии. Скажи: "Прочитай HANDOFF.md и продолжай работу над проектом."

---

## Проект одной строкой
**Merge Chaos** — мобильная HTML5 игра (Phaser 3.60, JavaScript). Tower Defense + Merge. Игрок бросает существ в 3 колонки → они стреляют во врагов → одинаковые существа рядом сливаются в более сильные → защищаем базу от волн врагов.

---

## Как запустить
```bash
cd ~/merge-chaos
python3 server.py          # НЕ python3 -m http.server — нужен аудит-лог!
# открыть http://localhost:3000
# логи пишутся в audit.log автоматически
```

---

## Структура файлов

```
~/merge-chaos/
├── index.html                  # Точка входа, Phaser 3.60 CDN, touch-action: manipulation
├── js/
│   ├── config.js               # CREATURES[8], ENEMY_TYPES[4], GAME_CONFIG, SHOP_POOL[4]
│   ├── main.js                 # Phaser game init, 430×932px, Scale.FIT
│   └── scenes/
│       ├── BootScene.js        # Стартовый экран, Dark Fantasy Premium стиль
│       ├── GameScene.js        # ГЛАВНЫЙ ФАЙЛ — вся игровая логика
│       └── UIScene.js          # HUD + death screen с Loss Aversion
├── netlify.toml                # Деплой конфиг
└── trailer/                    # Remotion трейлер (отдельный React проект)
    └── src/
        ├── Root.tsx            # 2 композиции: Portrait (TikTok) + Landscape (YouTube)
        └── Composition.tsx     # 4 сцены: Logo → Evolution → Gameplay → CTA
```

---

## Архитектура GameScene (актуально после Сессии 14)

### Система координат
```
y=0         ── верх экрана
y=54        ── нижний край HUD / coverage bar (4px полоса)
y=60        ── ARENA_TOP (начало арены / drop-зоны)
y=130       ── GRID_TOP (конец drop-зоны, начало сетки)
y=GRID_BOT  ── конец сетки (~H - 80)
y=H         ── низ экрана
```

### Grid-система (КЛЮЧЕВОЕ)
- **7 строк × 3 колонки** = 21 ячейка
- `this.grid[row][col]` = creature object или null
- Существа занимают ячейку сразу при дропе (НЕ после посадки)
- Tween падения: `Power2.easeIn` вниз + bounce при посадке
- Существа статичны после посадки (НЕ используют Matter.js физику)

### Данные существа (creature object)
```javascript
{
  id, gfx, lvlBadge,   // graphics objects (emoji УБРАН в Сессии 4)
  level, cfg,           // CREATURES[level-1]
  x, y, row, col,       // позиция
  hp, maxHp,
  lastAttack,
  removing: false       // guard против double-remove
}
```

### Данные врага (enemy object)
```javascript
{
  id, gfx, nameT, hpBar,
  x, col,               // фиксированная колонка
  hp, maxHp, cfg,
  removing: false,
  speed, reward,
  moveTween             // Phaser tween — останавливается при бою
}
```

### Ключевые методы
| Метод | Что делает |
|-------|-----------|
| `dropCreature()` | Бросает существо в selectedLane, находит нижнюю пустую строку |
| `drawCreatureGfx(gfx, cfg)` | Рисует уникальный силуэт по cfg.level (switch 1–8) |
| `checkMergesAt(row, col)` | O(1) — проверяет только 4 соседа |
| `executeMerge(cA, cB, ...)` | Анимирует схлопывание, удаляет обоих, спавнит новый уровень |
| `spawnEnemy(typeIdx, col?)` | Создаёт врага с tier-rings, запускает tween; col — опциональный |
| `checkEnemyCreatureCollision(enemy)` | Во время tween — ищет существо в пути |
| `engageFight(enemy, creature)` | Пауза tween, бой, resume или уничтожение |
| `runAttacks()` | Каждые 600ms — существа стреляют во врагов в радиусе ±1 колонки |
| `fireProjectile(...)` | Teardrop снаряд с trail-хвостом |
| `damageBase(amount)` | Per-enemy cap: `min(amount, maxBaseHP×0.3)`. Camera shake + flash + HP bar |
| `triggerGameOver()` | Kills all tweens/events, чистит shop overlay, emits 'gameOver' → UIScene |
| `_tutShow(step)` | Туториал шаги 0–2, управляется `_tut*` методами |
| `_showWavePreview(plan, cb)` | 1.5с превью "INCOMING!" + per-col boxes перед спавном |
| `_doWave()` | Вызывает `spawnWave()` |
| `spawnWave()` | Pre-генерирует plan[], вызывает `_showWavePreview`, потом спавнит |
| `_waitForWaveClear()` | Ждёт смерти всех врагов, применяет HP regen, открывает магазин |
| `_showShop()` | Overlay depth 200: header, 3 рандомных карточки, таймер 10с, SKIP кнопка |
| `_buildShopCard(item, x, y, w, h, D)` | Карточка 126×244px: иконка, название, описание, цена, BUY/TOO COSTLY |
| `_drawShopIcon(gfx, id, x, y, r, active)` | Canvas-иконки: молния/крест/снежинка/щит |
| `_buyItem(item)` | Списывает монеты, применяет эффект к GAME_CONFIG, вызывает `_closeShop()` |
| `_closeShop()` | Fade 280мс, destroy всех `_shopObjs`, через `nextWaveDelay` мс → `_doWave()` |
| `updateCoverageBar()` | Перерисовывает 4px полосу под HUD — DPS по каждой колонке |

### Поток волн (актуально после Сессии 14)
```
_startWaves()
  └─ delayedCall(2500) → _doWave()
       └─ spawnWave()
            ├─ pre-генерирует plan[] {typeIdx, col} × count
            └─ _showWavePreview(plan, callback)   ← fade-in 200ms / показ 1000ms / fade-out 300ms
                 └─ callback()
                      ├─ spawnEnemy(typeIdx, col)  × count (каждые 550ms)
                      └─ [последний] delayedCall(500) → _waitForWaveClear()
                           ├─ [враги живы] delayedCall(400) → poll again
                           └─ [все мертвы]
                                ├─ if wave%3===0 → baseHP+5, float "+5 HP"
                                └─ delayedCall(1000) → _showShop()
                                     ├─ [купил]  → _buyItem() → _closeShop()
                                     ├─ [SKIP]   →             _closeShop()
                                     └─ [таймер] →             _closeShop()
                                          └─ delayedCall(nextWaveDelay=1500) → _doWave()
```

### Events (scene communication)
```javascript
this.events.emit('statsUpdate', score, coins, baseHP, maxBaseHP)
this.events.emit('waveUpdate', wave)
this.events.emit('gameOver', { score, wave, coins })
```

---

## Дизайн-система (Dark Fantasy Premium)

| Токен | Значение |
|-------|---------|
| BG_DEEP | `0x05050f → 0x080818` gradient |
| GOLD | `0xc8a951` — score, coins, CTA кнопки, accents |
| TEAL | `0x00e5cc` — aim line, guides, туториал highlight |
| DANGER | `0xe84040` — HP, enemies, game over |
| INFO | `0x6c9fff` — wave badge |
| VIOLET | `0x7c5cfc` — lane dividers |
| INDIGO | `0x5E6AD2` — ambient blobs, UI accents |
| MUTED | `0x8a8fa8` — второстепенный текст |
| Font title | Arial Black |
| Font body | Arial |
| Easing | `Back.easeOut` (entrance), `Power2.easeIn` (exit) |

### Правило: НОЛЬ OS-эмодзи
Все иконки — только Phaser Graphics API. Методы иконок:
- `UIScene.drawShieldIcon(gfx, x, y, r)` — красный щит (HP)
- `UIScene.drawStarIcon(gfx, x, y, r)` — золотая звезда (score)
- `UIScene.drawCoinIcon(gfx, x, y, r)` — золотая монета (coins)
- `GameScene._drawShieldIcon(gfx, x, y, r)` — щит у base HP bar

---

## Данные игры (АКТУАЛЬНО — после Сессии 14)

### CREATURES[8]
| Уровень | Имя | Цвет | Силуэт | Размер | Урон | HP |
|---------|-----|------|--------|--------|------|----|
| 1 | Slime   | `0x22c55e` | Аморфный blob с буграми | 22 | **2** | 5 |
| 2 | Goblin  | `0x84cc16` | Круг + острые треугольные уши | 28 | **3** | 10 |
| 3 | Orc     | `0x0ea5e9` | Широкий эллипс + клыки снизу | 35 | **6** | 20 |
| 4 | Troll   | `0x6366f1` | Круг + тёмные каменные пятна | 42 | **12** | 40 |
| 5 | Dragon  | `0xef4444` | Треугольные крылья + тело | 50 | **24** | 80 |
| 6 | Phoenix | `0xf97316` | Тело + 3 языка пламени + белый tip | 58 | **48** | 160 |
| 7 | Titan   | `0xa855f7` | Шестигранник + 6 шипов между вершинами | 66 | **96** | 320 |
| 8 | God     | `0xe2e8f0` | Восьмигранник + 8 лучей + prismatic glow | 75 | **192** | 640 |

### GAME_CONFIG
```javascript
{
  attackRange: 200,
  attackCooldown: 700,    // 700ms — снэппи атаки
  attackMultiplier: 1,    // растёт при Power Surge ×1.25, кап ×3.0
  hpMultiplier: 1,        // растёт при Armor Up ×1.3
}
```

### SHOP_POOL[4] (актуально — Сессии 11+14)
| id | Название | Эффект | Цена |
|----|----------|--------|------|
| `attack` | Power Surge | `attackMultiplier = min(3.0, ×1.25)` | **35** |
| `repair` | Repair Base | `baseHP = min(maxBaseHP, baseHP + 25)` | **20** |
| `freeze` | Slow Wave | `nextWaveDelay = 25000` (один раз, затем 1500) | 20 |
| `armor` | Armor Up | `hpMultiplier *= 1.3` | 40 |

### ENEMY_TYPES[4] (актуально — Сессии 12+13)
| Индекс | Имя | Цвет | Tier-rings | HP | Скорость | Награда |
|--------|-----|------|-----------|-----|---------|---------|
| 0 | Rat    | `0x94a3b8` | 1 кольцо | 8 | 70 | 2 |
| 1 | Zombie | `0x4ade80` | 2 кольца | 23 | 46 | 5 |
| 2 | Demon  | `0xf43f5e` | 3 кольца | 60 | 52 | 8 |
| 3 | Boss   | `0xdc2626` | 4 кольца | 300 | 35 | 35 |

### Ключевые формулы GameScene.js (актуально после Сессии 16)
```javascript
// Тип врага в волне (Demon только с wave 4, Boss каждые 4 волны):
const isBoss = this.wave % 4 === 0;
const typeIdx = isBoss && last ? 3
  : Phaser.Math.Between(0, Math.max(0, Math.min(2, this.wave - 2)));

// HP врага (масштабируется с волной):
scaledHp = cfg.hp * (1 + this.wave * 0.25)   // было 0.15 до С16

// Урон базе при прорыве (с per-enemy cap):
damageBase(amount) {
  const capped = Math.min(amount, this.maxBaseHP * 0.3); // max 27 HP за 1 прорыв
  ...
}
// Сам amount = enemy.maxHp * 0.04 + this.wave * 0.8

// Melee врага по существу:
dmgToCreature = (enemy.maxHp / 18) * (1 + this.wave * 0.04)

// HP regen (+5 HP каждые 3 волны после зачистки):
if (this.wave % 3 === 0) baseHP = min(maxBaseHP, baseHP + 5)

// Coverage bar (update каждый кадр):
strength = sum(creature.cfg.damage * GAME_CONFIG.attackMultiplier) per col
color: strength >= 40 → green | 15-39 → orange | <15 → red

// Количество врагов на волне:
count = 3 + Math.floor(this.wave * 2.0)   // было: 2 + wave*1.8 до С16

// Интервал между спавнами:
480ms per enemy   // было 550ms до С16

// Скорость врага (уже существовала):
speed = cfg.speed * (1 + wave * 0.05)

// Boss COUNTER badge в магазине:
if (item.id === 'freeze' && (wave + 1) % 4 === 0) → показать badge   // было %5
```

---

## Установленные скиллы

### ~/.agents/skills/ (44 маркетинг-скилла)
`ab-testing`, `ad-creative`, `ads`, `ai-seo`, `analytics`, `aso`, `churn-prevention`, `co-marketing`, `cold-email`, `community-marketing`, `competitor-profiling`, `competitors`, `content-strategy`, `copy-editing`, `copywriting`, `cro`, `customer-research`, `directory-submissions`, `emails`, `free-tools`, `image`, `launch`, `lead-magnets`, `marketing-ideas`, `marketing-plan`, `marketing-psychology`, `onboarding`, `paywalls`, `popups`, `pricing`, `product-marketing`, `programmatic-seo`, `prospecting`, `referrals`, `revops`, `sales-enablement`, `schema`, `seo-audit`, `signup`, `site-architecture`, `sms`, `social`, `stop-slop`, `video`

### ~/.claude/skills/ (24 технических скилла)
`framer-motion-core`, `framer-motion-gestures`, `framer-motion-layout`, `framer-motion-react`, `framer-motion-scroll`, `framer-motion-variants`, `remotion`, `ui-ux-pro-max`, `context-compression`, `context-degradation`, `context-fundamentals`, `context-optimization`, `advanced-evaluation`, `evaluation`, `bdi-mental-states`, `filesystem-context`, `harness-engineering`, `hosted-agents`, `latent-briefing`, `memory-systems`, `multi-agent-patterns`, `project-development`, `stop-slop`, `tool-design`

---

## История сессий

| Сессия | Что сделано |
|--------|-------------|
| День 1 | Структура проекта, первая версия (Matter.js физика), BootScene, UIScene, config |
| День 1 | Remotion трейлер (Portrait TikTok + Landscape YouTube) |
| День 2 | Полная перепись GameScene: grid-система, tween-враги, фикс критических багов |
| День 2 | UIScene: death screen с Loss Aversion, Rewarded Ad placeholder, Zeigarnik effect |
| Сессия 3 | Туториал 3 шага + localStorage + SKIP кнопка |
| Сессия 4 | Visual Redesign "Dark Fantasy Premium" — 8 силуэтов, gem-цвета, canvas-иконки, teardrop снаряды, tier-rings, сегментированный HP bar |
| Сессия 5 | Магазин между волнами — overlay depth 200, 4 предмета (SHOP_POOL), attackMultiplier, hpMultiplier, waveDelay, таймер 10с, SKIP кнопка |
| Сессия 6 | Звуки — AudioManager.js, Web Audio API, 8 синтетических звуков |
| Сессия 7 | Балансировка — attackCooldown 700ms, dropCooldown 380ms |
| Сессия 8 | HP-бары над существами — `hpBarGfx`, появляются при уроне |
| Сессия 9 | 4 критических бага закрыты; engageFight → enemy.maxHp/10; attackMultiplier cap ×4.0 |
| Сессия 10 | Стратегический баланс: ±1 колонка атаки, base HP 75, боссы каждые 4 волны |
| Сессия 11 | Аудит-система (server.py + _log), boss bug fix (_waitForWaveClear), coin economy fix, shop prices up |
| Сессия 12 | Grid 7 строк, рестарт фикс, Boss breakthrough formula, enemy HP/speed rebalance |
| Сессия 13 | State reset в create(), damage ×1.5, прорыв ÷2, melee /18, Boss каждые 5 волн, base HP 90, 3-агентный анализ |
| Сессия 14 | (см. раздел ниже) |
| Сессия 15 | (см. раздел ниже) |
| Сессия 16 | Gravity Mechanic + difficulty rebalance после gravity (см. раздел ниже) |
| Сессия 17 | Shop UI: TIP выше PLAY AGAIN (персонализированный), FOMO-строка при hoarding, RECOMMENDED badge, Freeze countdown HUD, BOSS COUNTER красный+pulse (см. раздел ниже) |
| Сессия 18 | Repair Visual Overhaul: красная рамка + pulsing glow + BASE CRITICAL! badge + красная иконка при HP<40%; FOMO строка подавляется при HP<40% (см. раздел ниже) |
| Сессия 19 | Visual Redesign v2 (итог: недостаточно — изменения слишком мелкие, структура та же). Применён ui-ux-pro-max скилл. Разработан план для v3 с гексагональным badge, реальными силуэтами существ, HUD без pills. |
| Сессия 20 | Visual Redesign v3: гексагональный badge (BootScene), силуэты существ в evolution chain, full-width кнопка PLAY NOW, diagonal grid в фоне, UIScene HUD без pills (vertical separators), bottom bar с силуэтами. Итог: структурно верно, но дизайн по-прежнему flat/несовременный — нужен принципиально другой подход к глубине и атмосфере. |
| Сессия 21 | BootScene atmosphere pass: blobs → 35 floating particles, badge radial glow, scan line, pulsing halo за силуэтами, кнопка glow + mini particle burst. Итог: изменения почти невидимые — все симуляции через полупрозрачные круги. |
| Сессия 22 | BootScene postFX overhaul: включён Phaser 3.60 WebGL FX Pipeline. Camera vignette; CHAOS 88px + postFX.addGlow(teal, 6, 32px); MERGE postFX gold; badge fillGradientStyle; каждый силуэт postFX.addGlow(creature color) + scale entrance; btn/btnText postFX gold glow; 3D bevel bottom shadow bar; частицы 3-4px, alpha 0.45-0.85. |
| Сессия 23 | Deep Research — 7 агентов. Phaser 3.60 API аудит, GLSL шейдеры, premium mobile игры паттерны, Playwright tooling. Имплементация НЕ начата — только план. |
| Сессия 24 | GameScene Visual Upgrade: camera vignette + dot texture; creature multi-ring aura; tier-colored lvlBadge; enemy distinct shapes; shop outer glow + specular. Затем: **полный Neon Cyberpunk рестайл** — убраны все виньетки, возвращены оригинальные силуэты, применена новая палитра во всех 4 файлах. |
| Сессия 25 | Performance analysis: CDN load 1115ms, scanlines 233 strokePath, HP bar per-frame. BootScene "VOID CHAOS" redesign: pure black bg + electric violet palette, ghost God silhouette за title, CHAOS 92px white + violet shadow+glow, 5 milestone creatures, purple button. |

---

## ✅ РЕШЕНО — Сессия 14 (полный отчёт)

### Что сделано

| Задача | Результат | Файл | Строки кода |
|--------|-----------|------|-------------|
| **14-1** Demon unlock wave 3→4 | `Math.min(2, wave-2)` вместо `wave-1` | GameScene.js `spawnWave()` | 1 строка |
| **14-2** Repair 30₽→20₽ | config.js SHOP_POOL | config.js | 1 строка |
| **14-3** HP regen +5 каждые 3 волны | `wave%3===0` → baseHP+5 + float text "+5 HP" | GameScene.js `_waitForWaveClear()` | 6 строк |
| **14-4** Per-enemy breach cap | `capped = min(amount, maxBaseHP×0.3)` | GameScene.js `damageBase()` | 1 строка |
| **14-5** Coverage Visualizer | 4px полоса под HUD (y=54), red/orange/green по DPS | GameScene.js `updateCoverageBar()` + `update()` | ~15 строк |
| **14-6** Pre-wave Enemy Preview | `_showWavePreview()`: 1.5с INCOMING + per-col info | GameScene.js `_showWavePreview()` + `spawnWave()` | ~50 строк |

### Баг обнаружен и исправлен в сессии 14

**Проблема:** Первая версия задачи 14-4 была реализована как накопительный per-wave cap (`_waveBreachTotal`): каждый вызов `damageBase()` прибавлял к счётчику, и как только сумма превышала `baseHP*0.35`, все последующие враги давали ровно 0 урона (ранний `return`). Переменная `waveCap` пересчитывалась от текущего (уменьшившегося) `baseHP`, из-за чего накопленный `_waveBreachTotal` быстро превышал новый `waveCap`.

**Симптом:** Boss прошёл до базы → никакого урона, никакого camera shake, HP не изменился.

**Фикс:** Убрана вся система `_waveBreachTotal`/`_waveStartHP`. Заменена на simple one-liner: `Math.min(amount, this.maxBaseHP * 0.3)`. Каждый отдельный прорыв ограничен 27 HP (30% от 90). Не накапливается.

**Итог:** Boss на волне 10 мог бы нанести ~38 HP → теперь максимум 27. Все остальные враги в волне получают полный урон независимо от предыдущих прорывов.

### Актуальный `damageBase()` после фикса
```javascript
damageBase(amount) {
  const capped = Math.min(amount, this.maxBaseHP * 0.3);
  this._log('base_hit', { dmg: Math.ceil(capped), ... });
  this.baseHP = Math.max(0, this.baseHP - capped);
  this.drawBase();
  this.baseHpText.setText(`${Math.ceil(this.baseHP)}`);
  GameAudio.playBaseHit();
  this.cameras.main.shake(180, 0.012);
  // flash + triggerGameOver если HP <= 0
}
```

---

## Анализ 5 тестовых сессий (Сессия 13)

| Сессия | Конфиг | Умер | Score | Kill rate W3 | Покупок |
|--------|--------|------|-------|-------------|---------|
| С1 | старый | W4 | 910 | 43% | 1 |
| С2 | старый | W5 | 1820 | 100% | 3 |
| С3 | С13-баланс | W6 | 2180 | 71% | 4 |
| С4 | С13-баланс | W4 | 1080 | **14%** | 2 |
| С5 | +damage buff | **W14** | **12840** | 100% | **12** |

**Ключевые находки 3 агентов (evaluation + marketing-psychology + BDI):**
- Сейчас смерть: W4/W4/W5/W6/W14, **median=W5**. Цель: **median W9, range W7–W12**
- Средний урон при прорыве: 46.3% maxHP за волну (норма <20%) → фикс per-enemy cap
- Repair куплен 1 раз из ~17 покупок → фикс цены до 20₽
- Slow Wave не куплена ни разу → нужен контекст "BOSS COUNTER"
- Belief gap: игрок не знает что колонка пустая → фикс Coverage Visualizer

---

## ✅ РЕШЕНО — Сессия 15 (retention-механики)

### Что сделано

| Задача | Результат | Файл | Детали |
|--------|-----------|------|--------|
| **15-1** BOSS COUNTER badge | Badge на карточке Slow Wave если следующая волна — Boss | GameScene.js `_buildShopCard()` | `(wave+1)%5===0` → gold badge поверх карточки |
| **15-2** Post-wave breach feedback | После зачистки волны показывает "BREACH: LEFT/CENTER/RIGHT undefended" | GameScene.js `damageBase(amount, col)` + `_waitForWaveClear()` | `_lastBreachCol` запоминает колонку прорыва |
| **15-3** Death screen tip | "TIP: Repair Base costs only 20 coins" если умер с HP < 50% | GameScene.js `triggerGameOver()` + UIScene.js `showDeathScreen()` | `missedRepair` флаг в gameOver event |
| **15-4** Survival Streak | "SURVIVAL STREAK: N WAVES ON THE EDGE!" при HP < 20% ≥2 волн подряд | GameScene.js `_waitForWaveClear()` | `_criticalWaves` счётчик, сбрасывается при восстановлении |

### Актуальная сигнатура damageBase после Сессии 15
```javascript
damageBase(amount, col = -1) {
  const capped = Math.min(amount, this.maxBaseHP * 0.3);
  if (col >= 0) this._lastBreachCol = col;
  // ... camera shake, flash, triggerGameOver if HP <= 0
}
// Вызов: this.damageBase(enemy.maxHp * 0.04 + this.wave * 0.8, enemy.col)
```

### Новые поля в create() (state reset)
```javascript
this._lastBreachCol = -1;   // колонка последнего прорыва
this._criticalWaves = 0;    // счётчик волн на критическом HP
```

### Новое поле в gameOver event
```javascript
this.events.emit('gameOver', {
  score, wave, coins,
  missedRepair: this.baseHP < this.maxBaseHP * 0.5
});
```

---

## Анализ 5 тестовых сессий (Сессия 15 — 3 агента, 1468 событий)

### Evaluation — баланс волн

| Сессия | Смерть | Score | Kill rate W3 | Base hits | Avg dmg/hit |
|--------|--------|-------|-------------|-----------|-------------|
| S1 | W4 | 910 | 43% | 7 | 11.7 |
| S2 | W5 | 1820 | 100% | 4 | 22.3 |
| S3 | W6 | 2180 | 71% | 7 | 19.1 |
| S4 | W4 | 1080 | **14%** | 9 | 11.8 |
| S5 | W14 | **12840** | 100% | 9 | 10.8 |

**Median смерти: W5. Цель: W9.**

Ключевые находки:
- **W3 — главный убийца:** 33% всех base_hit (12/36). Kill rate разброс 14–100%.
- **Kill rate W3 < 50% → смерть W4-W5 в 100% случаев** (S1: 43%, S4: 14%)
- **Boss-волны НЕ опасны:** игрок готовится, проходит с 100% kill rate. W5/W10 в S5 — без единого попадания по базе.
- Данных по W10+ мало — только 1 сессия.

### Psychology — паттерны покупок (22 покупки)

| Item | Куплено | % | Avg wave | Avg HP% |
|------|---------|---|----------|---------|
| attack | 12 | **54%** | 6.4 | 50% |
| armor | 7 | 32% | 5.5 | 55% |
| repair | 2 | **9%** | 5.0 | 60% |
| **freeze** | **0** | **0%** | — | — |

Критические инсайты:
- **Freeze мёртв:** 0 покупок. BOSS COUNTER badge (Сессия 15) не помог — нужен агрессивнее.
- **Repair недопокупается в критический момент:** S5 при HP=16 (wave 8–13) не купил repair ни разу, хотя монет было 276–844.
- **Hoarding:** S5 умер с **844 монетами** при HP=16. Строгое чередование attack/armor, отказ от repair/freeze.
- Repair при HP<30%: куплен **1 раз** (чистая паника, W5, HP=18). Repair при HP>60%: куплен 1 раз (бессмысленная страховка при HP=100%).
- Armor покупается реактивно (5/7 покупок при HP<50%) — игрок использует его как "второй repair".

### BDI — колонки и когнитивные паттерны

| Колонка | Drop % | Kill rate | Avg creature lvl |
|---------|--------|-----------|-----------------|
| col0 LEFT | 33.5% | **29.9%** | 1.87 |
| col1 CENTER | 34.6% | **35.0%** | 1.82 |
| col2 RIGHT | 31.9% | **35.0%** | **1.94** |

По фазам:
- **Early (W1-4):** col1 фаворит (37.1%)
- **Mid (W5-9):** АНОМАЛИЯ — col0 получает 44.7% дропов, но даёт только 29.9% убийств
- **Late (W10+):** маятник уходит в col2 (38%)

BDI-дисфункция: игрок в mid-фазе паникует и перегружает col0 ("экстренный слот"), тогда как прорывы идут по col2 которую он "инвестиционно" качает. **Реактивен (6/8 реакций на прорыв правильны), но не проактивен.** Слепых зон нет — все 3 колонки получают дропы каждую волну.

---

---

## ✅ РЕШЕНО — Сессия 16: Gravity Mechanic

### Что сделано

| Задача | Результат | Файл | Детали |
|--------|-----------|------|--------|
| **16-1** `applyGravity(col)` | Метод сдвигает существа вниз при освобождении ячейки | GameScene.js | ~43 строки, задержка 50ms, tween 120ms `Power2.easeIn` |
| **16-2** Подключение к `removeCreature()` | Вызывается после смерти существа от меле-удара врага | GameScene.js | 1 строка + `const { col }` capture |
| **16-3** Подключение к `executeMerge()` | Вызывается для обоих столбцов после завершения merge-анимации | GameScene.js | 2 строки в onComplete |
| **16-4** Аудит-лог | `_log('gravity', { col, moved })` при каждом сдвиге | GameScene.js | 1 строка |

### Архитектура `applyGravity(col)`

```javascript
applyGravity(col):
  1. Guard: isGameOver → return
  2. delayedCall(50ms) — пропускаем один кадр чтобы removing-объекты успели пометиться
  3. Собрать все grid[0..6][col] где !null && !removing → creatures[]
  4. needsGravity: проверить что хотя бы одно существо находится не в нижнепакованной позиции
  5. Если !needsGravity → return
  6. Очистить grid[0..6][col] = null
  7. Расставить creatures снизу вверх: creatures[last] → row 6, creatures[last-1] → row 5, ...
  8. Для каждого существа у которого row изменился → tween 120ms Power2.easeIn до ROW_Y[newRow]
     onUpdate: синхронизировать hpBarGfx и lvlBadge
     onComplete: checkMergesAt(newRow, col) — триггер каскадных мержей
  9. _log('gravity', { col, moved })
```

### Где вызывается

| Место | Когда | Колонки |
|-------|-------|---------|
| `removeCreature()` — конец метода | Существо убито врагом | `creature.col` |
| `executeMerge()` — `onComplete` после `spawnCreatureAt` | Два существа слились | `colA_saved` + `colB_saved` (если горизонтальный мерж) |

### Каскад мержей (как работает)

```
Враг убивает Goblin в col=1, row=2
  → removeCreature() → grid[2][1] = null → applyGravity(1)
    → 50ms delay
    → Slime из row=0, row=1 сдвигаются в row=1, row=2
    → onComplete каждого tween → checkMergesAt()
      → если Slime+Slime рядом → executeMerge()
        → после merge → applyGravity() снова
```

### Защиты от race conditions

- `creature.removing = true` — гравитация игнорирует dying-существа через `!c.removing`
- `this.merging` Set — guard против двойного merge (существующий механизм)
- 50ms задержка — removing-флаг гарантированно выставлен до чтения grid

---

## Difficulty Rebalance после Сессии 16 (mid-session)

**Причина:** gravity создала каскадные мержи → игрок дошёл до W15 "максимально легко". Существа масштабируются экспоненциально (через мержи), враги — линейно (+15% HP/волна). Асимметрия.

### Что изменено (финальная версия после 3 тестовых сессий)

Первый rebalance (C16a) был слишком жёстким — median смерти W5 (цель W9-12). После анализа 3 агентов (956 событий) применён второй rebalance:

| Параметр | Оригинал (C15) | C16a (слишком жёстко) | C16b (финал) |
|----------|---------------|----------------------|--------------|
| Enemy HP scaling | `+15%/волна` | `+25%/волна` | **`+18%/волна`** |
| Врагов на волне | `2 + wave×1.8` | `3 + wave×2.0` | **`2 + wave×1.7`** |
| Интервал спавна | `550ms` | `480ms` | **`530ms`** |
| Boss каждые | 5 волн | 4 волны | **5 волн** |

### Математика C16b по волнам

| Волна | Врагов | Boss | Demon HP | Boss HP |
|-------|--------|------|----------|---------|
| W4 | 8 | — | 103 | — |
| W5 | 10 | BOSS | 114 | 570 |
| W8 | 15 | — | 146 | — |
| W10 | 19 | BOSS | 168 | 840 |
| W12 | 22 | — | 190 | — |
| W15 | 27 | BOSS | 222 | 1110 |

**Цель:** median смерти W9–12.

### Ключевые находки 3 агентов (956 событий, пост-гравитация)

**Evaluation:**
- W4 Boss (в C16a) — 59% всего урона за одну волну в 2/3 сессий (57-73 HP за волну)
- Gravity cascade эффективность: ~1.26-1.30 мержей на событие гравитации
- Col 2 "слепая зона" в S3: 19% дропов, 34% убийств → систематический прорыв

**Psychology:**
- Hoarding: S2 умер с 371 монетой при HP=23, купил attack вместо repair (W7)
- Паника = туннель: 74-100% дропов в 1 колонку при первых base_hit
- Repair (20₽) не воспринимается как срочная трата несмотря на низкий HP

**BDI:**
- S3 шёл в Boss с пустой сеткой: avg_row W3=1.22 (норма 3.0)
- Drop-rate при панике: 0.65-0.74s/drop против нормы 1.0s/drop
- Эффективные cascade: max depth 7-8 gravity событий, лучший = 5 мержей за 3 тика

---

---

## ✅ РЕШЕНО — Сессия 17: Shop UI

### Что сделано

| Задача | Результат | Файл | Детали |
|--------|-----------|------|--------|
| **17-1** TIP выше PLAY AGAIN | Перенесён на `panelY+215`, fade-in delay 600ms; PLAY AGAIN сдвинут на `panelY+265` | UIScene.js `showDeathScreen()` | Текст: `"You had {coins} coins — Repair costs 20!"` |
| **17-2** FOMO-строка при hoarding | Красная строка `"Spend before next wave — items shuffle!"` при `coins>80 && HP<60%` | GameScene.js `_showShop()` | Fade-in 300ms delay 120ms |
| **17-3** RECOMMENDED badge | Зелёный `★ BEST` с pulse alpha 1→0.7→1 (700ms): repair если HP<50%, attack если HP>70% | GameScene.js `_buildShopCard()` | Только если canAfford |
| **17-4** Freeze countdown HUD | `SLOW: Xs` текст ниже HUD (y=58) появляется после покупки freeze, тикает в `update()` | GameScene.js `_closeShop()` + `update()` + `triggerGameOver()` | `_freezeActiveUntil`, `_freezeLabel` |
| **17-5** BOSS COUNTER red+pulse | Цвет `#ffffff` на фоне `#e84040`, tween alpha 1→0.6→1 каждые 600ms | GameScene.js `_buildShopCard()` | Было: gold, без анимации |

### Новые поля в create() (state reset)
```javascript
this._freezeActiveUntil = 0;  // timestamp окончания freeze delay
this._freezeLabel = null;      // text-объект "SLOW: Xs"
```

### Логика RECOMMENDED (только если canAfford)
```javascript
if (item.id === 'repair' && hpPct < 0.5) → '★ BEST' зелёный
if (item.id === 'attack' && hpPct >= 0.7) → '★ BEST' зелёный
// freeze pre-boss: отдельный BOSS COUNTER badge (без RECOMMENDED)
```

---

## Как начать новую сессию

```
11.
```

---

## 🔴 СЕССИЯ 20: Visual Redesign v3 — Мультиагентная имплементация

### Контекст (почему v2 не сработал)

Сессия 19 сделала незаметные твики (чуть больше шрифт, чуть ярче glow) но **НЕ изменила структуру**. Те же паттерны — две строчки текста, кружки в ряд, три pill-секции в HUD — выглядят как AI-generated mock-up, не как настоящая игра.

Ключевой инсайт из `ui-ux-pro-max` (Modern Dark Cinema Mobile):
- Surface: `rgba(255,255,255,0.04)`, hairline border: `rgba(255,255,255,0.08)` — уже применено, но недостаточно
- **Нужна ДРУГАЯ СТРУКТУРА**, не те же элементы с лучшими цветами

### Три структурных изменения (по приоритету)

| # | Компонент | Что меняется структурно | Файл |
|---|-----------|------------------------|------|
| 1 | **BootScene: Title Badge** | Вместо 2 строк текста — гексагональный badge-фрейм вокруг MERGE/CHAOS | BootScene.js |
| 2 | **BootScene: Evolution Chain** | Вместо кружков — РЕАЛЬНЫЕ СИЛУЭТЫ существ (с drawCreatureGfx-логикой) | BootScene.js |
| 3 | **UIScene: HUD без pills** | Вместо 3 отдельных pill-пузырей — единая полоса с вертикальными разделителями | UIScene.js |
| 4 | **UIScene: Bottom Bar shapes** | Вместо кружков — реальные силуэты (те же что в цепочке эволюции) | UIScene.js |

---

## АГЕНТ 1 — BootScene Complete Rewrite

**Файл:** `~/merge-chaos/js/scenes/BootScene.js`  
**Задача:** Полная перепись. Два главных компонента: Title Badge + Evolution Chain с силуэтами.

### Таск 1.1 — Гексагональный Title Badge

Заменить текущий подход (2 строки текста на чёрном фоне) на **badge-форму** вокруг названия:

```javascript
_drawTitleBadge(W, H) {
  const cx = W / 2, cy = Math.round(H * 0.25);
  const bw = W * 0.88, bh = 118, cut = 22;

  // Vertices of elongated hexagon (nameplate shape)
  const pts = [
    { x: cx - bw/2 + cut, y: cy - bh/2 },
    { x: cx + bw/2 - cut, y: cy - bh/2 },
    { x: cx + bw/2,       y: cy         },
    { x: cx + bw/2 - cut, y: cy + bh/2 },
    { x: cx - bw/2 + cut, y: cy + bh/2 },
    { x: cx - bw/2,       y: cy         },
  ];

  const badge = this.add.graphics().setAlpha(0);
  // Dark fill — surface style
  badge.fillStyle(0x050510, 0.95);
  badge.fillPoints(pts, true);
  // Gold border
  badge.lineStyle(1.5, 0xc8a951, 0.55);
  badge.strokePoints(pts, true);
  // Inner echo border (6px inside, thinner)
  const inner = pts.map(p => ({ x: cx + (p.x - cx) * 0.93, y: cy + (p.y - cy) * 0.90 }));
  badge.lineStyle(1, 0xc8a951, 0.16);
  badge.strokePoints(inner, true);
  this.tweens.add({ targets: badge, alpha: 1, duration: 400, delay: 50 });

  // MERGE — small eyebrow text, muted gold, spaced
  const mergeT = this.add.text(cx, cy - 34, 'M  E  R  G  E', {
    fontSize: '15px', fontFamily: 'Arial Black', color: '#8a6830', letterSpacing: 2
  }).setOrigin(0.5).setAlpha(0);
  this.tweens.add({ targets: mergeT, alpha: 1, duration: 400, delay: 220 });

  // CHAOS — dominant, 72px, teal, strong glow
  const chaosT = this.add.text(cx, cy + 10, 'CHAOS', {
    fontSize: '72px', fontFamily: 'Arial Black',
    color: '#00e5cc', stroke: '#002e28', strokeThickness: 4,
    shadow: { offsetX: 0, offsetY: 0, color: '#00e5cc', blur: 32, fill: true }
  }).setOrigin(0.5).setScale(0).setAlpha(0);
  this.tweens.add({
    targets: chaosT, scaleX: 1, scaleY: 1, alpha: 1,
    duration: 650, delay: 320, ease: 'Back.easeOut',
    onComplete: () => {
      this.tweens.add({ targets: chaosT, scaleX: 1.022, scaleY: 1.022, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  });

  // Teal glow blob behind CHAOS
  const glow = this.add.graphics();
  glow.fillStyle(0x00e5cc, 0.07);
  glow.fillEllipse(cx, cy + 10, 360, 90);
  this.tweens.add({ targets: glow, alpha: { from: 0.07, to: 0.18 }, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 1000 });
}
```

### Таск 1.2 — Evolution Chain с реальными силуэтами

**Главный приоритет.** Цепочка ДОЛЖНА показывать силуэты существ, не кружки.

Добавить в класс метод `_drawCreatureShape(gfx, cfg, cx, cy, r)` — упрощённая версия `drawCreatureGfx` из GameScene, адаптированная для маленького масштаба:

```javascript
_drawCreatureShape(gfx, cfg, cx, cy, r) {
  const c = cfg.color;
  const s = r; // используем r как "size" для пропорций

  // Outer glow halo (все уровни)
  gfx.fillStyle(c, 0.14);
  gfx.fillCircle(cx, cy, s + 5);

  switch (cfg.level) {
    case 1: { // Slime — аморфный blob
      gfx.fillStyle(c, 1);
      gfx.fillCircle(cx, cy + 2, s);
      gfx.fillCircle(cx - s*0.38, cy, s*0.52);
      gfx.fillCircle(cx + s*0.35, cy - 1, s*0.46);
      break;
    }
    case 2: { // Goblin — circle + острые уши
      gfx.fillStyle(c, 1);
      gfx.fillCircle(cx, cy, s);
      gfx.fillTriangle(
        cx - s*0.7, cy - s*0.2,  cx - s*0.4, cy - s*0.9,  cx - s*0.1, cy - s*0.35
      );
      gfx.fillTriangle(
        cx + s*0.7, cy - s*0.2,  cx + s*0.4, cy - s*0.9,  cx + s*0.1, cy - s*0.35
      );
      break;
    }
    case 3: { // Orc — широкий эллипс + клыки снизу
      gfx.fillStyle(c, 1);
      gfx.fillEllipse(cx, cy, s*2.1, s*1.7);
      gfx.fillTriangle(cx - s*0.22, cy + s*0.45, cx - s*0.08, cy + s*0.85, cx + s*0.06, cy + s*0.45);
      gfx.fillTriangle(cx + s*0.22, cy + s*0.45, cx + s*0.08, cy + s*0.85, cx - s*0.06, cy + s*0.45);
      break;
    }
    case 4: { // Troll — круг + тёмные каменные пятна
      gfx.fillStyle(c, 1);
      gfx.fillCircle(cx, cy, s);
      gfx.fillStyle(0x000000, 0.28);
      gfx.fillCircle(cx - s*0.42, cy + s*0.28, s*0.24);
      gfx.fillCircle(cx + s*0.38, cy - s*0.18, s*0.20);
      gfx.fillCircle(cx + s*0.10, cy + s*0.45, s*0.22);
      break;
    }
    case 5: { // Dragon — треугольные крылья + тело
      gfx.fillStyle(c, 0.65);
      gfx.fillTriangle(cx - s*1.7, cy - s*0.8,  cx - s*0.8, cy - s*0.3,  cx - s*0.4, cy + s*0.2);
      gfx.fillTriangle(cx + s*1.7, cy - s*0.8,  cx + s*0.8, cy - s*0.3,  cx + s*0.4, cy + s*0.2);
      gfx.fillStyle(c, 1);
      gfx.fillCircle(cx, cy, s);
      break;
    }
    case 6: { // Phoenix — тело + 3 языка пламени + white tip
      gfx.fillStyle(c, 1);
      gfx.fillCircle(cx, cy + s*0.18, s*0.82);
      gfx.fillTriangle(cx - s*0.26, cy - s*0.16, cx,         cy - s*1.05, cx + s*0.26, cy - s*0.16);
      gfx.fillTriangle(cx - s*0.45, cy + s*0.04, cx - s*0.14, cy - s*0.84, cx + s*0.08, cy + s*0.04);
      gfx.fillTriangle(cx + s*0.45, cy + s*0.04, cx + s*0.14, cy - s*0.84, cx - s*0.08, cy + s*0.04);
      gfx.fillStyle(0xffffff, 0.8);
      gfx.fillCircle(cx, cy - s, s*0.14);
      break;
    }
    case 7: { // Titan — шестигранник + 6 шипов
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
        pts.push({ x: cx + Math.cos(a) * s, y: cy + Math.sin(a) * s });
      }
      gfx.fillStyle(c, 1);
      gfx.fillPoints(pts, true);
      for (let i = 0; i < 6; i++) {
        const a1 = (i / 6)       * Math.PI * 2 - Math.PI / 6;
        const a2 = ((i + 0.5) / 6) * Math.PI * 2 - Math.PI / 6;
        const a3 = ((i + 1) / 6)   * Math.PI * 2 - Math.PI / 6;
        gfx.fillTriangle(
          cx + Math.cos(a1) * s,        cy + Math.sin(a1) * s,
          cx + Math.cos(a2) * s * 1.32, cy + Math.sin(a2) * s * 1.32,
          cx + Math.cos(a3) * s,        cy + Math.sin(a3) * s
        );
      }
      break;
    }
    case 8: { // God — восьмигранник + 8 лучей
      const pts = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        pts.push({ x: cx + Math.cos(a) * s, y: cy + Math.sin(a) * s });
      }
      gfx.fillStyle(c, 1);
      gfx.fillPoints(pts, true);
      gfx.fillStyle(c, 0.45);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        gfx.fillTriangle(
          cx + Math.cos(a) * s * 0.28,         cy + Math.sin(a) * s * 0.28,
          cx + Math.cos(a + 0.14) * s * 1.45,  cy + Math.sin(a + 0.14) * s * 1.45,
          cx + Math.cos(a - 0.14) * s * 1.45,  cy + Math.sin(a - 0.14) * s * 1.45
        );
      }
      break;
    }
    default: { gfx.fillStyle(c, 1); gfx.fillCircle(cx, cy, s); }
  }

  // Inner shine (все уровни)
  gfx.fillStyle(0xffffff, 0.20);
  gfx.fillCircle(cx - s*0.25, cy - s*0.28, s*0.32);
}
```

Метод `_drawEvolutionChain(W, H)`:
```javascript
_drawEvolutionChain(W, H) {
  const panelY = Math.round(H * 0.465);
  const panelH = 74;
  const maxSize = 75;

  // Glass panel
  const panel = this.add.graphics().setAlpha(0);
  panel.fillStyle(0xffffff, 0.03);
  panel.fillRoundedRect(10, panelY, W - 20, panelH, 12);
  panel.lineStyle(1, 0xffffff, 0.07);
  panel.strokeRoundedRect(10, panelY, W - 20, panelH, 12);
  this.tweens.add({ targets: panel, alpha: 1, duration: 500, delay: 700 });

  const slotW = (W - 20) / CREATURES.length;

  CREATURES.forEach((c, i) => {
    const cx = 10 + slotW * i + slotW / 2;
    const cy = panelY + 28;
    // Пропорциональный радиус: Slime=8px, God=15px
    const r = 8 + Math.round((c.size / maxSize) * 7);

    const shape = this.add.graphics().setAlpha(0).setScale(0.15);
    this._drawCreatureShape(shape, c, cx, cy, r);
    this.tweens.add({ targets: shape, alpha: 1, scaleX: 1, scaleY: 1, duration: 300, delay: 900 + i * 65, ease: 'Back.easeOut' });

    // Имя существа
    this.add.text(cx, panelY + panelH - 11, c.name.substring(0, 3).toUpperCase(), {
      fontSize: '7px', fontFamily: 'Arial Black',
      color: '#' + c.color.toString(16).padStart(6, '0')
    }).setOrigin(0.5).setAlpha(0);
    // (alpha tween отдельным вызовом)
    const nameT = this.children.getAll().slice(-1)[0];
    this.tweens.add({ targets: nameT, alpha: 0.65, duration: 280, delay: 990 + i * 65 });

    // Стрелка-треугольник между существами
    if (i < CREATURES.length - 1) {
      const ax = cx + slotW / 2;
      const arr = this.add.graphics().setAlpha(0);
      arr.fillStyle(0xffffff, 0.18);
      arr.fillTriangle(ax - 4, cy - 2, ax - 4, cy + 2, ax + 3, cy);
      this.tweens.add({ targets: arr, alpha: 1, duration: 250, delay: 1040 + i * 65 });
    }
  });
}
```

### Таск 1.3 — Play Button (full width)

```javascript
_drawPlayButton(W, H) {
  const btnW = W - 32, btnH = 62;
  const bx = 16, by = Math.round(H * 0.665);

  const glow = this.add.graphics().setAlpha(0);
  glow.fillStyle(0xc8a951, 0.12);
  glow.fillEllipse(W / 2, by + btnH / 2, btnW + 60, btnH + 42);

  const btn = this.add.graphics().setAlpha(0);
  btn.fillGradientStyle(0xe0bc62, 0xe0bc62, 0x7a5210, 0x7a5210, 1);
  btn.fillRoundedRect(bx, by, btnW, btnH, 8);

  const shine = this.add.graphics().setAlpha(0);
  shine.lineStyle(1.5, 0xfff6cc, 0.52);
  shine.beginPath(); shine.moveTo(bx + 18, by + 5); shine.lineTo(bx + btnW - 18, by + 5); shine.strokePath();

  const border = this.add.graphics().setAlpha(0);
  border.lineStyle(1.5, 0xc8a951, 0.88);
  border.strokeRoundedRect(bx, by, btnW, btnH, 8);

  const btnText = this.add.text(W / 2, by + btnH / 2, 'PLAY NOW', {
    fontSize: '24px', fontFamily: 'Arial Black', color: '#ffffff',
    shadow: { offsetX: 0, offsetY: 2, color: '#5a3005', blur: 8, fill: true }
  }).setOrigin(0.5).setAlpha(0);

  [glow, btn, shine, border, btnText].forEach(obj => {
    obj.y += 26;
    this.tweens.add({ targets: obj, y: obj.y - 26, alpha: 1, duration: 500, ease: 'Back.easeOut', delay: 970 });
  });
  this.tweens.add({ targets: glow, alpha: { from: 0.06, to: 0.24 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 1500 });

  const hit = this.add.zone(W / 2, by + btnH / 2, btnW, btnH + 10).setInteractive({ useHandCursor: true });
  hit.on('pointerover', () => this.tweens.add({ targets: [btn, btnText, shine, border], scaleX: 1.02, scaleY: 1.02, duration: 120 }));
  hit.on('pointerout',  () => this.tweens.add({ targets: [btn, btnText, shine, border], scaleX: 1, scaleY: 1, duration: 120 }));
  hit.on('pointerdown', () => {
    this.tweens.add({ targets: [btn, btnText, shine, border], scaleX: 0.97, scaleY: 0.97, duration: 80, onComplete: () => {
      this.cameras.main.flash(180, 200, 160, 0);
      this.cameras.main.fadeOut(320, 0, 0, 0);
      this.time.delayedCall(320, () => this.scene.start('GameScene'));
    }});
  });
}
```

### Таск 1.4 — Background (сохранить + добавить diagonal grid)

Добавить диагональную сетку поверх фона:

```javascript
// В _drawBackground(), после scanlines:
// Diagonal grid — adds texture, depth
const diag = this.add.graphics();
diag.lineStyle(1, 0xffffff, 0.025);
const sp = 32; // spacing
for (let i = -H; i < W + H; i += sp) {
  diag.beginPath(); diag.moveTo(i, 0); diag.lineTo(i + H, H); diag.strokePath();
}
for (let i = -H; i < W + H; i += sp) {
  diag.beginPath(); diag.moveTo(i, 0); diag.lineTo(i - H, H); diag.strokePath();
}
```

### Таск 1.5 — Footer + layout

```javascript
_drawFooter(W, H) {
  this.add.text(W / 2, Math.round(H * 0.845),
    'Drop creatures  ·  Same level = Merge  ·  Defend your base', {
    fontSize: '10px', fontFamily: 'Arial', color: '#38415a', letterSpacing: 1
  }).setOrigin(0.5);
}
```

**Итоговая структура create() для BootScene:**
```javascript
create() {
  const W = this.scale.width, H = this.scale.height;
  this._drawBackground(W, H);    // bg + scanlines + diagonal grid + blobs + corners
  this._drawTitleBadge(W, H);    // hexagonal badge + MERGE eyebrow + CHAOS dominant
  this._drawEvolutionChain(W, H); // creature shapes + names + arrows
  this._drawPlayButton(W, H);    // full-width button
  this._drawFooter(W, H);
}
```

---

## АГЕНТ 2 — UIScene: HUD без pill-паттерна

**Файл:** `~/merge-chaos/js/scenes/UIScene.js`  
**Таск:** Переписать только `drawTopHUD(W)`. Остальные методы — БЕЗ ИЗМЕНЕНИЙ.

### Текущая проблема
3 отдельных pill-пузыря (HP pill | Score pill | Coins pill) выглядят как шаблон веб-приложения. Нужен единый бар с **вертикальными разделителями** — game HUD стиль.

### Новая структура drawTopHUD(W)

```
[━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━]  ← единый тёмный бар
[🛡 HP BAR ████████░░] | [★ 12,450 | WAVE 3] | [🪙 450]
                       ↑                     ↑
              вертикальный разделитель   вертикальный разделитель
```

```javascript
drawTopHUD(W) {
  // Единый бар — без отдельных pills
  const bar = this.add.graphics();
  bar.fillStyle(0x030310, 0.94);
  bar.fillRect(0, 0, W, 54);
  // Gold bottom accent
  bar.lineStyle(1, 0xc8a951, 0.22);
  bar.beginPath(); bar.moveTo(0, 53); bar.lineTo(W, 53); bar.strokePath();
  bar.lineStyle(1, 0x000000, 1);
  bar.beginPath(); bar.moveTo(0, 54); bar.lineTo(W, 54); bar.strokePath();

  // Вертикальные разделители (заменяют pill-границы)
  const sep = this.add.graphics();
  sep.lineStyle(1, 0xffffff, 0.08);
  // Левый разделитель: между HP и Score
  sep.beginPath(); sep.moveTo(W * 0.36, 8); sep.lineTo(W * 0.36, 46); sep.strokePath();
  // Правый разделитель: между Score и Coins
  sep.beginPath(); sep.moveTo(W * 0.68, 8); sep.lineTo(W * 0.68, 46); sep.strokePath();

  // ── HP СЕКЦИЯ (левая треть: x=0 до x=W*0.36) ──────────────────────────────
  const shieldGfx = this.add.graphics();
  this.drawShieldIcon(shieldGfx, 16, 16, 7);

  this.baseHpText = this.add.text(29, 8, '100%', {
    fontSize: '14px', fontFamily: 'Arial Black', color: '#e84040'
  }).setOrigin(0, 0);

  // HP bar — горизонтальная полоска (5 сегментов)
  this.baseHpBar = this.add.graphics();
  this._drawMiniHpBar(1.0);

  // ── SCORE + WAVE СЕКЦИЯ (центральная треть) ────────────────────────────────
  const scoreCX = W * 0.52;
  const starGfx = this.add.graphics();
  this.drawStarIcon(starGfx, scoreCX - 24, 16, 8);

  this.scoreText = this.add.text(scoreCX - 11, 7, '0', {
    fontSize: '18px', fontFamily: 'Arial Black', color: '#c8a951',
    shadow: { offsetX: 0, offsetY: 0, color: '#a07830', blur: 12, fill: true }
  }).setOrigin(0, 0);

  const waveBg = this.add.graphics();
  waveBg.fillStyle(0x6c9fff, 0.10);
  waveBg.fillRoundedRect(scoreCX - 30, 31, 60, 16, 8);
  this.waveText = this.add.text(scoreCX, 39, 'WAVE 1', {
    fontSize: '9px', fontFamily: 'Arial Black', color: '#6c9fff', letterSpacing: 2
  }).setOrigin(0.5);

  // ── COINS СЕКЦИЯ (правая треть: x=W*0.68 до x=W) ──────────────────────────
  const coinCX = W * 0.795;
  const coinGfx = this.add.graphics();
  this.drawCoinIcon(coinGfx, coinCX - 16, 16, 8);

  this.coinsText = this.add.text(coinCX, 7, '0', {
    fontSize: '18px', fontFamily: 'Arial Black', color: '#c8a951'
  }).setOrigin(0, 0);

  this.add.text(coinCX, 31, 'COINS', {
    fontSize: '7px', fontFamily: 'Arial Black', color: '#4a3d18', letterSpacing: 1
  }).setOrigin(0, 0);
}

_drawMiniHpBar(pct) {
  if (!this.baseHpBar) return;
  this.baseHpBar.clear();
  const segs = 5, segW = 12, gap = 2;
  const startX = 10, y = 34;
  for (let i = 0; i < segs; i++) {
    const filled = i < Math.ceil(pct * segs);
    const color = pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xffaa00 : 0xe84040;
    this.baseHpBar.fillStyle(filled ? color : 0x181828, 1);
    this.baseHpBar.fillRoundedRect(startX + i * (segW + gap), y, segW, 7, 2);
  }
}
```

**ВАЖНО:** В `listenToGame()` добавить вызов `this._drawMiniHpBar(baseHP / maxHP)` при statsUpdate (уже было в v2 — проверить что есть).

---

## АГЕНТ 3 — UIScene: Bottom Bar с силуэтами

**Файл:** `~/merge-chaos/js/scenes/UIScene.js`  
**Таск:** Переписать только `drawBottomGuide(W, H)` + добавить метод `_drawCreatureShapeSmall(gfx, cfg, cx, cy, r)`.

### Логика

Использовать **тот же** `_drawCreatureShape` код что в BootScene (см. выше) но добавить его в UIScene как `_drawCreatureShapeSmall`. Размеры те же, масштаб r=6..13px.

```javascript
drawBottomGuide(W, H) {
  const guideY = H - 50;
  const guide = this.add.graphics();
  guide.fillStyle(0x030310, 0.82);
  guide.fillRect(0, guideY, W, 50);
  guide.lineStyle(1, 0xffffff, 0.05);
  guide.beginPath(); guide.moveTo(0, guideY); guide.lineTo(W, guideY); guide.strokePath();
  guide.lineStyle(1, 0xc8a951, 0.12);
  guide.beginPath(); guide.moveTo(0, guideY + 1); guide.lineTo(W, guideY + 1); guide.strokePath();

  const slotW = W / CREATURES.length;
  const maxSize = 75;

  CREATURES.forEach((c, i) => {
    const cx = slotW * i + slotW / 2;
    const cy = guideY + 18;
    const r = 6 + Math.round((c.size / maxSize) * 7); // 6-13px

    const shape = this.add.graphics();
    this._drawCreatureShapeSmall(shape, c, cx, cy, r);

    this.add.text(cx, guideY + 38, c.name.substring(0, 3).toUpperCase(), {
      fontSize: '7px', fontFamily: 'Arial Black',
      color: '#' + c.color.toString(16).padStart(6, '0')
    }).setOrigin(0.5).setAlpha(0.6);

    if (i < CREATURES.length - 1) {
      const ax = cx + slotW / 2;
      const arr = this.add.graphics();
      arr.fillStyle(0xffffff, 0.14);
      arr.fillTriangle(ax - 3, cy - 2, ax - 3, cy + 2, ax + 3, cy);
    }
  });
}
```

`_drawCreatureShapeSmall` — **ПОЛНАЯ КОПИЯ** кода `_drawCreatureShape` из BootScene (см. выше). Дублировать не элегантно, но оба файла независимы.

---

## Схема мультиагентного запуска

```
Сессия 20 старт
│
├── Агент 1 → js/scenes/BootScene.js
│   ├── Таск 1.1: _drawTitleBadge() — гексагональный badge
│   ├── Таск 1.2: _drawCreatureShape() + _drawEvolutionChain() — силуэты
│   ├── Таск 1.3: _drawPlayButton() — full-width
│   ├── Таск 1.4: _drawBackground() — добавить diagonal grid
│   └── Таск 1.5: _drawFooter()
│
├── Агент 2 → js/scenes/UIScene.js (только drawTopHUD)
│   ├── Таск 2.1: drawTopHUD() — убрать pills, добавить vertical separators
│   └── Таск 2.2: _drawMiniHpBar() — убедиться что метод есть
│
└── Агент 3 → js/scenes/UIScene.js (только drawBottomGuide)
    ├── Таск 3.1: _drawCreatureShapeSmall() — скопировать из кода выше
    └── Таск 3.2: drawBottomGuide() — силуэты вместо кружков
```

**ВАЖНО:** Агенты 2 и 3 работают в одном файле — запускать ПОСЛЕДОВАТЕЛЬНО (2 потом 3), или один агент делает оба таска.

---

## Проверочный чеклист после имплементации

```
[ ] BootScene: CHAOS занимает большую часть badge, 72px, видно с первого взгляда
[ ] BootScene: каждое существо в цепочке ВИЗУАЛЬНО ОТЛИЧАЕТСЯ (не просто кружок другого цвета)
[ ] BootScene: Slime=маленький blob, Goblin=уши, Dragon=крылья, God=8 лучей
[ ] BootScene: кнопка PLAY NOW занимает почти всю ширину экрана
[ ] UIScene: в HUD НЕТ трёх отдельных pill-рамок, есть вертикальные линии-разделители
[ ] UIScene: bottom bar — силуэты существ, не кружки
[ ] js syntax: node -e "new Function(require('fs').readFileSync('js/scenes/BootScene.js','utf8'))" — OK
[ ] js syntax: node -e "new Function(require('fs').readFileSync('js/scenes/UIScene.js','utf8'))" — OK
```

---

## ✅ РЕШЕНО — Сессия 18: Repair Visual Overhaul

### Что сделано

| Задача | Результат | Файл | Детали |
|--------|-----------|------|--------|
| **18-1** Красная рамка карточки | `borderCol = 0xe84040`, `lineStyle(2.5, ..., 1.0)` при `isCritical` | GameScene.js `_buildShopCard()` | `isCritical = item.id==='repair' && hpPct<0.4 && canAfford` |
| **18-2** Pulsing glow | `strokeRoundedRect` снаружи карточки (+3px), tween alpha 0.55→0.1→0.55 каждые 480ms | GameScene.js `_buildShopCard()` | Отдельный graphics за карточкой (depth D) |
| **18-3** Красный тинт шапки | `fillGradientStyle(0xe84040, ...)` вместо золотого | GameScene.js `_buildShopCard()` | Opacity 0.14 вместо 0.08 |
| **18-4** BASE CRITICAL! badge | Badge в верхней части карточки (y+8), fade-in 200ms, потом pulse 1→0.55→1 каждые 500ms | GameScene.js `_buildShopCard()` | Заменяет RECOMMENDED badge при isCritical |
| **18-5** Красная иконка repair | `bgColor=0x3a0808`, `fgColor=0xe84040` при `critical=true` | GameScene.js `_drawShopIcon()` | Добавлен параметр `critical=false` |
| **18-6** Suppressed FOMO | `baseHP >= maxBaseHP*0.4` — доп. условие | GameScene.js `_showShop()` | При HP<40% FOMO строка не показывается |

### Логика isCritical
```javascript
// В _buildShopCard():
const isCritical = item.id === 'repair' && hpPct < 0.4 && canAfford;
// isCritical = true только если: это карточка repair, HP < 40%, И игрок может купить
// При isCritical: красная рамка, glow, красный тинт, BASE CRITICAL! badge, красная иконка
// RECOMMENDED badge и FOMO строка подавляются при isCritical
```

### Новая сигнатура _drawShopIcon
```javascript
_drawShopIcon(gfx, id, x, y, r, active, critical = false)
// case 'repair' при critical=true: bgColor=0x3a0808, fgColor=0xe84040
```

---

## ✅ Контекст из анализа C17 — мотивация для Сессии 18

### Контекст из анализа C17 (3977 событий, 3 сессии)

**Результаты:**
| Сессия | Death wave | Score | Coins при смерти |
|--------|-----------|-------|-----------------|
| S1 | W17 | 19 160 | 1 456₽ |
| S2 | W22 | 30 900 | 2 440₽ |
| S3 | W15 | 16 270 | 1 172₽ |
| **Median** | **W17** | — | **avg 1 689₽** |

**ВАЖНО про монеты:** накопление монет — структурная математика (1 покупка/волна, доход растёт каждую волну), а не "hoarding". 1600₽ при смерти не означает что игрок "отказывался тратить" — просто earn rate > spend rate структурно. Агент-psychology ошибся в интерпретации.

**ВАЖНО про freeze:** игрок (тестер) брал freeze осознанно перед боссом — 25 секунд чтобы организовать поле и прокачать мержи. Абсолютно рациональная стратегия. BOSS COUNTER badge просто подтвердил уже понятый момент.

**ВАЖНО про баланс:** тестер — skilled player с emergent стратегией "lane sacrifice" (спам дешёвых мобов в прорванный ряд как живая стена → враги замедляются → соседние ряды добивают). Casual игрок без этой стратегии likely умирает на W7–10 при текущем C16b балансе — что попадает в цель W9–12. **Не трогать баланс до появления внешних тестеров.**

**Дизайн-вопрос открытый:** W15–22 (skilled) vs W9–12 (casual) — что лучше для retention? Гипотеза А: короткие сессии → сильнее loss aversion loop. Гипотеза Б: длинные → emergent стратегии раскрываются → глубже вовлечение. Ответ только в A/B тесте.

**Shop UI (C17) — итог:**
- Покупок/сессию: 2.67 → 16.7 (+525%) ✅
- BOSS COUNTER freeze: 46% перед боссом ✅
- Repair при HP<50%: 0 раз ❌ — mental model не изменился

### Единственная приоритетная задача: Repair Visual

**Проблема:** repair куплен 0 раз при HP<50%, хотя монеты были. Причина — mental model: repair выглядит как обычная карточка, не ощущается как "аварийная кнопка".

**Решение (изменить восприятие, не цену):**
- При HP<40%: карточка repair — красная рамка + shake при открытии магазина
- Иконка repair мигает красным вместо зелёного
- Прямо над карточкой (не generic): `"⚠ BASE CRITICAL"` красным — вместо FOMO-строки
- Цену и хил НЕ менять (20₽, +25 HP)

### Порядок работы
```
1. ✅ Реализовать repair visual overhaul (красная рамка, glow, BASE CRITICAL! badge, красная иконка)
2. Сыграть 3 сессии → audit.log → 3 агента
3. Проверить: repair при HP<40% > 0?
4. Дождаться внешних тестеров перед balance правками
```

---

## ✅ РЕШЕНО — Сессия 19: Visual Redesign v2

### Источник рекомендаций
Использован скилл `ui-ux-pro-max` (база данных Antigravity Kit). Ключевой шаблон: **Modern Dark Cinema Mobile**.

### Принципы дизайна v2 (из скилла)
- Surface: `rgba(255,255,255,0.04)`, hairline border: `rgba(255,255,255,0.08)`
- Accent glow behind primary CTA (gold ellipse, pulsing α 0.07→0.26)
- Inner highlight line at top of buttons (1.5px, rgba(255,246,204,0.55))
- Proportional size hierarchy для evolution chain
- Gradient CTA button: `fillGradientStyle(light→dark)`
- Scale press 0.97→1.0 на всех интерактивных элементах

### Что изменено

| Файл | Изменение |
|------|-----------|
| **BootScene.js** | Полная перепись. Title: MERGE 50px gold + CHAOS 70px teal + glow ellipses + horizontal rule + diamond accent + side dots + tagline "TOWER DEFENSE × MERGE STRATEGY". Evolution chain: proportional circles (Slime r=7px → God r=15px), названия SLI/GOB/ORC..., drawn triangle arrows. Button: gradient fill + inner shine line + gold glow ellipse + hairline border. Footer: лучший контраст. |
| **UIScene.js** | HUD: HP section height 44px с mini HP bar 5 сегментов; score 18px; coins section 88px wide с "COINS" sublabel. Bottom guide: proportional circles с glow halo, creature names (3 буквы), drawn triangle arrows. Death screen: teal top accent line на панели. |
| **GameScene.js** | Coverage bar: 6px вместо 4px (alpha 0.85 вместо 0.8). |

### Новые методы UIScene
```javascript
_drawMiniHpBar(pct)  // 5 сегментов, green/orange/red по уровню HP
// Вызывается в listenToGame() при каждом statsUpdate
```

### Как начать новую сессию
```
Прочитай файл ~/merge-chaos/HANDOFF.md и начни Сессию 20.
```

---

## 🔴 СЛЕДУЮЩАЯ КРУПНАЯ ЗАДАЧА — Сессия 19: Полная визуальная переработка (ВЫПОЛНЕНО)

### Проблема
Весь визуал выглядит дёшево и "AI-generated". Нужен полный редизайн с нуля. Использовать встроенный скилл `ui-ux-pro-max`.

### Конкретные элементы для переработки (по экранам)

**BootScene (стартовый экран):**
- Название `MERGE CHAOS` — выглядит дёшево и пластиково
- Tagline `Drop · Merge · Dominate` — слишком просто
- Кружки уровней существ внизу — выглядят пластиково
- Кнопка `PLAY NOW` — слишком AI-generated

**Game HUD (во время игры):**
- HP секция слева вверху — дёшево
- Score со звёздочкой по центру — дёшево
- Монеты справа вверху — дёшево
- Badge `WAVE 1` — дёшево
- Всё вместе выглядит как шаблонный AI UI

**Магазин (between waves overlay):**
- Весь overlay выглядит AI-generated
- Карточки предметов — пластиково

**Bottom bar (нижняя панель):**
- Coverage bar / XP полоска внизу — дёшево
- Кружки `Level 1 / Level 2 / Level 3` — пластиково
- Обозначения уровней мобов на самих существах — пластиково

### Подход к сессии 19
```
1. Запустить ui-ux-pro-max скилл на анализ текущего визуала
2. Возможно — несколько агентов для reference-анализа (топ мобильные TD игры)
3. Разработать дизайн-систему v2 (токены, типографика, иконки)
4. Реализовать поэкранно: Boot → HUD → Shop → Bottom bar
```

### Ключевое требование
Всё по-прежнему только Phaser Graphics API — ноль OS-эмодзи, ноль внешних изображений. Визуал должен подняться в качестве исключительно через форму, цвет, анимацию и типографику.

---

---

## 🔴 СЕССИЯ 21: BootScene — Атмосфера и глубина (не структура, а ощущение)

### Диагноз после Сессии 20

Сессия 20 исправила **структуру** — badge есть, силуэты есть, кнопка широкая. Но дизайн по-прежнему выглядит **flat и несовременным**. Три агента C20 установили причину:

> Когда фон визуально тяжелее контента — это сломанный дизайн. Три blob занимают большую часть пространства. Контент (badge, цепочка, кнопка) тонет в декоре.

**Ключевой инсайт:** Проблема не в структуре (она теперь правильная), а в **ощущении глубины, атмосферы и "живости"**. Сейчас всё статично, матово, плоско.

### Что НЕ ТРОГАТЬ

- Гексагональный badge ✅ — оставить
- Силуэты в evolution chain ✅ — оставить  
- Full-width кнопка ✅ — оставить
- HUD без pills ✅ — оставить
- Diagonal grid ✅ — оставить

### Что МЕНЯТЬ в Сессии 21 (только BootScene.js)

#### Приоритет 1 — Убрать blob-доминирование

Текущие blobs (r=110, 85, 130) слишком большие и тёмные, сливаются с фоном и создают грязь.

**Замена:** Вместо трёх больших blob → мелкие floating particles (20-40 штук, r=1-3px, случайные позиции, медленный drift вверх, alpha 0.3-0.6). Это создаёт живость без конкуренции с контентом.

```javascript
// _drawParticles(W, H) — заменяет blob-логику
for (let i = 0; i < 35; i++) {
  const px = Math.random() * W;
  const py = Math.random() * H;
  const r = Math.random() * 1.5 + 0.5;
  const colors = [0xc8a951, 0x00e5cc, 0x7c5cfc];
  const c = colors[Math.floor(Math.random() * colors.length)];
  const gfx = this.add.graphics();
  gfx.fillStyle(c, Math.random() * 0.3 + 0.15);
  gfx.fillCircle(0, 0, r);
  gfx.x = px; gfx.y = py;
  this.tweens.add({
    targets: gfx,
    y: py - Phaser.Math.Between(40, 120),
    alpha: { from: Math.random() * 0.3 + 0.15, to: 0 },
    duration: Phaser.Math.Between(3000, 7000),
    delay: Phaser.Math.Between(0, 4000),
    repeat: -1,
    onRepeat: () => { gfx.x = Math.random() * W; gfx.y = H + 10; gfx.setAlpha(Math.random() * 0.3 + 0.15); }
  });
}
```

#### Приоритет 2 — Глубина в badge через layering

Добавить за badge два дополнительных слоя:
- **Radial glow за badge** — большой мягкий круг (r=200, teal, alpha 0.04) пульсирует
- **Scan line эффект поверх badge** — горизонтальная полоса анимируется сверху вниз каждые 3с (alpha 0.06, ширина badge, высота 4px)

#### Приоритет 3 — Кнопка PLAY NOW: pulse + particle burst

Кнопка должна "зазывать" — сейчас она статична после entrance.

- После появления: glow эллипс пульсирует 0.08 → 0.28 (уже есть, но усилить)
- Добавить `setInterval`-like повторяющееся mini-burst вокруг кнопки: 4-6 маленьких частиц вылетают из краёв каждые 2.5с

#### Приоритет 4 — Силуэты в evolution chain: glow highlight

Каждый силуэт должен иметь цветной glow halo который пульсирует (не все одновременно, а с offset):
```javascript
// После _drawCreatureShape:
const halo = this.add.graphics();
halo.fillStyle(c.color, 0.0);
halo.fillCircle(cx, cy, r + 8);
this.tweens.add({
  targets: halo,
  alpha: { from: 0, to: 0.22 },
  duration: 1200,
  delay: 1200 + i * 120,
  yoyo: true, repeat: -1,
  ease: 'Sine.easeInOut'
});
```

### Схема агентов для Сессии 21

```
Сессия 21 старт
│
├── Агент 1 → _drawBackground() — заменить blobs на particles
│
├── Агент 2 → _drawTitleBadge() — добавить radial glow + scan line
│
├── Агент 3 → _drawEvolutionChain() — добавить pulsing halo к силуэтам
│
└── Агент 4 → _drawPlayButton() — усилить pulse, добавить mini particle burst
```

**Агенты 1-4 независимы — запускать ПАРАЛЛЕЛЬНО.**

### Навык для загрузки в начале Сессии 21

В начале сессии загрузить скилл: `/run` или вручную использовать Skill tool с `ui-ux-pro-max`. Этот скилл содержит паттерны Modern Dark Cinema Mobile которые должны информировать каждое решение.

### Чеклист готовности после Сессии 21

```
[ ] Нет огромных blob-кругов конкурирующих с контентом
[ ] Есть живость — что-то анимируется в фоне (particles/drift)
[ ] Badge имеет глубину — не плоская форма, а слоистое свечение
[ ] Силуэты "дышат" — хотя бы один цикл анимации виден без взаимодействия
[ ] Кнопка PLAY NOW привлекает взгляд без нажатия
[ ] Общее впечатление: premium game, не веб-приложение
```

---

## 🔴 СЕССИЯ 22: Следующие шаги

После Сессии 21 BootScene имеет:
- Структуру v3: hex badge, силуэты, full-width кнопка ✅
- Атмосферу: particles, radial glow, scan line, pulsing halos, particle burst ✅

### Что проверить в начале Сессии 22

1. Запустить сервер (`python3 server.py`), открыть localhost:3000
2. Пройти по чеклисту из Сессии 21:
   ```
   [ ] Нет огромных blob-кругов конкурирующих с контентом
   [ ] Есть живость — частицы дрейфуют в фоне
   [ ] Badge имеет глубину — radial glow пульсирует + scan line видна
   [ ] Силуэты "дышат" — halo анимируются с offset
   [ ] Кнопка PLAY NOW привлекает взгляд — gold burst по краям
   [ ] Общее впечатление: premium game, не веб-приложение
   ```
3. Если визуально всё ок — следующая приоритетная задача: **внешние тестеры + audit.log анализ**
4. Если что-то не так визуально — итерировать

### Возможные следующие направления
- Магазин (Shop overlay): те же принципы depth/atmosphere применить к карточкам
- GameScene visual: тот же atmosphere pass для игровой арены
- Деплой на Netlify для внешних тестеров

## Память проекта (auto-memory)
Дополнительные файлы в `~/.claude/projects/.../memory/`:
- `project_merge_chaos.md` — дизайн-решения и стек
- `evaluation_criteria.md` — чеклист готовности по 4 стадиям
- `agent_findings.md` — результаты 3 агентов (UX + psychology + code eval)

---

## 🔴 СЕССИЯ 23: UI/UX Deep Research — результаты 7 агентов

### Статус: ТОЛЬКО ПЛАН, ИМПЛЕМЕНТАЦИЯ НЕ НАЧАТА

Сессия 23 была полностью посвящена исследованию. 7 агентов провели глубокий анализ по 4 направлениям. Готовый план: `~/.claude/plans/merge-chaos-handoff-md-vivid-salamander.md`

---

### КРИТИЧЕСКИЕ ФАКТЫ PHASER 3.60 (подтверждено из исходников GitHub)

#### Graphics не принимает preFX — ОБЯЗАТЕЛЕН RenderTexture паттерн
```javascript
// ❌ НЕ РАБОТАЕТ
graphics.preFX.addGlow(...)

// ✅ ПРАВИЛЬНО
const rt = this.add.renderTexture(x, y, w, h);
rt.draw(graphics, 0, 0);
rt.postFX.addGlow(0xc8a951, 8, 0, false, 0.1, 16);
// preFX на Sprite требует setFXPadding(16)!
```

#### Полный список встроенных postFX (все доступны в 3.60)
`addGlow`, `addBloom` (настоящий bloom, отличается от glow!), `addShadow`, `addBlur`, `addVignette`, `addShine`, `addColorMatrix`, `addGradient`, `addBokeh`, `addTiltShift`, `addWipe`, `addReveal`, `addCircle`, `addPixelate`, `addBarrel`, `addDisplacement`

**Твинить FX-контроллер напрямую:**
```javascript
const glow = obj.postFX.addGlow(0xffd700, 0);
this.tweens.add({ targets: glow, outerStrength: 8, duration: 300 });
// addGlow: quality и distance baked при создании — нельзя менять после!
```

#### Particle Emitter — API полностью изменён в 3.60
```javascript
// ❌ СТАРЫЙ API (удалён, не работает):
// const manager = this.add.particles('key');
// const emitter = manager.createEmitter({...});

// ✅ НОВЫЙ API:
const emitter = this.add.particles(x, y, textureKey, {
  color: [0xfacc22, 0xf89800, 0xf83600],
  colorEase: 'quad.out',
  lifespan: 1200,
  speed: 150,
  scale: { start: 0.6, end: 0 },
  gravityY: 300,
  blendMode: 'ADD',
  emitting: false
});
emitter.explode(12, targetX, targetY);

// ВАЖНО: нужен textureKey — создать в create():
const dotGfx = this.make.graphics({ add: false });
dotGfx.fillStyle(0xffffff); dotGfx.fillCircle(4, 4, 4);
const dotRT = this.add.renderTexture(0, 0, 8, 8, false);
dotRT.draw(dotGfx); dotRT.saveTexture('dot');
// Затем: this.add.particles(x, y, 'dot', config)
```

#### Custom PostFXPipeline (GLSL шейдер)
```javascript
class ColorGradePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: 'ColorGrade', fragShader: `
      precision mediump float;          // mediump = обязателен на мобильных
      uniform sampler2D uMainSampler;
      uniform float uContrast;
      uniform vec3 uTint;
      varying vec2 outTexCoord;         // outTexCoord (не outTextCoord!)
      void main() {
        vec4 c = texture2D(uMainSampler, outTexCoord);
        c.rgb = mix(vec3(0.5), c.rgb, uContrast);
        c.rgb *= uTint;
        gl_FragColor = c;
      }
    `});
  }
  onPreRender() {
    this.set1f('uContrast', 1.2);
    this.set3f('uTint', 0.88, 0.84, 1.0); // лёгкий purple tint
  }
}
// Регистрация в Phaser.Game config: { pipeline: { ColorGradePipeline } }
// Применение: this.cameras.main.setPostPipeline('ColorGradePipeline');
```

---

### АУДИТ ТЕКУЩЕГО ВИЗУАЛА (Агент 1)

| Сцена | PostFX | Оценка |
|-------|--------|--------|
| BootScene | ✅ addVignette, addGlow на тексте, particles | Структура ✅, depth есть |
| GameScene | ❌ НОЛЬ postFX | Главная проблема |
| UIScene | ❌ Нет postFX | Вторичная |

**GameScene — самый большой визуальный долг:**
- Нет vignette на камере
- Нет glow на существах (ни на каком уровне)
- Нет depth на shop картах
- Враги — одинаковые шары разного цвета (нет shape variety)
- Base HP bar не реагирует визуально на критический HP

---

### ДИЗАЙН-ПАТТЕРНЫ ИЗ PREMIUM ИГР (Raid Shadow Legends, AFK Arena)

#### Premium Dark Glass Card (6 слоёв для Shop карточек)
1. **Outer glow** — `fillRoundedRect(x-4, y-4, w+8, h+8)`, alpha 0.08→0.15 pulsing 2000ms
2. **Main BG** — `fillStyle(0x0d0d1a, 1)`, `fillRoundedRect`
3. **Double border** — outer 2px alpha 0.4, inner 0.8px alpha 0.15
4. **Top gradient** — `fillGradientStyle(gold, gold, dark, dark, 0.12, 0.12, 0, 0)` — 60px высота
5. **Specular highlight** — белый `fillCircle` в top-right (x+85%, y+15%), r=24
6. **Inner shadow** — тёмный gradient нижние 50px

#### Creature Visual Hierarchy (tier system)
```javascript
// Tier badges по уровню (corner badge):
// 1-2: зелёный circle | 3-4: синий diamond | 5-6: оранжевая star | 7-8: purple crown

// Aura rings (3 концентрических):
const auraAlpha = cfg.level <= 4
  ? [0.06, 0.12, 0.20]   // Common/Rare
  : cfg.level <= 6
  ? [0.06, 0.14, 0.25]   // Epic
  : [0.08, 0.16, 0.28];  // Legendary

// Pulsing rim для level 7-8:
rim.lineStyle(2, 0xa855f7, 0.5);
rim.strokeCircle(cx, cy, cfg.size + 5);
this.tweens.add({ targets: rim, alpha: { from: 0.5, to: 0.2 }, duration: 1200, yoyo: true, repeat: -1 });

// Glow интенсивность по уровню (0 для 1-4):
const glowStr = [0, 0, 0, 0, 3, 5, 7, 10][cfg.level - 1];
if (glowStr > 0) gfx.postFX.addGlow(cfg.color, glowStr);
```

#### Micro-animations (точные значения)
| Анимация | Длит. | Easing | Параметры |
|----------|-------|--------|-----------|
| Merge scale burst | 300ms | Back.easeOut | scale 1→1.3→1, hold 100ms |
| Particle spray | 600ms | Cubic.easeOut | 12 частиц, speed 100-150 |
| Coin flies to HUD | 500ms | Cubic.easeIn | scale 1→0.3 |
| Counter pulse | 200ms | Back.easeOut | scale 1→1.2→1, delay 300ms |
| Enemy attack flash | 100ms | Linear | white 0.3→0 |
| Level-up ring | 500ms | Quad.easeOut | ring expands + fades |
| Badge entrance stagger | 400ms | Back.easeOut | 150ms между items |

---

### ИНСТРУМЕНТЫ ДЛЯ УСТАНОВКИ

#### @playwright/mcp НЕ СУЩЕСТВУЕТ — правильный подход:
```bash
cd ~/merge-chaos
npm init -y
npm install --save-dev playwright pixelmatch pngjs backstopjs browser-sync
npx playwright install chromium
```

#### scripts/screenshot-game.js
```javascript
const { chromium } = require('playwright');
async function screenshotGame(name, delay = 2000) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(delay);
  await page.locator('canvas').screenshot({ path: `screenshots/${name}.png` });
  await browser.close();
}
const name = process.argv[2] || 'screenshot';
const delay = parseInt(process.argv[3] || '2000');
screenshotGame(name, delay);
```

#### package.json scripts
```json
{
  "scripts": {
    "dev": "browser-sync start --server . --files 'js/**,index.html' --port 3000",
    "screenshot": "node scripts/screenshot-game.js",
    "visual-ref": "npx backstop reference",
    "visual-test": "npx backstop test",
    "visual-approve": "npx backstop approve"
  }
}
```

#### phaser3-rex-plugins (опционально, после основных задач)
```bash
npm install phaser3-rex-plugins
# shader-shockwave — для boss spawn волны
# shader-dissolve — для scene transitions
# shader-outline — для pixel-perfect outline на silhouettes
```

---

### ПЛАН РЕАЛИЗАЦИИ (Сессия 24+)

| Фаза | Что делать | Агенты | Файл |
|------|-----------|--------|------|
| **1** | npm init + Playwright + baseline screenshots | 1 | — |
| **2a** | GameScene: camera vignette + ColorGrade pipeline + 'dot' texture | 1 | GameScene.js |
| **2b** | GameScene: creature aura/glow/tier badges | 1 | GameScene.js |
| **2c** | GameScene: merge particles + projectile glow + base critical glow | 1 | GameScene.js |
| **3** | Shop: 6-layer premium glass card | 1 | GameScene.js |
| **4** | Enemy shapes: Rat/Zombie/Demon/Boss distinct visuals | 1 | GameScene.js |
| **5** | GLSL fog shader (опционально) | 1 | GameScene.js |

**Все фазы 2-5 в GameScene.js — запускать агентов ПОСЛЕДОВАТЕЛЬНО.**

### Правила для агентов-реализаторов
1. `Graphics.preFX` не работает → всегда RenderTexture
2. `setFXPadding(16)` обязателен при preFX на Sprite
3. Particle emitter требует textureKey → создать 'dot' в create()
4. `addGlow` quality/distance baked — нельзя менять после создания
5. GLSL: `outTexCoord` (не `outTextCoord`), `mediump float`
6. Syntax check после каждого агента: `node -e "new Function(require('fs').readFileSync('js/scenes/GameScene.js','utf8'))()"`

---

## ✅ РЕШЕНО — Сессия 24: GameScene Visual Upgrade

### Что сделано

| Задача | Результат | Файл | Детали |
|--------|-----------|------|--------|
| **24-1** Camera vignette | `cameras.main.postFX.addVignette(0.5, 0.5, 0.72, 0.55)` при WebGL | GameScene.js `create()` | Тёмные края, яркий центр |
| **24-2** Dot texture | `renderTexture` + `saveTexture('pdot')` — готово для particle emitters | GameScene.js `create()` | Создаётся один раз в create() |
| **24-3** Creature aura rings | 3 концентрических кольца вместо одного outer glow; интенсивность ×2.5 для легендарных | GameScene.js `drawCreatureGfx()` | Заменил `fillStyle(c, 0.06) fillCircle(0,0,s+10)` |
| **24-4** Creature postFX glow | `gfx.postFX.addGlow(c, gs)` для уровней 5-8; glowStr = [0,0,0,0,4,6,8,12] | GameScene.js `drawCreatureGfx()` | Только если `gfx.postFX` существует |
| **24-5** Tier-colored badges | Уровни 1-2: зелёный, 3-4: синий, 5-6: оранжевый, 7-8: фиолетовый | GameScene.js (3 места) | `dropCreature`, `spawnCreatureAt`, `updatePreview` |
| **24-6** Enemy distinct shapes | `_drawEnemyShape(gfx, typeIdx, cfg, isBoss)` новый метод | GameScene.js | Rat=уши+рыло, Zombie=lumpy decay, Demon=рога+chin, Boss=diamond |
| **24-7** Shop outer glow | Pulsing glow для всех affordable карточек (alpha 0.09, 2000ms) | GameScene.js `_buildShopCard()` | Depth D-1, borderCol основа |
| **24-8** Shop specular | `fillCircle` белый top-right glint (r=22, alpha 0.08) | GameScene.js `_buildShopCard()` | Только при `canAfford` |
| **24-9** Shop inner border | Double border — тонкая внутренняя рамка (alpha 0.12) | GameScene.js `_buildShopCard()` | `strokeRoundedRect(x+3, y+3, w-6, h-6, 8)` |

### Ключевые изменения в drawCreatureGfx (актуально после С24)

```javascript
// Было:
gfx.fillStyle(c, 0.06); gfx.fillCircle(0, 0, s + 10);

// Стало (multi-ring aura):
const _aura = cfg.level <= 4
  ? [[s+16, 0.04], [s+10, 0.09], [s+4, 0.16]]
  : cfg.level <= 6
  ? [[s+20, 0.05], [s+13, 0.13], [s+5, 0.23]]
  : [[s+26, 0.07], [s+16, 0.19], [s+6, 0.34]];
for (const [_r, _a] of _aura) { gfx.fillStyle(c, _a); gfx.fillCircle(0, 0, _r); }

// В конце drawCreatureGfx (после rim light):
const _gs = [0, 0, 0, 0, 4, 6, 8, 12][cfg.level - 1];
if (_gs > 0 && gfx.postFX) gfx.postFX.addGlow(c, _gs, 0, false, 0.1, 14);
```

### Tier badge colors (актуально после С24)
```javascript
// В dropCreature, spawnCreatureAt, updatePreview:
const tierColor = level <= 2 ? '#4ade80' : level <= 4 ? '#6c9fff' : level <= 6 ? '#f97316' : '#a855f7';
```

### Архитектура _drawEnemyShape
```javascript
_drawEnemyShape(gfx, typeIdx, cfg, isBoss):
  case 0 Rat:    circle body + pointed ears + snout + dark ear interior
  case 1 Zombie: main circle + 3 overlap circles (lumpy) + decay patches
  case 2 Demon:  circle body + 2 horn triangles + angular chin cut
  case 3 Boss:   outer rings ×2 + diamond shape + inner diamond + center dot
  // Shared: inner shading + highlight + rim line
```

### npm setup (после С24)
```bash
# package.json создан, playwright установлен для скриншотов
cd ~/merge-chaos && node scripts/screenshot-game.js
```

### Следующие приоритеты (Сессия 25+)

| Фаза | Что делать | Приоритет |
|------|-----------|-----------|
| **Фаза 2c** | Merge particles через `this.add.particles(x, y, 'pdot', {...})` | HIGH — dot texture готова |
| **Фаза 5** | GLSL ColorGrade pipeline (contrast + purple tint) в main.js | MED |
| **Визуал** | GameScene арена atmosphere pass (как BootScene: glow на существах в сетке, lane depth) | MED |
| **Тест** | Сыграть 3 сессии → audit.log → 3 агента (после С24 изменений) | MED |
| **Деплой** | Netlify deploy для внешних тестеров | LOW |

---

## ✅ РЕШЕНО — Сессия 25: BootScene "VOID CHAOS" redesign + Performance анализ

### Performance анализ (причины медленной загрузки GameScene)

| Проблема | Описание | Приоритет |
|---------|---------|----------|
| **CDN Phaser** | 2.2MB с cdn.jsdelivr.net = 1115ms на localhost, 3-8x больше на мобиле | 🔴 HIGH |
| **Scanlines loop** | `for(y<H; y+=4)` = 233 отдельных strokePath() в create() | 🔴 HIGH |
| **HP bar per-frame** | `g.clear()` для всех 21 существ каждый кадр в update() | 🟠 MED |
| **Enemy HP в tween** | `updateEnemyHpBar()` в `onUpdate` = clear() каждый тик | 🟠 MED |

**Фикс scanlines (TODO следующая сессия):**
```javascript
// Один beginPath вместо 233:
bg.lineStyle(1, 0x000000, 0.08);
bg.beginPath();
for (let y = 0; y < H; y += 4) { bg.moveTo(0, y); bg.lineTo(W, y); }
bg.strokePath();
```

### BootScene редизайн — "VOID CHAOS"

**Концепция:** убраны золото + teal (шаблон 2015). Единый accent — электрический фиолетовый `#7C3AED`/`#A855F7` (цвет Titan = высший уровень). Чёрный фон с атмосферой.

| Изменение | Что сделано |
|---------|------------|
| **Фон** | Pure black + 3 atmospheric violet/crimson hazes. НЕТ scanlines, НЕТ diagonal grid |
| **Частицы** | Белые + violet, мелкие (r=0.4-1.6px), alpha 0.1-0.4 |
| **Ghost creature** | God-октагон `alpha=0.04` за title — кинематографическая глубина |
| **Title** | MERGE (violet, 14px, spaced) + CHAOS (white, 92px, violet shadow blur=44 + postFX glow) |
| **Evolution chain** | 5 ключевых (Slime/Orc/Dragon/Titan/God) с pulsing halos, label "8 LEVELS OF EVOLUTION" |
| **Button** | Violet gradient `#A855F7→#5B21B6`, white text, убрано золото |
| **Footer** | "TOWER DEFENSE × MERGE STRATEGY" |

### Актуальный цветовой словарь BootScene (после С25)
| Токен | Значение | Где |
|-------|---------|-----|
| VOID_BG | `0x000000` | Background fill |
| VIOLET | `#7C3AED` / `0x7C3AED` | Haze, border, MERGE text |
| VIOLET_BRIGHT | `#A855F7` / `0xA855F7` | Button top, postFX glow |
| VIOLET_DEEP | `0x5B21B6` | Button bottom, backgrounds |
| VIOLET_DARKEST | `0x4C1D95` | Labels, arrows |
| WHITE | `#FFFFFF` | CHAOS, button text |

### Следующие приоритеты (Сессия 26+)

| Фаза | Что делать | Приоритет |
|------|-----------|-----------|
| **Scanlines fix** | Батчинг 233 strokePath() в один — GameScene + BootScene | HIGH |
| **HP bar optim** | Skip drawCreatureHpBar если hp>=maxHp (перенести check выше clear()) | HIGH |
| **Фаза 2c** | Merge particles через `this.add.particles(x, y, 'pdot', {...})` | HIGH |
| **Фаза 5** | GLSL ColorGrade pipeline (contrast + purple tint) в main.js | MED |
| **Тест** | 3 сессии → audit.log → 3 агента | MED |
| **Деплой** | Netlify для внешних тестеров | LOW |

---

## Как начать новую сессию

```
Прочитай файл ~/merge-chaos/HANDOFF.md и начни Сессию 26.
```
