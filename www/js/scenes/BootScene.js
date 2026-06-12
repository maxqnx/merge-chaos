// BootScene — "VOID CHAOS" — Session 25 full redesign
// Concept: black void + electric violet, typography-first, cinematic depth
class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this._drawBackground(W, H);
    this._drawGhostCreature(W, H);
    this._drawTitle(W, H);
    this._drawEvolutionChain(W, H);
    this._drawPlayButton(W, H);
    this._drawFooter(W, H);
  }

  // ── BACKGROUND — void atmosphere, NO scanlines, NO grid ─────────────────────

  _drawBackground(W, H) {
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 1);
    bg.fillRect(0, 0, W, H);

    // Atmospheric depth — 3 soft radial hazes
    const hazes = [
      { x: W * 0.5,  y: H * 0.22, r: 240, c: 0x4A0090, layers: 5 },
      { x: W * 0.1,  y: H * 0.72, r: 160, c: 0x1A0038, layers: 4 },
      { x: W * 0.9,  y: H * 0.55, r: 140, c: 0x2A0014, layers: 4 },
    ];
    hazes.forEach(h => {
      const g = this.add.graphics();
      for (let i = 0; i < h.layers; i++) {
        const ratio = 1 - i / h.layers;
        g.fillStyle(h.c, 0.10 * ratio * ratio);
        g.fillCircle(h.x, h.y, h.r * ratio);
      }
    });

    // Vignette — dark edges, bright center
    if (this.cameras.main.postFX) {
      this.cameras.main.postFX.addVignette(0.5, 0.42, 0.72, 0.55);
    }

    // Cosmic particles — tiny, white + violet, drifting up
    const pColors = [0xffffff, 0xffffff, 0x9B5CF6];
    for (let i = 0; i < 28; i++) {
      const px = Math.random() * W;
      const py = Math.random() * H;
      const pr = Math.random() * 1.2 + 0.4;
      const pc = pColors[Math.floor(Math.random() * pColors.length)];
      const pa = Math.random() * 0.30 + 0.10;
      const gfx = this.add.graphics();
      gfx.fillStyle(pc, pa);
      gfx.fillCircle(0, 0, pr);
      gfx.x = px; gfx.y = py;
      this.tweens.add({
        targets: gfx,
        y: py - Phaser.Math.Between(60, 160),
        alpha: { from: pa, to: 0 },
        duration: Phaser.Math.Between(4000, 10000),
        delay: Phaser.Math.Between(0, 6000),
        repeat: -1,
        onRepeat: () => {
          gfx.x = Math.random() * W;
          gfx.y = H + 8;
          gfx.setAlpha(Math.random() * 0.28 + 0.08);
        }
      });
    }
  }

  // ── GHOST CREATURE — God silhouette behind title, cinematic depth ────────────

  _drawGhostCreature(W, H) {
    const cx = W / 2, cy = Math.round(H * 0.27);
    const r = 95;
    const c = 0x9B5CF6;
    const gfx = this.add.graphics().setAlpha(0);

    // Octagon (God creature) — very faint, atmospheric
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    gfx.fillStyle(c, 0.04);
    gfx.fillPoints(pts, true);
    gfx.fillStyle(c, 0.025);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      gfx.fillTriangle(
        cx + Math.cos(a) * r * 0.3,          cy + Math.sin(a) * r * 0.3,
        cx + Math.cos(a + 0.15) * r * 1.45,  cy + Math.sin(a + 0.15) * r * 1.45,
        cx + Math.cos(a - 0.15) * r * 1.45,  cy + Math.sin(a - 0.15) * r * 1.45
      );
    }
    // Outer ring
    gfx.lineStyle(1, c, 0.06);
    gfx.strokeCircle(cx, cy, r * 1.5);

    this.tweens.add({ targets: gfx, alpha: 1, duration: 1200, delay: 200 });
    this.tweens.add({
      targets: gfx,
      alpha: { from: 1, to: 0.5 },
      duration: 3500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 1400
    });
  }

  // ── TITLE — typography-first, NO badge frame ─────────────────────────────────

  _drawTitle(W, H) {
    const cx = W / 2;
    const titleCY = Math.round(H * 0.27);

    // MERGE — small eyebrow label
    const mergeT = this.add.text(cx, titleCY - 58, 'M E R G E', {
      fontSize: '14px', fontFamily: 'Arial Black',
      color: '#6D28D9', letterSpacing: 6
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: mergeT, alpha: 1, duration: 500, delay: 250 });

    // Thin rule under MERGE label
    const rule = this.add.graphics().setAlpha(0);
    rule.lineStyle(1, 0x4C1D95, 0.55);
    rule.beginPath();
    rule.moveTo(cx - 72, titleCY - 44);
    rule.lineTo(cx + 72, titleCY - 44);
    rule.strokePath();
    this.tweens.add({ targets: rule, alpha: 1, duration: 400, delay: 400 });

    // CHAOS — the hero: white, massive, ONE violet glow
    const chaosT = this.add.text(cx, titleCY + 8, 'CHAOS', {
      fontSize: '92px', fontFamily: 'Arial Black',
      color: '#FFFFFF',
      stroke: '#07001A', strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 0, color: '#7C3AED', blur: 44, fill: true }
    }).setOrigin(0.5).setScale(0.05).setAlpha(0);

    this.tweens.add({
      targets: chaosT, scaleX: 1, scaleY: 1, alpha: 1,
      duration: 680, delay: 320, ease: 'Back.easeOut',
      onComplete: () => {
        if (chaosT.postFX) {
          const glowFX = chaosT.postFX.addGlow(0x7C3AED, 7, 0, false, 0.1, 28);
          this.tweens.add({
            targets: glowFX, outerStrength: { from: 7, to: 14 },
            duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
          });
        }
        this.tweens.add({
          targets: chaosT,
          scaleX: 1.016, scaleY: 1.016,
          duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
      }
    });
  }

  // ── EVOLUTION CHAIN — 5 milestone creatures, larger, no background panel ─────

  _drawEvolutionChain(W, H) {
    const chainY = Math.round(H * 0.475);
    const chainH = 88;

    // Section label
    const label = this.add.text(W / 2, chainY - 16, '8 LEVELS OF EVOLUTION', {
      fontSize: '8px', fontFamily: 'Arial Black',
      color: '#4C1D95', letterSpacing: 3
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: label, alpha: 0.85, duration: 400, delay: 680 });

    // Show 5 milestone creatures: Slime(0) Orc(2) Dragon(4) Titan(6) God(7)
    const milestones = [0, 2, 4, 6, 7];
    const slotW = W / milestones.length;
    const maxSize = 75;

    milestones.forEach((idx, i) => {
      const c = CREATURES[idx];
      const cx = slotW * i + slotW / 2;
      const cy = chainY + 32;
      const r = 11 + Math.round((c.size / maxSize) * 10);

      // Creature halo (always visible, subtle)
      const halo = this.add.graphics().setAlpha(0);
      halo.fillStyle(c.color, 0.08);
      halo.fillCircle(cx, cy, r + 10);
      this.tweens.add({ targets: halo, alpha: 1, duration: 300, delay: 800 + i * 80 });
      this.tweens.add({
        targets: halo,
        alpha: { from: 1, to: 0.35 },
        duration: 1600 + i * 200,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 1000 + i * 100
      });

      // Creature shape
      const shape = this.add.graphics().setAlpha(0).setScale(0.08);
      this._drawCreatureShape(shape, c, cx, cy, r);
      this.tweens.add({
        targets: shape, alpha: 1, scaleX: 1, scaleY: 1,
        duration: 320, delay: 850 + i * 80, ease: 'Back.easeOut'
      });
      if (shape.postFX) {
        shape.postFX.addGlow(c.color, 3, 0, false, 0.08, 10);
      }

      // Level number above creature
      const lvlT = this.add.text(cx, cy - r - 8, `${idx + 1}`, {
        fontSize: '9px', fontFamily: 'Arial Black',
        color: '#' + c.color.toString(16).padStart(6, '0')
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: lvlT, alpha: 0.8, duration: 280, delay: 930 + i * 80 });

      // Creature name below
      const nameT = this.add.text(cx, chainY + chainH - 10, c.name.toUpperCase(), {
        fontSize: '7px', fontFamily: 'Arial Black',
        color: '#' + c.color.toString(16).padStart(6, '0')
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: nameT, alpha: 0.65, duration: 280, delay: 960 + i * 80 });

      // Arrow between milestones
      if (i < milestones.length - 1) {
        const ax = cx + slotW / 2;
        const arr = this.add.graphics().setAlpha(0);
        arr.fillStyle(0x4C1D95, 0.55);
        arr.fillTriangle(ax - 4, cy - 3, ax - 4, cy + 3, ax + 4, cy);
        this.tweens.add({ targets: arr, alpha: 1, duration: 250, delay: 1010 + i * 80 });
      }
    });
  }

  // ── PLAY BUTTON — electric violet, bold, unmistakably a CTA ─────────────────

  _drawPlayButton(W, H) {
    const btnW = W - 40;
    const btnH = 66;
    const bx = 20;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const by = Math.round(H * (isAndroid ? 0.60 : 0.670));

    // Outer glow haze
    const glow = this.add.graphics().setAlpha(0);
    glow.fillStyle(0x7C3AED, 0.14);
    glow.fillEllipse(W / 2, by + btnH / 2, btnW + 70, btnH + 55);

    // Main fill — violet gradient top → deep violet bottom
    const btn = this.add.graphics().setAlpha(0);
    btn.fillGradientStyle(0xA855F7, 0xA855F7, 0x5B21B6, 0x5B21B6, 1);
    btn.fillRoundedRect(bx, by, btnW, btnH, 12);

    // Top inner highlight — subtle specular
    const shine = this.add.graphics().setAlpha(0);
    shine.lineStyle(1.5, 0xD8B4FE, 0.30);
    shine.beginPath();
    shine.moveTo(bx + 20, by + 7);
    shine.lineTo(bx + btnW - 20, by + 7);
    shine.strokePath();

    // Outer border
    const border = this.add.graphics().setAlpha(0);
    border.lineStyle(1.5, 0x9333EA, 0.9);
    border.strokeRoundedRect(bx, by, btnW, btnH, 12);

    // Label
    const btnText = this.add.text(W / 2, by + btnH / 2, 'PLAY NOW', {
      fontSize: '26px', fontFamily: 'Arial Black',
      color: '#FFFFFF',
      shadow: { offsetX: 0, offsetY: 2, color: '#1E1B4B', blur: 8, fill: true }
    }).setOrigin(0.5).setAlpha(0);

    if (btn.postFX) {
      btn.postFX.addGlow(0x9333EA, 5, 0, false, 0.08, 18);
    }

    // Entrance — slide up + fade
    [glow, btn, shine, border, btnText].forEach(obj => {
      obj.y += 28;
      this.tweens.add({
        targets: obj, y: obj.y - 28, alpha: 1,
        duration: 520, ease: 'Back.easeOut', delay: 980
      });
    });

    // Idle: glow pulses
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.10, to: 0.30 },
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 1520
    });

    // Interaction
    const hit = this.add.zone(W / 2, by + btnH / 2, btnW, btnH + 14).setInteractive({ useHandCursor: true });
    let isActivating = false;

    hit.on('pointerover', () => {
      if (btnText.alpha < 0.9 || isActivating) return;
      this.tweens.killTweensOf([btn, btnText, shine, border]);
      this.tweens.add({ targets: [btn, btnText, shine, border], scaleX: 1.025, scaleY: 1.025, duration: 130 });
    });
    hit.on('pointerout', () => {
      if (btnText.alpha < 0.9 || isActivating) return;
      this.tweens.killTweensOf([btn, btnText, shine, border]);
      this.tweens.add({ targets: [btn, btnText, shine, border], scaleX: 1, scaleY: 1, duration: 130 });
    });

    // Activate on pointerup (more reliable than pointerdown on mobile WebView)
    hit.on('pointerup', () => {
      if (isActivating || btnText.alpha < 0.9) {
        console.log('[BootScene] Tap ignored: isActivating=' + isActivating + ' alpha=' + btnText.alpha);
        return;
      }
      isActivating = true;
      console.log('[BootScene] PLAY NOW tapped — starting GameScene');
      
      this.tweens.killTweensOf([btn, btnText, shine, border]);
      this.tweens.add({
        targets: [btn, btnText, shine, border],
        scaleX: 0.97, scaleY: 0.97, duration: 75,
        onComplete: () => {
          console.log('[BootScene] Scale tween complete — flashing camera');
          this.cameras.main.flash(220, 130, 50, 240, true);
          this.cameras.main.fadeOut(300, 0, 0, 0);
          console.log('[BootScene] Fade started — scheduling GameScene start');
          this.time.delayedCall(300, () => {
            console.log('[BootScene] Starting GameScene now');
            this.scene.start('GameScene');
          });
        }
      });
    });
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────────

  _drawFooter(W, H) {
    this.add.text(W / 2, Math.round(H * 0.848),
      'TOWER DEFENSE  ×  MERGE STRATEGY', {
      fontSize: '9px', fontFamily: 'Arial Black',
      color: '#3B0764', letterSpacing: 2
    }).setOrigin(0.5);
  }

  // ── CREATURE SHAPE RENDERER (unchanged from S24) ─────────────────────────────

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
        gfx.fillTriangle(cx - s*0.7, cy - s*0.2, cx - s*0.4, cy - s*0.9, cx - s*0.1, cy - s*0.35);
        gfx.fillTriangle(cx + s*0.7, cy - s*0.2, cx + s*0.4, cy - s*0.9, cx + s*0.1, cy - s*0.35);
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
        gfx.fillTriangle(cx - s*1.7, cy - s*0.8, cx - s*0.8, cy - s*0.3, cx - s*0.4, cy + s*0.2);
        gfx.fillTriangle(cx + s*1.7, cy - s*0.8, cx + s*0.8, cy - s*0.3, cx + s*0.4, cy + s*0.2);
        gfx.fillStyle(c, 1);
        gfx.fillCircle(cx, cy, s);
        break;
      }
      case 6: {
        gfx.fillStyle(c, 1);
        gfx.fillCircle(cx, cy + s*0.18, s*0.82);
        gfx.fillTriangle(cx - s*0.26, cy - s*0.16, cx, cy - s*1.05, cx + s*0.26, cy - s*0.16);
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
}
