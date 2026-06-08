// GameScene — Dark Fantasy Premium visual redesign
// All visuals use Phaser Graphics API — zero OS emoji
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    // Grid: 7 rows × 3 cols
    this.grid = Array.from({ length: 7 }, () => Array(3).fill(null));
    this.enemies = [];
    this.coins = 0;
    this.score = 0;
    this.wave = 0;
    this.baseHP = 90;
    this.maxBaseHP = 90;
    this.isGameOver = false;
    this.canDrop = true;
    this.dropCooldown = 380;
    this.nextLevel = 1;
    this.uidSeq = 0;
    this.merging = new Set();
    this.projectiles = [];
    this.selectedLane = 1;

    // Tutorial
    this.tutorialActive = false;
    this.tutStep = -1;
    this.tutObjs = [];

    // Shop
    this.nextWaveDelay = 1500;
    this.isShopOpen = false;
    this._shopObjs = [];
    this._shopCountdown = null;
  }

  uid() { return ++this.uidSeq; }

  // ─── AUDIT ───────────────────────────────────────────────────────────────────
  _log(event, data) {
    if (!window.AUDIT) window.AUDIT = [];
    const entry = { t: Math.round(this.time.now / 1000), event, ...data };
    window.AUDIT.push(entry);
    fetch('/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) }).catch(() => {});
  }

  // ─── SETUP ──────────────────────────────────────────────────────────────────

  create() {
    // Reset all game state — constructor runs only once; create() runs on every restart
    GAME_CONFIG.attackMultiplier = 1;
    GAME_CONFIG.hpMultiplier = 1;

    this.grid = Array.from({ length: 7 }, () => Array(3).fill(null));
    this.enemies = [];
    this.coins = 0;
    this.score = 0;
    this.wave = 0;
    this.baseHP = 90;
    this.maxBaseHP = 90;
    this.isGameOver = false;
    this.canDrop = true;
    this.nextLevel = 1;
    this.uidSeq = 0;
    this.merging = new Set();
    this.projectiles = [];
    this.selectedLane = 1;
    this.tutorialActive = false;
    this.tutStep = -1;
    this.tutObjs = [];
    this.nextWaveDelay = 1500;
    this.isShopOpen = false;
    this._shopObjs = [];
    this._shopCountdown = null;
    this._lastBreachCol = -1;
    this._criticalWaves = 0;
    this._freezeActiveUntil = 0;
    this._freezeLabel = null;
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W; this.H = H;

    this.HUD_H      = 54;
    this.GUIDE_H    = 50;
    this.ARENA_TOP  = this.HUD_H + 6;
    this.ARENA_BOT  = H - this.GUIDE_H - 10;
    this.BASE_Y     = this.ARENA_BOT - 28;
    this.DROP_ZONE_H = 70;
    this.GRID_TOP   = this.ARENA_TOP + this.DROP_ZONE_H;
    this.GRID_BOT   = this.BASE_Y - 10;
    this.CELL_H     = (this.GRID_BOT - this.GRID_TOP) / 7;
    this.CELL_W     = W / 3;

    this.LANE_X = [this.CELL_W * 0.5, this.CELL_W * 1.5, this.CELL_W * 2.5];
    this.ROW_Y  = Array.from({ length: 7 }, (_, i) =>
      this.GRID_TOP + i * this.CELL_H + this.CELL_H * 0.5
    );

    this.drawBackground();
    this.coverageBarGfx = this.add.graphics().setDepth(2);
    this.setupBase();
    this.setupInput();

    this.aimGraphic = this.add.graphics().setDepth(5);
    this.updateAim();
    this.updatePreview();

    this.time.addEvent({ delay: 600, callback: this.runAttacks, callbackScope: this, loop: true });

    // UIScene is always launched by GameScene so restart works on every path
    this.scene.stop('UIScene');
    this.scene.launch('UIScene');

    if (localStorage.getItem('mc_tut')) {
      this._startWaves();
    } else {
      this.time.delayedCall(800, () => this._tutStart());
    }
  }

  // ─── BACKGROUND ─────────────────────────────────────────────────────────────

  drawBackground() {
    const W = this.W, H = this.H;
    const bg = this.add.graphics().setDepth(0);

    // Deeper dark gradient
    bg.fillGradientStyle(0x05050f, 0x05050f, 0x080818, 0x080818, 1);
    bg.fillRect(0, 0, W, H);

    // Scanlines — slightly more visible
    for (let y = 0; y < H; y += 4) {
      bg.lineStyle(1, 0x000000, 0.10);
      bg.beginPath(); bg.moveTo(0, y); bg.lineTo(W, y); bg.strokePath();
    }

    // Lane dividers — violet
    const lanes = this.add.graphics().setDepth(1);
    lanes.lineStyle(1, 0x7c5cfc, 0.12);
    lanes.beginPath(); lanes.moveTo(this.CELL_W, this.ARENA_TOP); lanes.lineTo(this.CELL_W, this.ARENA_BOT); lanes.strokePath();
    lanes.beginPath(); lanes.moveTo(this.CELL_W * 2, this.ARENA_TOP); lanes.lineTo(this.CELL_W * 2, this.ARENA_BOT); lanes.strokePath();

    // Grid cells — thinner
    const gridGfx = this.add.graphics().setDepth(1);
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 3; col++) {
        const x = col * this.CELL_W + 6;
        const y = this.GRID_TOP + row * this.CELL_H + 4;
        const cw = this.CELL_W - 12;
        const ch = this.CELL_H - 8;
        gridGfx.lineStyle(1, 0xffffff, 0.03);
        gridGfx.strokeRect(x, y, cw, ch);
      }
    }

    // Drop zone — gold accent border
    const drop = this.add.graphics().setDepth(1);
    drop.fillStyle(0xffffff, 0.04);
    drop.fillRect(0, this.ARENA_TOP, W, this.DROP_ZONE_H);
    drop.lineStyle(1, 0xc8a951, 0.25);
    drop.beginPath(); drop.moveTo(0, this.ARENA_TOP + this.DROP_ZONE_H);
    drop.lineTo(W, this.ARENA_TOP + this.DROP_ZONE_H); drop.strokePath();

    // Corner accents — gold
    const acc = this.add.graphics().setDepth(2);
    acc.lineStyle(2, 0xc8a951, 0.5);
    const t = this.ARENA_TOP, b = this.ARENA_BOT, l = 0, r = W, s = 14;
    acc.beginPath(); acc.moveTo(l, t+s); acc.lineTo(l, t); acc.lineTo(l+s, t); acc.strokePath();
    acc.beginPath(); acc.moveTo(r-s, t); acc.lineTo(r, t); acc.lineTo(r, t+s); acc.strokePath();
    acc.beginPath(); acc.moveTo(l, b-s); acc.lineTo(l, b); acc.lineTo(l+s, b); acc.strokePath();
    acc.beginPath(); acc.moveTo(r-s, b); acc.lineTo(r, b); acc.lineTo(r, b-s); acc.strokePath();

    // Ambient blobs — updated palette + third gold blob
    [
      { x: W*0.15, y: H*0.5,  r: 90, c: 0x5E6AD2, a: 0.07 },
      { x: W*0.85, y: H*0.55, r: 70, c: 0xe84040, a: 0.06 },
      { x: W*0.5,  y: H*0.3,  r: 60, c: 0xc8a951, a: 0.05 }
    ].forEach(b => {
      const blob = this.add.graphics().setDepth(0);
      blob.fillStyle(b.c, b.a); blob.fillCircle(0, 0, b.r);
      blob.x = b.x; blob.y = b.y;
      this.tweens.add({ targets: blob, x: b.x+20, y: b.y+15, duration: 5000,
        ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
    });

    // Lane tap hints — teal
    ['←', '↓', '→'].forEach((arrow, i) => {
      this.add.text(this.LANE_X[i], this.ARENA_TOP + this.DROP_ZONE_H / 2, arrow, {
        fontSize: '18px', color: 'rgba(0,229,204,0.2)', fontFamily: 'Arial'
      }).setOrigin(0.5).setDepth(2);
    });
  }

  // ─── BASE ────────────────────────────────────────────────────────────────────

  setupBase() {
    const W = this.W;
    this.baseGfx = this.add.graphics().setDepth(3);
    this.drawBase();

    // Static shield icon
    const shieldGfx = this.add.graphics().setDepth(4);
    this._drawShieldIcon(shieldGfx, W / 2 - 24, this.BASE_Y - 2, 7);

    this.baseHpText = this.add.text(W / 2 - 14, this.BASE_Y - 2, '100', {
      fontSize: '12px', fontFamily: 'Arial Black', color: '#e84040'
    }).setOrigin(0, 0.5).setDepth(4);
  }

  _drawShieldIcon(gfx, x, y, r) {
    gfx.fillStyle(0xe84040, 1);
    gfx.fillPoints([
      { x: x - r,     y: y - r * 0.6 },
      { x: x + r,     y: y - r * 0.6 },
      { x: x + r,     y: y + r * 0.2 },
      { x: x,         y: y + r       },
      { x: x - r,     y: y + r * 0.2 },
    ], true);
    gfx.fillStyle(0xffffff, 0.22);
    gfx.fillRect(x - r * 0.45, y - r * 0.45, r * 0.9, r * 0.55);
  }

  drawBase() {
    const W = this.W;
    this.baseGfx.clear();

    const pct = this.baseHP / this.maxBaseHP;
    const barW = W - 20;
    const segments = 10;
    const segW = (barW - (segments - 1) * 2) / segments;

    for (let i = 0; i < segments; i++) {
      const filled = i < Math.ceil(pct * segments);
      const sx = 10 + i * (segW + 2);
      if (filled) {
        const color = pct > 0.5 ? 0x00ff88 : pct > 0.25 ? 0xffaa00 : 0xe84040;
        this.baseGfx.fillStyle(color, 1);
      } else {
        this.baseGfx.fillStyle(0x1a1a2e, 1);
      }
      this.baseGfx.fillRect(sx, this.ARENA_BOT - 18, segW, 14);
    }

    this.baseGfx.lineStyle(1, 0xffffff, 0.15);
    this.baseGfx.strokeRect(10, this.ARENA_BOT - 18, barW, 14);

    this.baseGfx.lineStyle(2, 0x6c9fff, 0.4);
    this.baseGfx.beginPath();
    this.baseGfx.moveTo(0, this.ARENA_BOT - 22);
    this.baseGfx.lineTo(W, this.ARENA_BOT - 22);
    this.baseGfx.strokePath();
  }

  damageBase(amount, col = -1) {
    const capped = Math.min(amount, this.maxBaseHP * 0.3);
    if (col >= 0) this._lastBreachCol = col;

    this._log('base_hit', { dmg: Math.ceil(capped), hpBefore: Math.ceil(this.baseHP), hpAfter: Math.ceil(Math.max(0, this.baseHP - capped)), wave: this.wave });
    this.baseHP = Math.max(0, this.baseHP - capped);
    this.drawBase();
    this.baseHpText.setText(`${Math.ceil(this.baseHP)}`);

    GameAudio.playBaseHit();
    this.cameras.main.shake(180, 0.012);

    const flash = this.add.graphics().setDepth(10);
    flash.fillStyle(0xff0000, 0.15);
    flash.fillRect(0, 0, this.W, this.H);
    this.tweens.add({ targets: flash, alpha: 0, duration: 250,
      onComplete: () => flash.destroy() });

    if (this.baseHP <= 0) this.triggerGameOver();
  }

  // ─── INPUT ───────────────────────────────────────────────────────────────────

  setupInput() {
    const W = this.W;

    this.input.on('pointermove', (ptr) => {
      if (this.isGameOver) return;
      const newLane = ptr.x < W / 3 ? 0 : ptr.x < W * 2 / 3 ? 1 : 2;
      if (newLane !== this.selectedLane) {
        this.selectedLane = newLane;
        this.updateAim();
        if (this.previewObj) {
          this.tweens.add({ targets: this.previewObj,
            x: this.LANE_X[this.selectedLane], duration: 120, ease: 'Power2' });
        }
      }
    });

    this.input.on('pointerdown', (ptr) => {
      if (this.isGameOver || this.isShopOpen) return;
      if (ptr.y < this.ARENA_TOP) return;
      this.selectedLane = ptr.x < W / 3 ? 0 : ptr.x < W * 2 / 3 ? 1 : 2;
      this.dropCreature();
    });
  }

  // ─── AIM LINE ────────────────────────────────────────────────────────────────

  updateAim() {
    this.aimGraphic.clear();
    if (this.isGameOver) return;
    const x = this.LANE_X[this.selectedLane];
    const segH = 10, gap = 5;
    for (let y = this.ARENA_TOP + this.DROP_ZONE_H + 5; y < this.GRID_BOT; y += segH + gap) {
      const alpha = 0.1 + (y / this.GRID_BOT) * 0.2;
      this.aimGraphic.lineStyle(1.5, 0x00e5cc, alpha);
      this.aimGraphic.beginPath();
      this.aimGraphic.moveTo(x, y);
      this.aimGraphic.lineTo(x, Math.min(y + segH, this.GRID_BOT));
      this.aimGraphic.strokePath();
    }
    this.aimGraphic.fillStyle(0x00e5cc, 0.7);
    this.aimGraphic.fillCircle(x, this.ARENA_TOP + this.DROP_ZONE_H, 3);
  }

  // ─── PREVIEW ─────────────────────────────────────────────────────────────────

  updatePreview() {
    if (this.previewObj) this.previewObj.destroy();
    if (this._previewGfx) this._previewGfx.destroy();
    if (this._previewLbl) this._previewLbl.destroy();

    const cfg = CREATURES[this.nextLevel - 1];
    const x = this.LANE_X[this.selectedLane];
    const y = this.ARENA_TOP + this.DROP_ZONE_H / 2;

    const gfx = this.add.graphics().setDepth(6);
    this.drawCreatureGfx(gfx, cfg);
    gfx.setAlpha(0.55);

    const lvlBadge = this.add.text(cfg.size - 6, -cfg.size + 6, `${this.nextLevel}`, {
      fontSize: '10px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3, fontFamily: 'Arial Black'
    }).setOrigin(0.5).setDepth(7);

    // Container at lane position; gfx at (0,0) within it
    this.previewObj = this.add.container(x, y, [gfx, lvlBadge]).setDepth(6);
    this._previewGfx = gfx;
    this._previewLbl = lvlBadge;
  }

  // ─── DROP CREATURE ───────────────────────────────────────────────────────────

  dropCreature() {
    if (!this.canDrop) return;
    const col = this.selectedLane;

    let targetRow = -1;
    for (let row = 6; row >= 0; row--) {
      if (!this.grid[row][col]) { targetRow = row; break; }
    }
    if (targetRow === -1) return;

    this.canDrop = false;

    const level = this.nextLevel;
    const cfg = CREATURES[level - 1];
    this._log('drop', { lvl: level, col, row: targetRow, wave: this.wave });
    const targetX = this.LANE_X[col];
    const targetY = this.ROW_Y[targetRow];
    const startY = this.ARENA_TOP + 15;

    const gfx = this.add.graphics().setDepth(8);
    this.drawCreatureGfx(gfx, cfg);

    const lvlBadge = this.add.text(cfg.size - 6, -cfg.size + 6, `${level}`, {
      fontSize: '10px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3, fontFamily: 'Arial Black'
    }).setOrigin(0.5).setDepth(9);

    gfx.x = targetX; gfx.y = startY;
    lvlBadge.x = targetX + cfg.size - 6; lvlBadge.y = startY - cfg.size + 6;

    const scaledHp = Math.floor(cfg.hp * GAME_CONFIG.hpMultiplier);
    const creature = {
      id: this.uid(),
      gfx, lvlBadge,
      hpBarGfx: this.add.graphics().setDepth(10),
      level, cfg,
      x: targetX, y: startY,
      row: targetRow, col,
      hp: scaledHp, maxHp: scaledHp,
      lastAttack: 0,
      removing: false
    };

    this.grid[targetRow][col] = creature;

    this.tweens.add({
      targets: [gfx],
      y: targetY,
      duration: Math.max(180, (targetY - startY) / 1.8),
      ease: 'Power2.easeIn',
      onUpdate: () => {
        lvlBadge.x = gfx.x + cfg.size - 6;
        lvlBadge.y = gfx.y - cfg.size + 6;
      },
      onComplete: () => {
        this.tweens.add({
          targets: [gfx],
          scaleX: 1.2, scaleY: 0.8, duration: 80,
          yoyo: true, ease: 'Power1',
          onComplete: () => {
            creature.y = targetY;
            lvlBadge.x = targetX + cfg.size - 6;
            lvlBadge.y = targetY - cfg.size + 6;
            GameAudio.playDrop();
            this.landEffect(targetX, targetY, cfg.color);
            this.time.delayedCall(100, () => this.checkMergesAt(targetRow, col));
            if (this.tutorialActive && this.tutStep === 0) {
              this.events.emit('tut_drop');
            }
          }
        });
      }
    });

    this.nextLevel = Phaser.Math.Between(1, Math.min(3, Math.ceil(this.wave / 2) + 1));
    if (this.previewObj) this.previewObj.destroy();
    if (this._previewGfx) this._previewGfx.destroy();
    if (this._previewLbl) this._previewLbl.destroy();

    this.time.delayedCall(this.dropCooldown, () => {
      this.canDrop = true;
      this.updatePreview();
    });
  }

  // ─── CREATURE GRAPHICS ───────────────────────────────────────────────────────

  drawCreatureGfx(gfx, cfg) {
    gfx.clear();
    const s = cfg.size;
    const c = cfg.color;

    // 1. Outer glow
    gfx.fillStyle(c, 0.06);
    gfx.fillCircle(0, 0, s + 10);

    // 2. Shadow
    gfx.fillStyle(0x000000, 0.4);
    gfx.fillCircle(3, 4, s);

    // 3. Unique body shape per level
    switch (cfg.level) {
      case 1: { // Slime — amorphous blob with bumps
        gfx.fillStyle(c, 1);
        gfx.fillCircle(0, 4, s);
        gfx.fillCircle(-s * 0.4, -s * 0.1, s * 0.5);
        gfx.fillCircle(s * 0.35, -s * 0.15, s * 0.45);
        gfx.fillCircle(0, -s * 0.3, s * 0.4);
        break;
      }
      case 2: { // Goblin — circle with pointed ears
        gfx.fillStyle(c, 1);
        gfx.fillCircle(0, 0, s);
        gfx.fillTriangle(
          -s * 0.7, -s * 0.3,  -s * 0.4, -s * 0.9,  -s * 0.1, -s * 0.4
        );
        gfx.fillTriangle(
          s * 0.7, -s * 0.3,   s * 0.4, -s * 0.9,   s * 0.1, -s * 0.4
        );
        break;
      }
      case 3: { // Orc — wide ellipse with tusks
        gfx.fillStyle(c, 1);
        gfx.fillEllipse(0, 0, s * 2.2, s * 1.8);
        gfx.fillTriangle(
          -s * 0.25, s * 0.5,  -s * 0.1, s * 0.9,   s * 0.05, s * 0.5
        );
        gfx.fillTriangle(
          s * 0.25,  s * 0.5,   s * 0.1, s * 0.9,  -s * 0.05, s * 0.5
        );
        break;
      }
      case 4: { // Troll — rocky stone skin via dark patches
        gfx.fillStyle(c, 1);
        gfx.fillCircle(0, 0, s);
        gfx.fillStyle(0x000000, 0.30);
        gfx.fillCircle(-s * 0.5, s * 0.3,  s * 0.25);
        gfx.fillCircle(s * 0.4, -s * 0.2,  s * 0.20);
        gfx.fillCircle(0,        s * 0.5,  s * 0.22);
        break;
      }
      case 5: { // Dragon — wings behind body
        gfx.fillStyle(c, 0.7);
        gfx.fillTriangle(
          -s, -s * 0.3,  -s * 1.8, -s * 0.9,  -s * 0.5, s * 0.2
        );
        gfx.fillTriangle(
          s,  -s * 0.3,   s * 1.8, -s * 0.9,   s * 0.5, s * 0.2
        );
        gfx.fillStyle(c, 1);
        gfx.fillCircle(0, 0, s);
        break;
      }
      case 6: { // Phoenix — flame crown
        gfx.fillStyle(c, 1);
        gfx.fillCircle(0, s * 0.2, s * 0.85);
        gfx.fillTriangle(
          -s * 0.3, -s * 0.2,   0, -s * 1.1,   s * 0.3, -s * 0.2
        );
        gfx.fillTriangle(
          -s * 0.5, 0,  -s * 0.15, -s * 0.9,   s * 0.1, 0
        );
        gfx.fillTriangle(
          s * 0.5, 0,   s * 0.15, -s * 0.9,  -s * 0.1, 0
        );
        gfx.fillStyle(0xffffff, 0.8);
        gfx.fillCircle(0, -s, s * 0.15);
        break;
      }
      case 7: { // Titan — hexagon with spikes between vertices
        const pts7 = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
          pts7.push({ x: Math.cos(a) * s, y: Math.sin(a) * s });
        }
        gfx.fillStyle(c, 1);
        gfx.fillPoints(pts7, true);
        for (let i = 0; i < 6; i++) {
          const a1 = (i / 6) * Math.PI * 2 - Math.PI / 6;
          const a2 = ((i + 0.5) / 6) * Math.PI * 2 - Math.PI / 6;
          const a3 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 6;
          const outer = s * 1.35;
          gfx.fillTriangle(
            Math.cos(a1) * s,    Math.sin(a1) * s,
            Math.cos(a2) * outer, Math.sin(a2) * outer,
            Math.cos(a3) * s,    Math.sin(a3) * s
          );
        }
        break;
      }
      case 8: { // God — octagon with rays and prismatic glow
        const pts8 = [];
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          pts8.push({ x: Math.cos(a) * s, y: Math.sin(a) * s });
        }
        gfx.fillStyle(c, 1);
        gfx.fillPoints(pts8, true);
        gfx.fillStyle(0xa855f7, 0.15);
        gfx.fillCircle(0, 0, s * 0.7);
        gfx.fillStyle(0xc8a951, 0.15);
        gfx.fillCircle(0, 0, s * 0.45);
        gfx.fillStyle(c, 0.5);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          gfx.fillTriangle(
            Math.cos(a) * s * 0.3,         Math.sin(a) * s * 0.3,
            Math.cos(a + 0.15) * s * 1.5,  Math.sin(a + 0.15) * s * 1.5,
            Math.cos(a - 0.15) * s * 1.5,  Math.sin(a - 0.15) * s * 1.5
          );
        }
        break;
      }
      default: {
        gfx.fillStyle(c, 1);
        gfx.fillCircle(0, 0, s);
      }
    }

    // 4. Inner shading (bottom half)
    gfx.fillStyle(0x000000, 0.20);
    gfx.fillCircle(0, s * 0.3, s * 0.65);

    // 5. Highlight (top-left ellipse)
    gfx.fillStyle(0xffffff, 0.35);
    gfx.fillEllipse(-s * 0.28, -s * 0.28, s * 0.45, s * 0.32);

    // 6. Rim light
    gfx.lineStyle(1.5, c, 1);
    gfx.strokeCircle(0, 0, s);
  }

  landEffect(x, y, color) {
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const p = this.add.graphics().setDepth(10);
      p.fillStyle(color, 0.8); p.fillCircle(0, 0, 3);
      p.x = x; p.y = y;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * 20, y: y + Math.sin(angle) * 12,
        alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: 250, ease: 'Power2',
        onComplete: () => p.destroy()
      });
    }
  }

  // ─── MERGE ───────────────────────────────────────────────────────────────────

  checkMergesAt(row, col) {
    const creature = this.grid[row][col];
    if (!creature || creature.removing) return;

    const neighbors = [
      [row, col - 1], [row, col + 1],
      [row - 1, col], [row + 1, col]
    ];

    for (const [nr, nc] of neighbors) {
      if (nr < 0 || nr >= 7 || nc < 0 || nc >= 3) continue;
      const neighbor = this.grid[nr][nc];
      if (!neighbor || neighbor.removing) continue;
      if (neighbor.level !== creature.level) continue;
      if (creature.level >= CREATURES.length) continue;

      const key = Math.min(creature.id, neighbor.id) + '_' + Math.max(creature.id, neighbor.id);
      if (this.merging.has(key)) continue;
      this.merging.add(key);

      this.executeMerge(creature, neighbor, row, col, key);
      return;
    }
  }

  executeMerge(cA, cB, rowA, colA, mergeKey) {
    cA.removing = true; cB.removing = true;
    if (cA.hpBarGfx) { cA.hpBarGfx.destroy(); cA.hpBarGfx = null; }
    if (cB.hpBarGfx) { cB.hpBarGfx.destroy(); cB.hpBarGfx = null; }

    const mx = (cA.x + cB.x) / 2;
    const my = (cA.y + cB.y) / 2;
    const newLevel = cA.level + 1;
    const colA_saved = cA.col;
    const colB_saved = cB.col;

    this.grid[cA.row][cA.col] = null;
    this.grid[cB.row][cB.col] = null;

    this.tweens.add({
      targets: [cA.gfx, cA.lvlBadge, cB.gfx, cB.lvlBadge],
      x: mx, y: my, scaleX: 0, scaleY: 0,
      duration: 160, ease: 'Power2.easeIn',
      onComplete: () => {
        this.destroyCreatureObj(cA);
        this.destroyCreatureObj(cB);
        this.merging.delete(mergeKey);

        GameAudio.playMerge();
        this.mergeEffect(mx, my, cA.cfg.color);

        const targetRow = Math.max(cA.row, cB.row);
        const targetCol = colA_saved;
        const merged = this.spawnCreatureAt(targetRow, targetCol, newLevel, true);
        if (!merged) return;

        this._log('merge', { fromLvl: cA.level, toLvl: newLevel, col: targetCol, row: targetRow });
        this.score += cA.level * 10;
        this.coins += cA.level;
        this.events.emit('statsUpdate', this.score, this.coins, this.baseHP, this.maxBaseHP);
        if (this.tutorialActive && this.tutStep === 1) {
          this.events.emit('tut_merge');
        }

        this.applyGravity(colA_saved);
        if (colA_saved !== colB_saved) this.applyGravity(colB_saved);
      }
    });
  }

  spawnCreatureAt(row, col, level, fromMerge = false) {
    if (level > CREATURES.length) return null;
    let targetRow = row;
    if (this.grid[row][col]) {
      for (let r = row - 1; r >= 0; r--) {
        if (!this.grid[r][col]) { targetRow = r; break; }
      }
      if (this.grid[targetRow][col]) return null;
    }

    const cfg = CREATURES[level - 1];
    const x = this.LANE_X[col];
    const y = this.ROW_Y[targetRow];

    const gfx = this.add.graphics().setDepth(8);
    this.drawCreatureGfx(gfx, cfg);

    const lvlBadge = this.add.text(x + cfg.size - 6, y - cfg.size + 6, `${level}`, {
      fontSize: '10px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3, fontFamily: 'Arial Black'
    }).setOrigin(0.5).setDepth(9);

    gfx.x = x; gfx.y = y;

    const sHp = Math.floor(cfg.hp * GAME_CONFIG.hpMultiplier);
    const creature = {
      id: this.uid(), gfx, lvlBadge,
      hpBarGfx: this.add.graphics().setDepth(10),
      level, cfg, x, y,
      row: targetRow, col,
      hp: sHp, maxHp: sHp,
      lastAttack: 0, removing: false
    };

    this.grid[targetRow][col] = creature;

    if (fromMerge) {
      gfx.setScale(0); lvlBadge.setScale(0);
      this.tweens.add({
        targets: [gfx, lvlBadge],
        scaleX: 1, scaleY: 1, duration: 250,
        ease: 'Back.easeOut'
      });
      this.showFloatText(x, y - cfg.size - 10, 'EVOLVED!', '#00e5cc');
      this.time.delayedCall(300, () => this.checkMergesAt(targetRow, col));
    }

    return creature;
  }

  destroyCreatureObj(c) {
    c.gfx.destroy();
    c.lvlBadge.destroy();
    if (c.hpBarGfx) c.hpBarGfx.destroy();
  }

  applyGravity(col) {
    if (this.isGameOver) return;
    this.time.delayedCall(50, () => {
      if (this.isGameOver) return;
      const creatures = [];
      for (let r = 0; r < 7; r++) {
        const c = this.grid[r][col];
        if (c && !c.removing) creatures.push(c);
      }
      let needsGravity = false;
      for (let i = 0; i < creatures.length; i++) {
        if (creatures[i].row !== 6 - (creatures.length - 1 - i)) { needsGravity = true; break; }
      }
      if (!needsGravity) return;

      for (let r = 0; r < 7; r++) this.grid[r][col] = null;

      let moved = 0;
      creatures.forEach((c, i) => {
        const newRow = 6 - (creatures.length - 1 - i);
        this.grid[newRow][col] = c;
        if (c.row === newRow) return;
        c.row = newRow;
        moved++;
        this.tweens.add({
          targets: c.gfx,
          y: this.ROW_Y[newRow],
          duration: 120,
          ease: 'Power2.easeIn',
          onUpdate: () => {
            c.y = c.gfx.y;
            if (c.hpBarGfx) { c.hpBarGfx.x = c.x; c.hpBarGfx.y = c.y - c.cfg.size - 4; }
            if (c.lvlBadge) { c.lvlBadge.x = c.x + c.cfg.size * 0.55; c.lvlBadge.y = c.y - c.cfg.size * 0.55; }
          },
          onComplete: () => {
            c.y = this.ROW_Y[newRow];
            this.checkMergesAt(newRow, col);
          }
        });
      });
      if (moved > 0) this._log('gravity', { col, moved });
    });
  }

  mergeEffect(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const dist = Phaser.Math.Between(30, 60);
      const p = this.add.graphics().setDepth(12);
      p.fillStyle(i % 3 === 0 ? 0xffffff : color, i % 3 === 0 ? 0.9 : 1);
      p.fillCircle(0, 0, Phaser.Math.Between(2, 6));
      p.x = x; p.y = y;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: Phaser.Math.Between(280, 450),
        ease: 'Back.easeOut',
        onComplete: () => p.destroy()
      });
    }
    // Ring burst — 4px stroke
    const ring = this.add.graphics().setDepth(12);
    ring.lineStyle(4, color, 1); ring.strokeCircle(x, y, 12);
    this.tweens.add({ targets: ring, scaleX: 3.5, scaleY: 3.5, alpha: 0,
      duration: 320, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    // White flash
    const flash = this.add.graphics().setDepth(13);
    flash.fillStyle(0xffffff, 1); flash.fillCircle(x, y, 20);
    this.tweens.add({ targets: flash, alpha: 0, scaleX: 0.2, scaleY: 0.2,
      duration: 150, onComplete: () => flash.destroy() });

    this.showFloatText(x, y - 30, `+${(CREATURES.findIndex(c => c.color === color) + 1) * 10}`, '#c8a951');
  }

  // ─── ENEMIES ─────────────────────────────────────────────────────────────────

  spawnWave() {
    if (this.isGameOver) return;
    this.wave++;
    this.events.emit('waveUpdate', this.wave);
    GameAudio.playWave();

    const count = 2 + Math.floor(this.wave * 1.7);
    const isBoss = this.wave % 5 === 0;
    console.log('[WAVE]', this.wave, 'count', count, 'isBoss', isBoss, 'enemies_alive', this.enemies.filter(e => !e.removing).length);
    this._log('wave_start', { wave: this.wave, enemyCount: count, isBoss, baseHP: Math.ceil(this.baseHP), coins: this.coins, score: this.score });

    const plan = [];
    for (let i = 0; i < count; i++) {
      const typeIdx = isBoss && i === count - 1 ? 3
        : Phaser.Math.Between(0, Math.max(0, Math.min(2, this.wave - 2)));
      plan.push({ typeIdx, col: Phaser.Math.Between(0, 2) });
    }

    this._showWavePreview(plan, () => {
      plan.forEach(({ typeIdx, col }, i) => {
        this.time.delayedCall(i * 530, () => {
          if (this.isGameOver) return;
          this.spawnEnemy(typeIdx, col);
          if (i === count - 1) this.time.delayedCall(500, () => this._waitForWaveClear());
        });
      });
    });
  }

  _showWavePreview(plan, callback) {
    const colCounts = [0, 0, 0];
    const colWorst  = [0, 0, 0];
    for (const { typeIdx, col } of plan) {
      colCounts[col]++;
      if (typeIdx > colWorst[col]) colWorst[col] = typeIdx;
    }

    const objs = [];
    const D = 20;

    const banner = this.add.text(this.W / 2, this.ARENA_TOP + 6, 'INCOMING!', {
      fontSize: '11px', fontFamily: 'Arial Black',
      color: '#e84040', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5, 0).setDepth(D).setAlpha(0);
    objs.push(banner);

    for (let col = 0; col < 3; col++) {
      const cx  = this.LANE_X[col];
      const cy  = this.ARENA_TOP + 38;
      const cnt = colCounts[col];
      const cfg = ENEMY_TYPES[Math.min(colWorst[col], ENEMY_TYPES.length - 1)];
      const hex = '#' + cfg.color.toString(16).padStart(6, '0');

      const bg = this.add.graphics().setDepth(D).setAlpha(0);
      bg.fillStyle(cnt > 0 ? cfg.color : 0x334455, cnt > 0 ? 0.12 : 0.05);
      bg.fillRoundedRect(cx - 32, cy - 16, 64, 32, 6);
      bg.lineStyle(1, cnt > 0 ? cfg.color : 0x334455, cnt > 0 ? 0.45 : 0.2);
      bg.strokeRoundedRect(cx - 32, cy - 16, 64, 32, 6);
      objs.push(bg);

      const label = cnt > 0 ? `\xd7${cnt} ${cfg.name}` : '—';
      const t = this.add.text(cx, cy, label, {
        fontSize: cnt > 0 ? '10px' : '14px', fontFamily: 'Arial Black',
        color: cnt > 0 ? hex : '#334455',
        stroke: '#000000', strokeThickness: cnt > 0 ? 2 : 0
      }).setOrigin(0.5).setDepth(D + 1).setAlpha(0);
      objs.push(t);
    }

    this.tweens.add({ targets: objs, alpha: 1, duration: 200 });
    this.time.delayedCall(1200, () => {
      if (this.isGameOver) { objs.forEach(o => { try { o.destroy(); } catch(e){} }); return; }
      this.tweens.add({
        targets: objs, alpha: 0, duration: 300,
        onComplete: () => { objs.forEach(o => { try { o.destroy(); } catch(e){} }); callback(); }
      });
    });
  }

  updateCoverageBar() {
    if (!this.coverageBarGfx) return;
    this.coverageBarGfx.clear();
    for (let col = 0; col < 3; col++) {
      let strength = 0;
      for (let row = 0; row < 7; row++) {
        const c = this.grid[row][col];
        if (c && !c.removing) strength += c.cfg.damage * GAME_CONFIG.attackMultiplier;
      }
      const color = strength >= 40 ? 0x22c55e : strength >= 15 ? 0xffaa00 : 0xe84040;
      this.coverageBarGfx.fillStyle(color, strength === 0 ? 0.25 : 0.85);
      this.coverageBarGfx.fillRect(col * this.CELL_W + 2, this.HUD_H, this.CELL_W - 4, 6);
    }
  }

  _waitForWaveClear() {
    if (this.isGameOver) return;
    if (this.enemies.some(e => !e.removing)) {
      this.time.delayedCall(400, () => this._waitForWaveClear());
      return;
    }
    if (this._lastBreachCol >= 0) {
      const colName = ['LEFT', 'CENTER', 'RIGHT'][this._lastBreachCol];
      this.showFloatText(this.LANE_X[this._lastBreachCol], this.BASE_Y - 40,
        `BREACH: ${colName} undefended`, '#e84040');
      this._lastBreachCol = -1;
    }

    if (this.wave % 3 === 0) {
      this.baseHP = Math.min(this.maxBaseHP, this.baseHP + 5);
      this.drawBase();
      this.baseHpText.setText(`${Math.ceil(this.baseHP)}`);
      this.showFloatText(this.W / 2, this.BASE_Y - 20, '+5 HP', '#22c55e');
      this.events.emit('statsUpdate', this.score, this.coins, this.baseHP, this.maxBaseHP);
    }

    if (this.baseHP < this.maxBaseHP * 0.2) {
      this._criticalWaves++;
      if (this._criticalWaves >= 2) {
        this.showFloatText(this.W / 2, this.H / 2,
          `SURVIVAL STREAK: ${this._criticalWaves} WAVES ON THE EDGE!`, '#c8a951');
      }
    } else {
      this._criticalWaves = 0;
    }

    this.time.delayedCall(1000, () => { if (!this.isGameOver) this._showShop(); });
  }

  spawnEnemy(typeIdx, col) {
    const typeIdx4 = Math.min(typeIdx, ENEMY_TYPES.length - 1);
    const cfg = ENEMY_TYPES[typeIdx4];
    if (col === undefined) col = Phaser.Math.Between(0, 2);
    const x = this.LANE_X[col];
    const scaledHp = cfg.hp * (1 + this.wave * 0.18);
    const isBoss = typeIdx4 === 3;

    const gfx = this.add.graphics().setDepth(7);
    // Outer glow
    gfx.fillStyle(cfg.color, 0.12); gfx.fillCircle(0, 0, cfg.size + 8);
    // Body
    gfx.fillStyle(cfg.color, 0.9);  gfx.fillCircle(0, 0, cfg.size);
    // Inner shading
    gfx.fillStyle(0x000000, 0.25);  gfx.fillCircle(0, 2, cfg.size * 0.6);
    // Highlight
    gfx.fillStyle(0xffffff, 0.20);
    gfx.fillEllipse(-cfg.size * 0.25, -cfg.size * 0.25, cfg.size * 0.4, cfg.size * 0.28);
    // Rim
    gfx.lineStyle(2, isBoss ? 0xdc2626 : cfg.color, 1);
    gfx.strokeCircle(0, 0, cfg.size);
    // Tier rings: one ring per tier level
    for (let t = 0; t <= typeIdx4; t++) {
      gfx.lineStyle(1, cfg.color, 0.3 - t * 0.06);
      gfx.strokeCircle(0, 0, cfg.size + 8 + t * 7);
    }
    gfx.x = x; gfx.y = this.ARENA_TOP + 20;

    const nameT = this.add.text(x, this.ARENA_TOP + 10 - cfg.size, cfg.name, {
      fontSize: '10px', color: isBoss ? '#dc2626' : '#f87171', fontFamily: 'Arial'
    }).setOrigin(0.5).setDepth(8);

    const hpBar = this.add.graphics().setDepth(8);

    const enemy = {
      id: this.uid(), gfx, nameT, hpBar,
      x, col,
      hp: scaledHp, maxHp: scaledHp, cfg,
      removing: false,
      speed: cfg.speed * (1 + this.wave * 0.05),
      reward: cfg.reward
    };

    this.enemies.push(enemy);
    this.updateEnemyHpBar(enemy);

    const travelDist = this.GRID_BOT - (this.ARENA_TOP + 20);
    const duration = (travelDist / enemy.speed) * 1000;

    enemy.moveTween = this.tweens.add({
      targets: [gfx, nameT],
      y: `+=${travelDist}`,
      duration,
      ease: 'Linear',
      onUpdate: () => {
        enemy.y = gfx.y;
        this.updateEnemyHpBar(enemy);
        this.checkEnemyCreatureCollision(enemy);
      },
      onComplete: () => {
        if (!enemy.removing) {
          this.damageBase(enemy.maxHp * 0.04 + this.wave * 0.8, enemy.col);
          this.removeEnemy(enemy);
        }
      }
    });
  }

  checkEnemyCreatureCollision(enemy) {
    if (enemy.removing) return;
    if (!enemy.moveTween || enemy.moveTween.isPaused()) return;
    const col = enemy.col;
    for (let row = 6; row >= 0; row--) {
      const c = this.grid[row][col];
      if (!c || c.removing) continue;
      if (Math.abs(enemy.y - c.y) < c.cfg.size + enemy.cfg.size) {
        enemy.moveTween.pause();
        this.engageFight(enemy, c);
        break;
      }
    }
  }

  engageFight(enemy, creature) {
    if (enemy.removing || creature.removing) return;
    const dmgToCreature = (enemy.maxHp / 18) * (1 + this.wave * 0.04);
    creature.hp -= dmgToCreature;
    GameAudio.playHit();
    // Red flash on hit
    const hitFlash = this.add.graphics().setDepth(11);
    hitFlash.fillStyle(0xe84040, 0.5);
    hitFlash.fillCircle(creature.gfx.x, creature.gfx.y, creature.cfg.size * 0.85);
    this.tweens.add({ targets: hitFlash, alpha: 0, duration: 180, onComplete: () => hitFlash.destroy() });
    this.drawCreatureHpBar(creature);
    this.showFloatText(creature.x, creature.y - creature.cfg.size - 8,
      `-${Math.ceil(dmgToCreature)}`, '#f43f5e');

    if (creature.hp <= 0) {
      this.removeCreature(creature);
      this.time.delayedCall(200, () => {
        if (!enemy.removing) enemy.moveTween.resume();
      });
    } else {
      this.tweens.add({
        targets: [enemy.gfx, enemy.nameT],
        y: `-=8`, duration: 100, yoyo: true,
        onComplete: () => {
          if (!enemy.removing) enemy.moveTween.resume();
        }
      });
    }
  }

  updateEnemyHpBar(enemy) {
    enemy.hpBar.clear();
    const pct = Math.max(0, enemy.hp / enemy.maxHp);
    const w = enemy.cfg.size * 2;
    const bx = enemy.x - w / 2;
    const by = enemy.y - enemy.cfg.size - 16;
    enemy.hpBar.fillStyle(0x222222, 0.8); enemy.hpBar.fillRect(bx, by, w, 4);
    const col = pct > 0.5 ? 0x44ff44 : pct > 0.25 ? 0xffaa00 : 0xe84040;
    enemy.hpBar.fillStyle(col, 1); enemy.hpBar.fillRect(bx, by, w * pct, 4);
  }

  removeEnemy(enemy) {
    if (enemy.removing) return;
    enemy.removing = true;
    if (enemy.moveTween) enemy.moveTween.stop();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const p = this.add.graphics().setDepth(12);
      p.fillStyle(enemy.cfg.color, 1); p.fillCircle(0, 0, 4);
      p.x = enemy.x; p.y = enemy.y;
      this.tweens.add({
        targets: p,
        x: enemy.x + Math.cos(angle) * 25, y: enemy.y + Math.sin(angle) * 25,
        alpha: 0, scaleX: 0, scaleY: 0, duration: 300,
        onComplete: () => p.destroy()
      });
    }
    enemy.gfx.destroy(); enemy.nameT.destroy(); enemy.hpBar.destroy();
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) this.enemies.splice(idx, 1);
  }

  removeCreature(creature) {
    if (creature.removing) return;
    creature.removing = true;
    const { col } = creature;
    this.grid[creature.row][creature.col] = null;
    if (creature.hpBarGfx) { creature.hpBarGfx.clear(); creature.hpBarGfx.destroy(); creature.hpBarGfx = null; }
    this.tweens.add({
      targets: [creature.gfx, creature.lvlBadge],
      alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 200,
      onComplete: () => this.destroyCreatureObj(creature)
    });
    this.applyGravity(col);
  }

  // ─── ATTACKS ─────────────────────────────────────────────────────────────────

  runAttacks() {
    if (this.isGameOver) return;
    const now = this.time.now;

    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 3; col++) {
        const c = this.grid[row][col];
        if (!c || c.removing) continue;
        if (now - c.lastAttack < GAME_CONFIG.attackCooldown) continue;

        let nearest = null, nearestDist = GAME_CONFIG.attackRange;
        for (const e of [...this.enemies]) {
          if (e.removing) continue;
          if (Math.abs(e.col - col) > 1) continue;
          const d = Math.abs(e.y - c.y) + Math.abs(e.x - c.x);
          if (d < nearestDist) { nearest = e; nearestDist = d; }
        }

        if (nearest) {
          c.lastAttack = now;
          const dmg = Math.floor(c.cfg.damage * GAME_CONFIG.attackMultiplier);
          GameAudio.playShoot();
          this.fireProjectile(c.x, c.y, nearest, dmg, c.cfg.color);
          this.dealDamage(nearest, dmg);
        }
      }
    }
  }

  dealDamage(enemy, dmg) {
    if (enemy.removing) return;
    enemy.hp -= dmg;
    this.showFloatText(enemy.x, enemy.y - enemy.cfg.size - 5,
      `-${dmg}`, '#fbbf24');
    if (enemy.hp <= 0) {
      this._log('enemy_kill', { name: enemy.cfg.name, col: enemy.col, wave: this.wave, reward: enemy.reward });
      this.score += enemy.reward * 10;
      this.coins += enemy.reward;
      this.events.emit('statsUpdate', this.score, this.coins, this.baseHP, this.maxBaseHP);
      this.spawnCoins(enemy.x, enemy.y, enemy.reward);
      this.removeEnemy(enemy);
    }
  }

  fireProjectile(fromX, fromY, target, dmg, color) {
    const angle = Math.atan2(target.y - fromY, target.x - fromX);
    const trailDir = angle + Math.PI;

    const proj = this.add.graphics().setDepth(11);
    // Trail — teardrop tail
    for (let i = 1; i <= 3; i++) {
      proj.fillStyle(color, 0.5 / i);
      proj.fillCircle(
        Math.cos(trailDir) * i * 5,
        Math.sin(trailDir) * i * 5,
        4 - i
      );
    }
    // Body
    proj.fillStyle(color, 0.8);
    proj.fillCircle(0, 0, 5);
    // White head
    proj.fillStyle(0xffffff, 1);
    proj.fillCircle(0, 0, 3);

    proj.x = fromX; proj.y = fromY;

    const dist = Phaser.Math.Distance.Between(fromX, fromY, target.x, target.y);
    this.tweens.add({
      targets: proj,
      x: target.x, y: target.y,
      duration: Math.max(80, dist / 0.55),
      ease: 'Linear',
      onComplete: () => {
        const impact = this.add.graphics().setDepth(11);
        impact.fillStyle(color, 0.7); impact.fillCircle(0, 0, 10);
        impact.x = target.x; impact.y = target.y;
        this.tweens.add({ targets: impact, scaleX: 2.5, scaleY: 2.5, alpha: 0,
          duration: 160, onComplete: () => impact.destroy() });
        proj.destroy();
      }
    });
  }

  spawnCoins(x, y, count) {
    const n = Math.min(count, 5);
    for (let i = 0; i < n; i++) {
      const coin = this.add.graphics().setDepth(12);
      coin.fillStyle(0xc8a951, 1);
      coin.fillCircle(0, 0, 6);
      coin.fillStyle(0xffd700, 0.5);
      coin.fillCircle(-1.5, -1.5, 3);
      coin.lineStyle(1, 0xa07830, 0.8);
      coin.strokeCircle(0, 0, 6);
      coin.x = x + Phaser.Math.Between(-15, 15);
      coin.y = y;
      this.tweens.add({
        targets: coin,
        y: y - Phaser.Math.Between(30, 50),
        alpha: 0, duration: 600, ease: 'Power2',
        onComplete: () => coin.destroy()
      });
    }
  }

  // ─── UTILS ───────────────────────────────────────────────────────────────────

  drawCreatureHpBar(c) {
    const g = c.hpBarGfx;
    if (!g) return;
    g.clear();
    if (c.hp >= c.maxHp) return;
    const pct = Math.max(0, c.hp / c.maxHp);
    const w = c.cfg.size * 1.8;
    const bx = c.gfx.x - w / 2;
    const by = c.gfx.y - c.cfg.size - 12;
    g.fillStyle(0x000000, 0.65);
    g.fillRect(bx, by, w, 4);
    const col = pct > 0.5 ? 0x44ff88 : pct > 0.25 ? 0xffaa00 : 0xe84040;
    g.fillStyle(col, 1);
    g.fillRect(bx, by, w * pct, 4);
  }

  showFloatText(x, y, text, color) {
    const t = this.add.text(x, y, text, {
      fontSize: '13px', color,
      stroke: '#000000', strokeThickness: 3,
      fontFamily: 'Arial Black'
    }).setOrigin(0.5).setDepth(14);
    this.tweens.add({
      targets: t, y: y - 45, alpha: 0,
      duration: 700, ease: 'Power2',
      onComplete: () => t.destroy()
    });
  }

  // ─── GAME OVER ───────────────────────────────────────────────────────────────

  triggerGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.canDrop = false;

    GameAudio.playGameOver();
    // Clean up shop overlay if open
    this.isShopOpen = false;
    (this._shopObjs || []).forEach(o => { try { o.destroy(); } catch(e){} });
    this._shopObjs = [];
    if (this._freezeLabel) { try { this._freezeLabel.destroy(); } catch(e){} this._freezeLabel = null; }
    this._freezeActiveUntil = 0;

    // Destroy all remaining enemies explicitly before killAll
    this.enemies.forEach(e => {
      try { if (e.gfx) e.gfx.destroy(); } catch(_) {}
      try { if (e.nameT) e.nameT.destroy(); } catch(_) {}
      try { if (e.hpBar) e.hpBar.destroy(); } catch(_) {}
    });
    this.enemies = [];

    this.tweens.killAll();
    this.time.removeAllEvents();

    this._log('game_over', { wave: this.wave, score: this.score, coins: this.coins, baseHP: Math.ceil(this.baseHP) });
    this.events.emit('gameOver', {
      score: this.score, wave: this.wave, coins: this.coins,
      missedRepair: this.baseHP < this.maxBaseHP * 0.5
    });
  }

  // ─── TUTORIAL ────────────────────────────────────────────────────────────────

  _startWaves() {
    this.time.delayedCall(2500, () => { if (!this.isGameOver) this._doWave(); });
  }

  _doWave() {
    if (this.isGameOver) return;
    this.spawnWave();
  }

  _tutStart() {
    this.tutorialActive = true;
    this.tutStep = -1;
    this.tutObjs = [];
    this._tutShow(0);
  }

  _tutClear() {
    (this.tutObjs || []).forEach(o => { try { o.destroy(); } catch(e){} });
    this.tutObjs = [];
  }

  _tutEnd() {
    this._tutClear();
    this.tutorialActive = false;
    localStorage.setItem('mc_tut', '1');
    this._startWaves();
  }

  _tutDim(holeX, holeY, holeW, holeH) {
    const W = this.W, H = this.H;
    const g = this.add.graphics().setDepth(50);
    g.fillStyle(0x000000, 0.82);
    if (holeY > 0)              g.fillRect(0, 0, W, holeY);
    if (holeY + holeH < H)     g.fillRect(0, holeY + holeH, W, H - holeY - holeH);
    if (holeX > 0)              g.fillRect(0, holeY, holeX, holeH);
    if (holeX + holeW < W)     g.fillRect(holeX + holeW, holeY, W - holeX - holeW, holeH);
    g.lineStyle(2, 0x00e5cc, 0.65);
    g.strokeRect(holeX, holeY, holeW, holeH);
    this.tutObjs.push(g);
    return g;
  }

  _tutCard(x, y, w, h, borderColor) {
    const g = this.add.graphics().setDepth(51);
    g.fillStyle(0x06060f, 0.97);
    g.fillRoundedRect(x, y, w, h, 12);
    g.lineStyle(1.5, borderColor, 0.7);
    g.strokeRoundedRect(x, y, w, h, 12);
    this.tutObjs.push(g);
    return g;
  }

  _tutText(x, y, str, size, color) {
    const t = this.add.text(x, y, str, {
      fontSize: size, fontFamily: 'Arial Black', color,
      stroke: '#000000', strokeThickness: 3,
      align: 'center', wordWrap: { width: this.W - 60 }
    }).setOrigin(0.5, 0).setDepth(52).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 220, delay: 80 });
    this.tutObjs.push(t);
    return t;
  }

  _tutArrow(x, y, color) {
    const g = this.add.graphics().setDepth(53);
    g.fillStyle(color, 0.92);
    g.fillTriangle(x - 11, y - 9, x + 11, y - 9, x, y + 11);
    g.fillRect(x - 3.5, y - 28, 7, 20);
    this.tutObjs.push(g);
    this.tweens.add({ targets: g, y: 9, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return g;
  }

  _tutDots(step) {
    const W = this.W;
    const y = this.GRID_TOP + 14;
    const g = this.add.graphics().setDepth(54);
    for (let i = 0; i < 3; i++) {
      const x = W / 2 + (i - 1) * 18;
      g.fillStyle(i <= step ? 0x00e5cc : 0x334455, 1);
      g.fillCircle(x, y, i <= step ? 5 : 3);
    }
    this.tutObjs.push(g);
  }

  _tutSkip() {
    const btn = this.add.text(this.W - 12, 58, 'SKIP >', {
      fontSize: '10px', fontFamily: 'Arial', color: '#334455',
      padding: { x: 5, y: 3 }
    }).setOrigin(1, 0).setDepth(55).setInteractive();
    btn.on('pointerover', () => btn.setColor('#00e5cc'));
    btn.on('pointerout', () => btn.setColor('#334455'));
    btn.on('pointerdown', () => this._tutEnd());
    this.tutObjs.push(btn);
  }

  _tutShow(step) {
    this._tutClear();
    this.tutStep = step;
    const W = this.W;

    this._tutSkip();
    this._tutDots(step);

    if (step === 0) {
      this._tutDim(0, this.ARENA_TOP, W, this.DROP_ZONE_H);

      const cardY = this.ARENA_TOP + this.DROP_ZONE_H + 40;
      this._tutCard(16, cardY, W - 32, 116, 0x00e5cc);
      this._tutText(W / 2, cardY + 10, 'TAP A LANE', '21px', '#00e5cc');
      this._tutText(W / 2, cardY + 46, 'to drop your creature\ninto the arena!', '12px', '#999aaa');

      this.LANE_X.forEach(lx => this._tutArrow(lx, this.ARENA_TOP + this.DROP_ZONE_H * 0.62, 0x00e5cc));

      this.events.once('tut_drop', () => {
        if (this.tutStep !== 0) return;
        this.time.delayedCall(500, () => this._tutShow(1));
      });

    } else if (step === 1) {
      this._tutDim(0, this.ARENA_TOP, W, this.GRID_BOT - this.ARENA_TOP);

      const cardY = this.ARENA_TOP + this.DROP_ZONE_H + 8;
      this._tutCard(16, cardY, W - 32, 106, 0x5E6AD2);
      this._tutText(W / 2, cardY + 9, 'SAME LEVEL = MERGE!', '17px', '#00e5cc');
      this._tutText(W / 2, cardY + 42, 'Drop next to a same-level creature\nto fuse them into something stronger!', '11px', '#999aaa');

      const hintCol = this._tutHintLane();
      this._tutArrow(this.LANE_X[hintCol], this.ARENA_TOP + this.DROP_ZONE_H * 0.62, 0x5E6AD2);

      this.events.once('tut_merge', () => {
        if (this.tutStep !== 1) return;
        this.time.delayedCall(700, () => this._tutShow(2));
      });
      this.time.delayedCall(12000, () => {
        if (this.tutStep === 1) this._tutShow(2);
      });

    } else if (step === 2) {
      const bY = this.ARENA_BOT - 24, bH = 46;
      this._tutDim(0, bY, W, bH);

      const cardY = bY - 128;
      this._tutCard(16, cardY, W - 32, 112, 0xe84040);
      this._tutText(W / 2, cardY + 10, 'PROTECT YOUR BASE!', '18px', '#f87171');
      this._tutText(W / 2, cardY + 46, 'If enemies reach the bottom\nyou lose HP. Defend at all costs!', '11px', '#999aaa');

      this._tutArrow(W / 2, bY - 14, 0xe84040);

      this.time.delayedCall(3800, () => {
        if (this.tutStep === 2) this._tutEnd();
      });

    } else {
      this._tutEnd();
    }
  }

  _tutHintLane() {
    for (let col = 0; col < 3; col++) {
      for (let row = 6; row >= 0; row--) {
        if (this.grid[row][col]) {
          return col === 0 ? 1 : col === 2 ? 1 : 0;
        }
      }
    }
    return 1;
  }

  // ─── SHOP ────────────────────────────────────────────────────────────────────

  _showShop() {
    if (this.isGameOver) return;
    this.isShopOpen = true;
    this._shopObjs = [];
    const W = this.W, H = this.H;
    const D = 200;

    // Full-screen dim
    const dim = this.add.graphics().setDepth(D);
    dim.fillStyle(0x000000, 0.88);
    dim.fillRect(0, 0, W, H);
    this._shopObjs.push(dim);

    // Header block
    const hdrBg = this.add.graphics().setDepth(D + 1);
    hdrBg.fillStyle(0xc8a951, 0.10);
    hdrBg.fillRoundedRect(14, 62, W - 28, 86, 12);
    hdrBg.lineStyle(1.5, 0xc8a951, 0.45);
    hdrBg.strokeRoundedRect(14, 62, W - 28, 86, 12);
    this._shopObjs.push(hdrBg);

    const titleT = this.add.text(W / 2, 87, 'BETWEEN WAVES', {
      fontSize: '20px', fontFamily: 'Arial Black',
      color: '#c8a951', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(D + 2).setAlpha(0);
    this.tweens.add({ targets: titleT, alpha: 1, duration: 280 });
    this._shopObjs.push(titleT);

    const subT = this.add.text(W / 2, 110, 'Choose a reward — one purchase only', {
      fontSize: '10px', fontFamily: 'Arial', color: '#8a8fa8'
    }).setOrigin(0.5).setDepth(D + 2).setAlpha(0);
    this.tweens.add({ targets: subT, alpha: 1, duration: 280, delay: 60 });
    this._shopObjs.push(subT);

    // Coin display
    const coinGfx = this.add.graphics().setDepth(D + 2);
    coinGfx.fillStyle(0xc8a951, 1); coinGfx.fillCircle(W / 2 - 44, 131, 8);
    coinGfx.fillStyle(0xffd700, 0.5); coinGfx.fillCircle(W / 2 - 46, 129, 4);
    coinGfx.lineStyle(1, 0xa07830, 0.8); coinGfx.strokeCircle(W / 2 - 44, 131, 8);
    this._shopObjs.push(coinGfx);

    const coinT = this.add.text(W / 2 - 30, 131, `${this.coins} coins available`, {
      fontSize: '13px', fontFamily: 'Arial Black', color: '#c8a951'
    }).setOrigin(0, 0.5).setDepth(D + 2);
    this._shopObjs.push(coinT);

    // FOMO: hoarding warning (suppressed at HP<40% — BASE CRITICAL badge shown instead)
    if (this.coins > 80 && this.baseHP < this.maxBaseHP * 0.6 && this.baseHP >= this.maxBaseHP * 0.4) {
      const fomoT = this.add.text(W / 2, 148, 'Spend before next wave — items shuffle!', {
        fontSize: '10px', fontFamily: 'Arial Black', color: '#e84040',
        stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(D + 2).setAlpha(0);
      this.tweens.add({ targets: fomoT, alpha: 1, duration: 300, delay: 120 });
      this._shopObjs.push(fomoT);
    }

    // 3 random cards
    const shuffled = Phaser.Utils.Array.Shuffle([...SHOP_POOL]);
    const offers = shuffled.slice(0, 3);
    const cardW = 126, cardH = 244, cardY = 158;
    const totalW = 3 * cardW + 2 * 10;
    const startX = Math.floor((W - totalW) / 2);

    offers.forEach((item, i) => {
      const cx = startX + i * (cardW + 10);
      this._buildShopCard(item, cx, cardY, cardW, cardH, D + 1);
    });

    // Divider
    const divY = cardY + cardH + 14;
    const divLine = this.add.graphics().setDepth(D + 1);
    divLine.lineStyle(1, 0xffffff, 0.07);
    divLine.beginPath(); divLine.moveTo(30, divY); divLine.lineTo(W - 30, divY); divLine.strokePath();
    this._shopObjs.push(divLine);

    // Countdown ring + number
    const timerCX = W / 2, timerCY = divY + 46;
    this._shopTimerVal = 10;

    const timerRing = this.add.graphics().setDepth(D + 2);
    const drawRing = (val) => {
      timerRing.clear();
      timerRing.lineStyle(4, 0x1a1a2e, 1);
      timerRing.strokeCircle(timerCX, timerCY, 28);
      timerRing.lineStyle(4, val <= 3 ? 0xe84040 : 0xc8a951, 0.9);
      timerRing.beginPath();
      timerRing.arc(timerCX, timerCY, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (val / 10), false);
      timerRing.strokePath();
    };
    drawRing(10);
    this._shopObjs.push(timerRing);

    const timerNumT = this.add.text(timerCX, timerCY, '10', {
      fontSize: '20px', fontFamily: 'Arial Black', color: '#c8a951'
    }).setOrigin(0.5).setDepth(D + 3);
    this._shopObjs.push(timerNumT);

    const timerLbl = this.add.text(timerCX, timerCY + 38, 'seconds', {
      fontSize: '10px', fontFamily: 'Arial', color: '#4a4a6a'
    }).setOrigin(0.5).setDepth(D + 2);
    this._shopObjs.push(timerLbl);

    this._shopCountdown = this.time.addEvent({
      delay: 1000, repeat: 9,
      callback: () => {
        this._shopTimerVal--;
        timerNumT.setText(`${this._shopTimerVal}`);
        drawRing(this._shopTimerVal);
        if (this._shopTimerVal <= 3) timerNumT.setColor('#e84040');
        if (this._shopTimerVal <= 0) this._closeShop();
      }
    });

    // Skip button
    const skipY = timerCY + 56;
    const skipBg = this.add.graphics().setDepth(D + 1);
    const drawSkipBg = (hover) => {
      skipBg.clear();
      skipBg.fillStyle(hover ? 0x1a1a2e : 0x0d0d1a, 1);
      skipBg.fillRoundedRect(W / 2 - 58, skipY, 116, 34, 8);
      skipBg.lineStyle(1.5, hover ? 0xc8a951 : 0x2a2a3e, 0.8);
      skipBg.strokeRoundedRect(W / 2 - 58, skipY, 116, 34, 8);
    };
    drawSkipBg(false);
    this._shopObjs.push(skipBg);

    const skipBtn = this.add.text(W / 2, skipY + 17, 'SKIP  ›', {
      fontSize: '13px', fontFamily: 'Arial Black', color: '#4a4a6a'
    }).setOrigin(0.5).setDepth(D + 3).setInteractive({ useHandCursor: true });
    skipBtn.on('pointerover', () => { drawSkipBg(true); skipBtn.setColor('#c8a951'); });
    skipBtn.on('pointerout',  () => { drawSkipBg(false); skipBtn.setColor('#4a4a6a'); });
    skipBtn.on('pointerdown', () => this._closeShop());
    this._shopObjs.push(skipBtn);
  }

  _buildShopCard(item, x, y, w, h, D) {
    const canAfford = this.coins >= item.cost;
    const hpPct = this.baseHP / this.maxBaseHP;
    const isCritical = item.id === 'repair' && hpPct < 0.4 && canAfford;
    const borderCol = isCritical ? 0xe84040 : (canAfford ? 0xc8a951 : 0x2a2a3e);

    const cardBg = this.add.graphics().setDepth(D);
    cardBg.fillStyle(0x0d0d1a, 1);
    cardBg.fillRoundedRect(x, y, w, h, 10);
    cardBg.lineStyle(isCritical ? 2.5 : 1.5, borderCol, isCritical ? 1.0 : (canAfford ? 0.75 : 0.25));
    cardBg.strokeRoundedRect(x, y, w, h, 10);
    this._shopObjs.push(cardBg);

    // Pulsing red glow for critical repair
    if (isCritical) {
      const glow = this.add.graphics().setDepth(D);
      glow.lineStyle(5, 0xe84040, 0.55);
      glow.strokeRoundedRect(x - 3, y - 3, w + 6, h + 6, 13);
      this.tweens.add({ targets: glow, alpha: { from: 0.55, to: 0.1 }, duration: 480, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this._shopObjs.push(glow);
    }

    // Subtle top gradient tint
    if (canAfford) {
      const tint = this.add.graphics().setDepth(D);
      const tintCol = isCritical ? 0xe84040 : 0xc8a951;
      tint.fillGradientStyle(tintCol, tintCol, 0x0d0d1a, 0x0d0d1a, isCritical ? 0.14 : 0.08, isCritical ? 0.14 : 0.08, 0, 0);
      tint.fillRoundedRect(x, y, w, 50, { tl: 10, tr: 10, bl: 0, br: 0 });
      this._shopObjs.push(tint);
    }

    // Icon
    const iconGfx = this.add.graphics().setDepth(D + 1);
    const iconX = x + w / 2, iconY = y + 52;
    this._drawShopIcon(iconGfx, item.id, iconX, iconY, 24, canAfford, isCritical);
    this._shopObjs.push(iconGfx);

    // Name
    const nameT = this.add.text(x + w / 2, y + 88, item.name, {
      fontSize: '11px', fontFamily: 'Arial Black',
      color: canAfford ? '#e2e8f0' : '#3a3a5a',
      align: 'center', wordWrap: { width: w - 12 }
    }).setOrigin(0.5, 0).setDepth(D + 1).setAlpha(0);
    this.tweens.add({ targets: nameT, alpha: 1, duration: 260, delay: 80 });
    this._shopObjs.push(nameT);

    // Description
    const descT = this.add.text(x + w / 2, y + 114, item.desc, {
      fontSize: '10px', fontFamily: 'Arial',
      color: canAfford ? '#8a8fa8' : '#2a2a4a',
      align: 'center', wordWrap: { width: w - 12 }
    }).setOrigin(0.5, 0).setDepth(D + 1).setAlpha(0);
    this.tweens.add({ targets: descT, alpha: 1, duration: 260, delay: 120 });
    this._shopObjs.push(descT);

    // Divider in card
    const sep = this.add.graphics().setDepth(D + 1);
    sep.lineStyle(1, canAfford ? 0xc8a951 : 0x1a1a2e, canAfford ? 0.2 : 0.3);
    sep.beginPath(); sep.moveTo(x + 12, y + 164); sep.lineTo(x + w - 12, y + 164); sep.strokePath();
    this._shopObjs.push(sep);

    // Cost row
    const coinIcon = this.add.graphics().setDepth(D + 1);
    coinIcon.fillStyle(canAfford ? 0xc8a951 : 0x2a2a4a, 1);
    coinIcon.fillCircle(x + w / 2 - 20, y + 178, 7);
    if (canAfford) {
      coinIcon.fillStyle(0xffd700, 0.5);
      coinIcon.fillCircle(x + w / 2 - 22, y + 176, 3.5);
    }
    this._shopObjs.push(coinIcon);

    const costT = this.add.text(x + w / 2 - 10, y + 178, `${item.cost}`, {
      fontSize: '16px', fontFamily: 'Arial Black',
      color: canAfford ? '#c8a951' : '#2a2a4a'
    }).setOrigin(0, 0.5).setDepth(D + 1);
    this._shopObjs.push(costT);

    // BUY button
    const btnY = y + h - 44;
    const btnBg = this.add.graphics().setDepth(D + 1);
    const drawBtnBg = (hover) => {
      btnBg.clear();
      if (canAfford) {
        btnBg.fillStyle(hover ? 0xffd700 : 0xc8a951, 1);
        btnBg.fillRoundedRect(x + 8, btnY, w - 16, 34, 8);
      } else {
        btnBg.fillStyle(0x0a0a18, 1);
        btnBg.fillRoundedRect(x + 8, btnY, w - 16, 34, 8);
        btnBg.lineStyle(1, 0x1a1a2e, 0.6);
        btnBg.strokeRoundedRect(x + 8, btnY, w - 16, 34, 8);
      }
    };
    drawBtnBg(false);
    this._shopObjs.push(btnBg);

    const btnT = this.add.text(x + w / 2, btnY + 17,
      canAfford ? 'BUY' : 'TOO COSTLY', {
        fontSize: canAfford ? '13px' : '9px',
        fontFamily: 'Arial Black',
        color: canAfford ? '#000000' : '#2a2a4a'
      }
    ).setOrigin(0.5).setDepth(D + 2);
    this._shopObjs.push(btnT);

    if (canAfford) {
      const hit = this.add.zone(x + w / 2, btnY + 17, w - 16, 34)
        .setInteractive({ useHandCursor: true }).setDepth(D + 3);
      hit.on('pointerover', () => drawBtnBg(true));
      hit.on('pointerout',  () => drawBtnBg(false));
      hit.on('pointerdown', () => this._buyItem(item));
      this._shopObjs.push(hit);
    }

    if (item.id === 'freeze' && (this.wave + 1) % 5 === 0) {
      const badge = this.add.text(x + w / 2, y + 8, 'BOSS COUNTER!', {
        fontSize: '8px', fontFamily: 'Arial Black',
        color: '#ffffff', backgroundColor: '#e84040',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5, 0).setDepth(D + 3);
      this.tweens.add({
        targets: badge, alpha: { from: 1, to: 0.6 },
        duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
      this._shopObjs.push(badge);
    }

    // BASE CRITICAL badge replaces RECOMMENDED for repair at low HP
    if (isCritical) {
      const critBadge = this.add.text(x + w / 2, y + 8, 'BASE CRITICAL!', {
        fontSize: '8px', fontFamily: 'Arial Black',
        color: '#ffffff', backgroundColor: '#e84040',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5, 0).setDepth(D + 3).setAlpha(0);
      this.tweens.add({ targets: critBadge, alpha: 1, duration: 200, delay: 60, ease: 'Linear' });
      this.tweens.add({
        targets: critBadge, alpha: { from: 1, to: 0.55 },
        duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 300
      });
      this._shopObjs.push(critBadge);
    }

    // RECOMMENDED badge (for repair if HP<50%, attack if HP>70%) — skipped when isCritical
    let isRecommended = false;
    if (item.id === 'repair' && hpPct < 0.5) isRecommended = true;
    else if (item.id === 'attack' && hpPct >= 0.7) isRecommended = true;

    if (isRecommended && canAfford && !isCritical) {
      const recBadge = this.add.text(x + w / 2, y + 6, '★ BEST', {
        fontSize: '8px', fontFamily: 'Arial Black',
        color: '#000000', backgroundColor: '#22c55e',
        padding: { x: 5, y: 2 }
      }).setOrigin(0.5, 0).setDepth(D + 3);
      this.tweens.add({
        targets: recBadge, alpha: { from: 1, to: 0.7 },
        duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
      this._shopObjs.push(recBadge);
    }
  }

  _drawShopIcon(gfx, id, x, y, r, active, critical = false) {
    const base = active ? 1 : 0.3;
    switch (id) {
      case 'attack': { // Lightning bolt
        gfx.fillStyle(0xc8a951, base);
        gfx.fillCircle(x, y, r + 4);
        gfx.fillStyle(0x000000, 0.25);
        gfx.fillCircle(x, y, r + 4);
        gfx.fillStyle(active ? 0xffd700 : 0x3a3a2a, 1);
        gfx.fillTriangle(x - 6, y - r + 4, x + 2, y - 2, x - 2, y - 2);
        gfx.fillTriangle(x - 2, y - 2,     x + 6, y + r - 4, x + 2, y - 2);
        gfx.fillRect(x - 1.5, y - r + 4, 3, r * 1.8);
        break;
      }
      case 'repair': { // Cross in shield
        const bgColor = critical ? 0x3a0808 : (active ? 0x1a4a2a : 0x1a1a1a);
        const fgColor = critical ? 0xe84040 : (active ? 0x22c55e : 0x2a3a2a);
        gfx.fillStyle(bgColor, 1);
        gfx.fillCircle(x, y, r + 4);
        gfx.fillStyle(fgColor, 1);
        gfx.fillRect(x - 3, y - r + 2, 6, r * 1.8);
        gfx.fillRect(x - r + 2, y - 3, r * 1.8, 6);
        break;
      }
      case 'freeze': { // Snowflake
        gfx.fillStyle(active ? 0x0a1a2a : 0x0a0a0a, 1);
        gfx.fillCircle(x, y, r + 4);
        gfx.lineStyle(2.5, active ? 0x00e5cc : 0x1a2a2a, 1);
        for (let a = 0; a < 3; a++) {
          const ang = (a / 3) * Math.PI;
          gfx.beginPath();
          gfx.moveTo(x + Math.cos(ang) * (r - 2), y + Math.sin(ang) * (r - 2));
          gfx.lineTo(x - Math.cos(ang) * (r - 2), y - Math.sin(ang) * (r - 2));
          gfx.strokePath();
        }
        gfx.fillStyle(active ? 0x00e5cc : 0x1a2a2a, 1);
        gfx.fillCircle(x, y, 4);
        break;
      }
      case 'armor': { // Shield shape
        gfx.fillStyle(active ? 0x1a1a4a : 0x0a0a1a, 1);
        gfx.fillCircle(x, y, r + 4);
        gfx.fillStyle(active ? 0x6c9fff : 0x1a1a3a, 1);
        gfx.fillPoints([
          { x: x - r + 4, y: y - r + 4 },
          { x: x + r - 4, y: y - r + 4 },
          { x: x + r - 4, y: y + 2     },
          { x: x,         y: y + r - 2 },
          { x: x - r + 4, y: y + 2     },
        ], true);
        gfx.fillStyle(active ? 0xaaccff : 0x1a2a4a, 0.4);
        gfx.fillRect(x - 6, y - r + 8, 12, r * 0.6);
        break;
      }
    }
  }

  _buyItem(item) {
    if (this.coins < item.cost || this.isGameOver) return;
    this._log('shop_buy', { item: item.id, cost: item.cost, coinsLeft: this.coins - item.cost, wave: this.wave, baseHP: Math.ceil(this.baseHP) });
    this.coins -= item.cost;
    GameAudio.playBuy();
    this.events.emit('statsUpdate', this.score, this.coins, this.baseHP, this.maxBaseHP);

    switch (item.id) {
      case 'attack':
        GAME_CONFIG.attackMultiplier = Math.min(3.0, +(GAME_CONFIG.attackMultiplier * 1.25).toFixed(3));
        this.showFloatText(this.W / 2, this.H / 2 - 30, '+25% DAMAGE!', '#ffd700');
        break;
      case 'repair':
        this.baseHP = Math.min(this.maxBaseHP, this.baseHP + 25);
        this.drawBase();
        this.baseHpText.setText(`${Math.ceil(this.baseHP)}`);
        this.showFloatText(this.W / 2, this.H / 2 - 30, '+25 BASE HP!', '#22c55e');
        break;
      case 'freeze':
        this.nextWaveDelay = 25000;
        this.showFloatText(this.W / 2, this.H / 2 - 30, 'SLOW WAVE!', '#00e5cc');
        break;
      case 'armor':
        GAME_CONFIG.hpMultiplier = +(GAME_CONFIG.hpMultiplier * 1.3).toFixed(3);
        this.showFloatText(this.W / 2, this.H / 2 - 30, '+30% CREATURE HP!', '#6c9fff');
        break;
    }

    this._closeShop();
  }

  _closeShop() {
    if (!this.isShopOpen) return;
    this.isShopOpen = false;

    if (this._shopCountdown) { this._shopCountdown.remove(); this._shopCountdown = null; }

    const objs = this._shopObjs.splice(0);
    objs.forEach(o => {
      this.tweens.add({
        targets: o, alpha: 0, duration: 280,
        onComplete: () => { try { o.destroy(); } catch(e){} }
      });
    });

    const delay = this.nextWaveDelay;
    this.nextWaveDelay = 1500;
    if (delay > 2000) {
      this._freezeActiveUntil = this.time.now + delay;
      if (this._freezeLabel) { try { this._freezeLabel.destroy(); } catch(e){} }
      this._freezeLabel = this.add.text(this.W / 2, 58, `SLOW: ${Math.ceil(delay / 1000)}s`, {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#00e5cc',
        stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5, 0).setDepth(5);
    }
    this.time.delayedCall(delay, () => { if (!this.isGameOver) this._doWave(); });
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────────

  update() {
    this.updateCoverageBar();
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 3; col++) {
        const c = this.grid[row][col];
        if (!c || c.removing) continue;
        c.lvlBadge.x = c.gfx.x + c.cfg.size - 6;
        c.lvlBadge.y = c.gfx.y - c.cfg.size + 6;
        this.drawCreatureHpBar(c);
      }
    }

    if (this._freezeActiveUntil > 0) {
      const rem = Math.ceil((this._freezeActiveUntil - this.time.now) / 1000);
      if (rem > 0 && this._freezeLabel) {
        this._freezeLabel.setText(`SLOW: ${rem}s`);
      } else {
        if (this._freezeLabel) { try { this._freezeLabel.destroy(); } catch(e){} this._freezeLabel = null; }
        this._freezeActiveUntil = 0;
      }
    }
  }
}
