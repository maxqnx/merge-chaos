// UIScene — Cinema Mobile Dark v2 HUD + Death Screen
// All icons drawn via Phaser Graphics API — zero OS emoji
class UIScene extends Phaser.Scene {
  constructor() { super({ key: 'UIScene' }); }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W; this.H = H;

    this.drawTopHUD(W);
    this.drawBottomGuide(W, H);
    this.listenToGame();
  }

  // ─── ICON HELPERS ────────────────────────────────────────────────────────────

  drawShieldIcon(gfx, x, y, r) {
    gfx.fillStyle(0xe84040, 1);
    gfx.fillPoints([
      { x: x - r,   y: y - r * 0.6 },
      { x: x + r,   y: y - r * 0.6 },
      { x: x + r,   y: y + r * 0.2 },
      { x: x,       y: y + r       },
      { x: x - r,   y: y + r * 0.2 },
    ], true);
    gfx.fillStyle(0xffffff, 0.22);
    gfx.fillRect(x - r * 0.45, y - r * 0.45, r * 0.9, r * 0.55);
  }

  drawStarIcon(gfx, x, y, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.42;
      pts.push({ x: x + Math.cos(a) * rad, y: y + Math.sin(a) * rad });
    }
    gfx.fillStyle(0xfbbf24, 1);
    gfx.fillPoints(pts, true);
  }

  drawCoinIcon(gfx, x, y, r) {
    gfx.fillStyle(0xc8a951, 1);
    gfx.fillCircle(x, y, r);
    gfx.fillStyle(0xffd700, 0.5);
    gfx.fillCircle(x - r * 0.2, y - r * 0.2, r * 0.45);
    gfx.lineStyle(1.5, 0xa07830, 0.8);
    gfx.strokeCircle(x, y, r);
  }

  // ─── TOP HUD ─────────────────────────────────────────────────────────────────

  drawTopHUD(W) {
    const bar = this.add.graphics();
    bar.fillStyle(0x030310, 0.94);
    bar.fillRect(0, 0, W, 54);
    bar.lineStyle(1, 0xc8a951, 0.22);
    bar.beginPath(); bar.moveTo(0, 53); bar.lineTo(W, 53); bar.strokePath();
    bar.lineStyle(1, 0x000000, 1);
    bar.beginPath(); bar.moveTo(0, 54); bar.lineTo(W, 54); bar.strokePath();

    const sep = this.add.graphics();
    sep.lineStyle(1, 0xffffff, 0.08);
    sep.beginPath(); sep.moveTo(W * 0.36, 8); sep.lineTo(W * 0.36, 46); sep.strokePath();
    sep.beginPath(); sep.moveTo(W * 0.68, 8); sep.lineTo(W * 0.68, 46); sep.strokePath();

    const shieldGfx = this.add.graphics();
    this.drawShieldIcon(shieldGfx, 16, 16, 7);

    this.baseHpText = this.add.text(29, 8, '100%', {
      fontSize: '14px', fontFamily: 'Arial Black', color: '#e84040'
    }).setOrigin(0, 0);

    this.baseHpBar = this.add.graphics();
    this._drawMiniHpBar(1.0);

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
    const startX = 12, y = 33;
    for (let i = 0; i < segs; i++) {
      const filled = i < Math.ceil(pct * segs);
      const color = pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xffaa00 : 0xe84040;
      this.baseHpBar.fillStyle(filled ? color : 0x1a1a2e, 1);
      this.baseHpBar.fillRoundedRect(startX + i * (segW + gap), y, segW, 7, 2);
    }
  }

  // ─── BOTTOM GUIDE ────────────────────────────────────────────────────────────
  // Creature evolution chain — silhouettes, names, drawn arrows

  _drawCreatureShapeSmall(gfx, cfg, cx, cy, r) {
    const c = cfg.color;
    const s = r;

    gfx.fillStyle(c, 0.14);
    gfx.fillCircle(cx, cy, s + 5);

    switch (cfg.level) {
      case 1: {
        gfx.fillStyle(c, 1);
        gfx.fillCircle(cx, cy + 2, s);
        gfx.fillCircle(cx - s*0.38, cy, s*0.52);
        gfx.fillCircle(cx + s*0.35, cy - 1, s*0.46);
        break;
      }
      case 2: {
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
      case 3: {
        gfx.fillStyle(c, 1);
        gfx.fillEllipse(cx, cy, s*2.1, s*1.7);
        gfx.fillTriangle(cx - s*0.22, cy + s*0.45, cx - s*0.08, cy + s*0.85, cx + s*0.06, cy + s*0.45);
        gfx.fillTriangle(cx + s*0.22, cy + s*0.45, cx + s*0.08, cy + s*0.85, cx - s*0.06, cy + s*0.45);
        break;
      }
      case 4: {
        gfx.fillStyle(c, 1);
        gfx.fillCircle(cx, cy, s);
        gfx.fillStyle(0x000000, 0.28);
        gfx.fillCircle(cx - s*0.42, cy + s*0.28, s*0.24);
        gfx.fillCircle(cx + s*0.38, cy - s*0.18, s*0.20);
        gfx.fillCircle(cx + s*0.10, cy + s*0.45, s*0.22);
        break;
      }
      case 5: {
        gfx.fillStyle(c, 0.65);
        gfx.fillTriangle(cx - s*1.7, cy - s*0.8,  cx - s*0.8, cy - s*0.3,  cx - s*0.4, cy + s*0.2);
        gfx.fillTriangle(cx + s*1.7, cy - s*0.8,  cx + s*0.8, cy - s*0.3,  cx + s*0.4, cy + s*0.2);
        gfx.fillStyle(c, 1);
        gfx.fillCircle(cx, cy, s);
        break;
      }
      case 6: {
        gfx.fillStyle(c, 1);
        gfx.fillCircle(cx, cy + s*0.18, s*0.82);
        gfx.fillTriangle(cx - s*0.26, cy - s*0.16, cx,         cy - s*1.05, cx + s*0.26, cy - s*0.16);
        gfx.fillTriangle(cx - s*0.45, cy + s*0.04, cx - s*0.14, cy - s*0.84, cx + s*0.08, cy + s*0.04);
        gfx.fillTriangle(cx + s*0.45, cy + s*0.04, cx + s*0.14, cy - s*0.84, cx - s*0.08, cy + s*0.04);
        gfx.fillStyle(0xffffff, 0.8);
        gfx.fillCircle(cx, cy - s, s*0.14);
        break;
      }
      case 7: {
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
      case 8: {
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

    gfx.fillStyle(0xffffff, 0.20);
    gfx.fillCircle(cx - s*0.25, cy - s*0.28, s*0.32);
  }

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
      const r = 6 + Math.round((c.size / maxSize) * 7);

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

  // ─── EVENTS ──────────────────────────────────────────────────────────────────

  listenToGame() {
    const game = this.scene.get('GameScene');

    game.events.on('statsUpdate', (score, coins, baseHP, maxHP) => {
      this.scoreText.setText(`${score.toLocaleString()}`);
      this.coinsText.setText(`${coins}`);
      const pct = Math.ceil((baseHP / maxHP) * 100);
      this.baseHpText.setText(`${pct}%`);
      this._drawMiniHpBar(baseHP / maxHP);
      if (pct <= 30) this.baseHpText.setColor('#ff2200');
      this.tweens.add({
        targets: this.scoreText, scaleX: 1.15, scaleY: 1.15, duration: 80,
        yoyo: true, ease: 'Back.easeOut'
      });
    });

    game.events.on('waveUpdate', (wave) => {
      this.waveText.setText(`WAVE ${wave}`);
      this.showWaveBanner(wave);
    });

    game.events.on('gameOver', (data) => {
      this.showDeathScreen(data);
    });
  }

  showWaveBanner(wave) {
    const W = this.W, H = this.H;
    const isBoss = wave % 5 === 0;

    if (isBoss) {
      const flash = this.add.graphics();
      flash.fillStyle(0xe84040, 0.09); flash.fillRect(0, 0, W, H);
      this.tweens.add({ targets: flash, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
    }

    const banner = this.add.text(W / 2, -60,
      isBoss ? `BOSS WAVE ${wave}` : `WAVE ${wave}`, {
        fontSize: isBoss ? '32px' : '24px', fontFamily: 'Arial Black',
        color: isBoss ? '#dc2626' : '#00e5cc',
        stroke: isBoss ? '#440000' : '#005544', strokeThickness: 4,
        shadow: { offsetX: 0, offsetY: 0, color: isBoss ? '#dc2626' : '#00e5cc', blur: 20, fill: true }
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: banner, y: H * 0.42, duration: 450, ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(1000, () => {
          this.tweens.add({
            targets: banner, y: H * 0.38, alpha: 0, duration: 300,
            ease: 'Cubic.easeIn', onComplete: () => banner.destroy()
          });
        });
      }
    });
  }

  // ─── DEATH SCREEN ────────────────────────────────────────────────────────────

  showDeathScreen(data) {
    const W = this.W, H = this.H;

    const overlay = this.add.graphics().setDepth(30);
    overlay.fillStyle(0x000000, 0);
    overlay.fillRect(0, 0, W, H);
    this.tweens.add({ targets: overlay, alpha: 0.82, duration: 500 });

    const panelW = W - 40, panelH = H * 0.6;
    const panelX = 20, panelY = H * 0.2;

    this.time.delayedCall(400, () => {
      // Panel — surface + hairline
      const panel = this.add.graphics().setDepth(31);
      panel.fillStyle(0x05050f, 0.96);
      panel.fillRoundedRect(panelX, panelY, panelW, panelH, 16);
      panel.lineStyle(1.5, 0xffffff, 0.08);
      panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 16);
      // Teal top accent line
      panel.lineStyle(2, 0x00e5cc, 0.28);
      panel.beginPath();
      panel.moveTo(panelX + 16, panelY);
      panel.lineTo(panelX + panelW - 16, panelY);
      panel.strokePath();

      this.add.text(W / 2, panelY + 30, 'GAME OVER', {
        fontSize: '28px', fontFamily: 'Arial Black', color: '#e84040',
        stroke: '#000', strokeThickness: 5
      }).setOrigin(0.5).setDepth(32);

      const prevRecord = Math.max(0, data.wave - Phaser.Math.Between(0, 2));
      const isRecord = data.wave > prevRecord;

      this.add.text(W / 2, panelY + 70,
        isRecord ? `NEW RECORD: WAVE ${data.wave}!` : `Reached Wave ${data.wave}`,
        {
          fontSize: isRecord ? '16px' : '14px', fontFamily: 'Arial Black',
          color: isRecord ? '#c8a951' : '#8A8F98'
        }).setOrigin(0.5).setDepth(32);

      this.add.text(W / 2, panelY + 100, `Score: ${data.score.toLocaleString()}`, {
        fontSize: '18px', fontFamily: 'Arial', color: '#c8a951'
      }).setOrigin(0.5).setDepth(32);

      // Rewarded Ad panel
      this.time.delayedCall(500, () => {
        const adPanel = this.add.graphics().setDepth(32);
        adPanel.fillStyle(0x0a0a1e, 1);
        adPanel.fillRoundedRect(panelX + 10, panelY + 125, panelW - 20, 65, 10);
        adPanel.lineStyle(1.5, 0xc8a951, 0.5);
        adPanel.strokeRoundedRect(panelX + 10, panelY + 125, panelW - 20, 65, 10);

        this.add.text(W / 2, panelY + 145, 'Watch ad to continue', {
          fontSize: '13px', fontFamily: 'Arial Black', color: '#c8a951'
        }).setOrigin(0.5).setDepth(33);

        this.add.text(W / 2, panelY + 165, 'Resume with 50% base HP', {
          fontSize: '11px', fontFamily: 'Arial', color: '#8A8F98'
        }).setOrigin(0.5).setDepth(33);

        const adBtn = this.add.text(W / 2, panelY + 183, 'WATCH', {
          fontSize: '11px', fontFamily: 'Arial Black', color: '#c8a951',
          backgroundColor: '#2a1a00', padding: { x: 12, y: 4 }
        }).setOrigin(0.5).setDepth(33).setInteractive();

        adBtn.on('pointerover', () => adBtn.setColor('#ffffff'));
        adBtn.on('pointerout', () => adBtn.setColor('#c8a951'));
        adBtn.on('pointerdown', () => {
          this.scene.stop('GameScene');
          this.scene.start('GameScene');
        });

        this.tweens.add({
          targets: [adPanel, adBtn],
          scaleX: { from: 0.8, to: 1 }, scaleY: { from: 0.8, to: 1 },
          alpha: { from: 0, to: 1 }, duration: 300, ease: 'Back.easeOut'
        });
      });

      // Separator
      const sep = this.add.graphics().setDepth(31);
      sep.lineStyle(1, 0xffffff, 0.07);
      sep.beginPath(); sep.moveTo(panelX + 20, panelY + 205);
      sep.lineTo(panelX + panelW - 20, panelY + 205); sep.strokePath();

      // TIP — above PLAY AGAIN, personalised
      if (data.missedRepair) {
        const tipT = this.add.text(W / 2, panelY + 215,
          `You had ${data.coins} coins — Repair costs 20!`, {
          fontSize: '11px', fontFamily: 'Arial Black', color: '#22c55e',
          stroke: '#000', strokeThickness: 2, align: 'center',
          wordWrap: { width: panelW - 40 }
        }).setOrigin(0.5).setDepth(32).setAlpha(0);
        this.tweens.add({ targets: tipT, alpha: 1, duration: 300, delay: 600 });
      }

      // Play again button
      const playBtn = this.add.text(W / 2, panelY + 265, 'PLAY AGAIN', {
        fontSize: '18px', fontFamily: 'Arial Black', color: '#ffffff',
        backgroundColor: '#7a3d00', padding: { x: 24, y: 12 }
      }).setOrigin(0.5).setDepth(32).setInteractive();

      const playBtnGfx = this.add.graphics().setDepth(32);
      playBtnGfx.lineStyle(2, 0xc8a951, 0.8);
      const pbW = 180, pbH = 44;
      playBtnGfx.strokeRoundedRect(W / 2 - pbW / 2 - 2, panelY + 253, pbW + 4, pbH, 6);

      playBtn.on('pointerover', () => {
        this.tweens.add({ targets: playBtn, scaleX: 1.05, scaleY: 1.05, duration: 100 });
      });
      playBtn.on('pointerout', () => {
        this.tweens.add({ targets: playBtn, scaleX: 1, scaleY: 1, duration: 100 });
      });
      playBtn.on('pointerdown', () => {
        this.cameras.main.flash(200, 255, 200, 0);
        this.time.delayedCall(200, () => {
          this.scene.stop('UIScene');
          this.scene.stop('GameScene');
          this.scene.start('BootScene');
        });
      });

      // Zeigarnik — next unlock teaser
      const progressMsg = `Next: ${CREATURES[Math.min(data.wave, CREATURES.length - 1)].name} unlocks at wave ${data.wave + 1}`;
      this.add.text(W / 2, panelY + panelH - 25, progressMsg, {
        fontSize: '10px', fontFamily: 'Arial', color: '#2a3452'
      }).setOrigin(0.5).setDepth(32);

      this.tweens.add({
        targets: panel, scaleX: { from: 0.85, to: 1 }, scaleY: { from: 0.85, to: 1 },
        alpha: { from: 0, to: 1 }, duration: 400, ease: 'Back.easeOut'
      });
    });
  }
}
