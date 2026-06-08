// BootScene — Visual Redesign v3 (hex title badge, creature silhouettes, full-width CTA, diagonal grid)
// Principles: LinearGradient bg, diagonal grid, hexagonal badge, real creature silhouettes, Back.easeOut spring
class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this._drawBackground(W, H);
    this._drawTitleBadge(W, H);
    this._drawEvolutionChain(W, H);
    this._drawPlayButton(W, H);
    this._drawFooter(W, H);
    this.cameras.main.postFX.addVignette(0.5, 0.5, 0.65, 0.6);
  }

  _drawBackground(W, H) {
    // Cinema dark gradient: #0a0a0f → #020203
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a0f, 0x0a0a0f, 0x020203, 0x020203, 1);
    bg.fillRect(0, 0, W, H);

    // Scanlines — subtle
    const lines = this.add.graphics();
    for (let y = 0; y < H; y += 4) {
      lines.lineStyle(1, 0x000000, 0.07);
      lines.beginPath(); lines.moveTo(0, y); lines.lineTo(W, y); lines.strokePath();
    }

    // Diagonal grid
    const diag = this.add.graphics();
    diag.lineStyle(1, 0xffffff, 0.025);
    const sp = 32;
    for (let i = -H; i < W + H; i += sp) {
      diag.beginPath(); diag.moveTo(i, 0); diag.lineTo(i + H, H); diag.strokePath();
    }
    for (let i = -H; i < W + H; i += sp) {
      diag.beginPath(); diag.moveTo(i, 0); diag.lineTo(i - H, H); diag.strokePath();
    }

    // Floating particles — visible, bright (3-4px, high alpha)
    const pColors = [0xc8a951, 0x00e5cc, 0x7c5cfc];
    for (let i = 0; i < 25; i++) {
      const px = Math.random() * W;
      const py = Math.random() * H;
      const pr = Math.random() * 2.5 + 1.5;
      const pc = pColors[Math.floor(Math.random() * pColors.length)];
      const pa = Math.random() * 0.4 + 0.45;
      const gfx = this.add.graphics();
      gfx.fillStyle(pc, pa);
      gfx.fillCircle(0, 0, pr);
      gfx.x = px; gfx.y = py;
      this.tweens.add({
        targets: gfx,
        y: py - Phaser.Math.Between(40, 120),
        alpha: { from: pa, to: 0 },
        duration: Phaser.Math.Between(3000, 7000),
        delay: Phaser.Math.Between(0, 4000),
        repeat: -1,
        onRepeat: () => { gfx.x = Math.random() * W; gfx.y = H + 10; gfx.setAlpha(Math.random() * 0.3 + 0.15); }
      });
    }

    // Gold corner accents
    const corners = this.add.graphics();
    corners.lineStyle(1.5, 0xc8a951, 0.32);
    const s = 18;
    [[8, 8, s, 0, 0, s],
     [W-8, 8, -s, 0, 0, s],
     [8, H-8, s, 0, 0, -s],
     [W-8, H-8, -s, 0, 0, -s]].forEach(([x, y, dx1, dy1, dx2, dy2]) => {
      corners.beginPath();
      corners.moveTo(x + dx1, y + dy1);
      corners.lineTo(x, y);
      corners.lineTo(x + dx2, y + dy2);
      corners.strokePath();
    });
  }

  _drawTitleBadge(W, H) {
    const cx = W / 2, cy = Math.round(H * 0.25);
    const bw = W * 0.88, bh = 118, cut = 22;

    const pts = [
      { x: cx - bw/2 + cut, y: cy - bh/2 },
      { x: cx + bw/2 - cut, y: cy - bh/2 },
      { x: cx + bw/2,       y: cy         },
      { x: cx + bw/2 - cut, y: cy + bh/2 },
      { x: cx - bw/2 + cut, y: cy + bh/2 },
      { x: cx - bw/2,       y: cy         },
    ];

    const badge = this.add.graphics().setAlpha(0);
    badge.fillGradientStyle(0x0d0d22, 0x0d0d22, 0x020209, 0x020209, 0.98);
    badge.fillPoints(pts, true);
    badge.lineStyle(1.5, 0xc8a951, 0.55);
    badge.strokePoints(pts, true);
    const inner = pts.map(p => ({ x: cx + (p.x - cx) * 0.93, y: cy + (p.y - cy) * 0.90 }));
    badge.lineStyle(1, 0xc8a951, 0.16);
    badge.strokePoints(inner, true);
    this.tweens.add({ targets: badge, alpha: 1, duration: 400, delay: 50 });

    // Scan line — horizontal strip drifts top→bottom through badge every ~3.7s
    const scanGfx = this.add.graphics();
    scanGfx.fillStyle(0xffffff, 1);
    scanGfx.fillRect(-(bw / 2 - cut), 0, bw - cut * 2, 3);
    scanGfx.x = cx; scanGfx.y = cy - bh / 2;
    scanGfx.setAlpha(0);
    const runScan = () => {
      scanGfx.y = cy - bh / 2;
      scanGfx.setAlpha(0.06);
      this.tweens.add({
        targets: scanGfx, y: cy + bh / 2, alpha: 0,
        duration: 900, ease: 'Linear',
        onComplete: () => this.time.delayedCall(2800, runScan)
      });
    };
    this.time.delayedCall(1200, runScan);

    const mergeT = this.add.text(cx, cy - 34, 'M  E  R  G  E', {
      fontSize: '15px', fontFamily: 'Arial Black', color: '#8a6830'
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: mergeT, alpha: 1, duration: 400, delay: 220 });
    mergeT.postFX.addGlow(0xc8a951, 2, 0, false, 0.05, 12);

    const chaosT = this.add.text(cx, cy + 10, 'CHAOS', {
      fontSize: '88px', fontFamily: 'Arial Black',
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
    chaosT.postFX.addGlow(0x00e5cc, 6, 0, false, 0.1, 32);

    const glow = this.add.graphics();
    glow.fillStyle(0x00e5cc, 0.07);
    glow.fillEllipse(cx, cy + 10, 360, 90);
    this.tweens.add({ targets: glow, alpha: { from: 0.07, to: 0.18 }, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 1000 });
  }

  _drawCreatureShape(gfx, cfg, cx, cy, r) {
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

  _drawEvolutionChain(W, H) {
    const panelY = Math.round(H * 0.465);
    const panelH = 74;
    const maxSize = 75;

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
      const r = 8 + Math.round((c.size / maxSize) * 7);

      const shape = this.add.graphics().setAlpha(0).setScale(0.15);
      this._drawCreatureShape(shape, c, cx, cy, r);
      this.tweens.add({ targets: shape, alpha: 1, scaleX: 1, scaleY: 1, duration: 300, delay: 900 + i * 65, ease: 'Back.easeOut' });
      shape.postFX.addGlow(c.color, 3, 0, false, 0.1, 12);

      const nameT = this.add.text(cx, panelY + panelH - 11, c.name.substring(0, 3).toUpperCase(), {
        fontSize: '7px', fontFamily: 'Arial Black',
        color: '#' + c.color.toString(16).padStart(6, '0')
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: nameT, alpha: 0.65, duration: 280, delay: 990 + i * 65 });

      if (i < CREATURES.length - 1) {
        const ax = cx + slotW / 2;
        const arr = this.add.graphics().setAlpha(0);
        arr.fillStyle(0xffffff, 0.18);
        arr.fillTriangle(ax - 4, cy - 2, ax - 4, cy + 2, ax + 3, cy);
        this.tweens.add({ targets: arr, alpha: 1, duration: 250, delay: 1040 + i * 65 });
      }
    });
  }

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

    // Bottom shadow bar — creates 3D bevel (Clash Royale style)
    const bevelShadow = this.add.graphics().setAlpha(0);
    bevelShadow.lineStyle(2, 0x1a0800, 0.9);
    bevelShadow.beginPath();
    bevelShadow.moveTo(bx + 14, by + btnH - 5);
    bevelShadow.lineTo(bx + btnW - 14, by + btnH - 5);
    bevelShadow.strokePath();

    const border = this.add.graphics().setAlpha(0);
    border.lineStyle(1.5, 0xc8a951, 0.88);
    border.strokeRoundedRect(bx, by, btnW, btnH, 8);

    const btnText = this.add.text(W / 2, by + btnH / 2, 'PLAY NOW', {
      fontSize: '24px', fontFamily: 'Arial Black', color: '#ffffff',
      shadow: { offsetX: 0, offsetY: 2, color: '#5a3005', blur: 8, fill: true }
    }).setOrigin(0.5).setAlpha(0);

    btn.postFX.addGlow(0xc8a951, 4, 0, false, 0.1, 16);
    btnText.postFX.addGlow(0xffffff, 2, 0, false, 0.1, 8);

    [glow, btn, shine, bevelShadow, border, btnText].forEach(obj => {
      obj.y += 26;
      this.tweens.add({ targets: obj, y: obj.y - 26, alpha: 1, duration: 500, ease: 'Back.easeOut', delay: 970 });
    });
    // Stronger pulse — more visible lure
    this.tweens.add({ targets: glow, alpha: { from: 0.08, to: 0.28 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 1500 });

    // Repeating mini burst — 5 particles fly from button edges every 2.5s
    const spawnBurst = () => {
      for (let b = 0; b < 5; b++) {
        const side = Phaser.Math.Between(0, 1);
        const startX = side === 0 ? bx : bx + btnW;
        const startY = by + btnH / 2 + Phaser.Math.Between(-Math.floor(btnH / 2), Math.floor(btnH / 2));
        const bp = this.add.graphics();
        const bColors = [0xc8a951, 0xfff6cc, 0xe0bc62];
        bp.fillStyle(bColors[Phaser.Math.Between(0, 2)], 0.8);
        bp.fillCircle(0, 0, Phaser.Math.FloatBetween(1.5, 3));
        bp.x = startX; bp.y = startY;
        this.tweens.add({
          targets: bp,
          x: startX + (side === 0 ? -1 : 1) * Phaser.Math.Between(20, 60),
          y: startY + Phaser.Math.Between(-40, 10),
          alpha: 0,
          duration: Phaser.Math.Between(500, 900),
          ease: 'Power2.easeOut',
          onComplete: () => bp.destroy()
        });
      }
      this.time.delayedCall(2500, spawnBurst);
    };
    this.time.delayedCall(1800, spawnBurst);

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

  _drawFooter(W, H) {
    this.add.text(W / 2, H * 0.845, 'Drop creatures  ·  Same level = Merge  ·  Defend your base', {
      fontSize: '10px', fontFamily: 'Arial', color: '#38415a', letterSpacing: 1
    }).setOrigin(0.5);
  }
}
