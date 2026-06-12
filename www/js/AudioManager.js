// AudioManager — Web Audio API, synthetic sounds, zero files
class AudioManager {
  constructor() {
    this._actx = null;
    this._shootAt = 0;
    this._hitAt = 0;
  }

  _ctx() {
    if (!this._actx) {
      try {
        this._actx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) { return null; }
    }
    if (this._actx.state === 'suspended') {
      const p = this._actx.resume();
      if (p && p.catch) p.catch(() => {});
    }
    return this._actx;
  }

  playDrop() {
    const ctx = this._ctx(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.13);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t); osc.stop(t + 0.18);
  }

  playMerge() {
    const ctx = this._ctx(); if (!ctx) return;
    const t = ctx.currentTime;
    // Whoosh: filtered noise sweep
    const bufLen = Math.floor(ctx.sampleRate * 0.25);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass'; bpf.Q.value = 2.5;
    bpf.frequency.setValueAtTime(1800, t);
    bpf.frequency.exponentialRampToValueAtTime(350, t + 0.25);
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0.25, t);
    wg.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    src.connect(bpf); bpf.connect(wg); wg.connect(ctx.destination);
    src.start(t);
    // Two chime tones
    [[1047, 0.08, 0.42], [1568, 0.17, 0.48]].forEach(([freq, delay, dur]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'triangle'; osc.frequency.value = freq;
      g.gain.setValueAtTime(0.32, t + delay);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
      osc.start(t + delay); osc.stop(t + delay + dur);
    });
  }

  playShoot() {
    const now = Date.now();
    if (now - this._shootAt < 100) return;
    this._shootAt = now;
    const ctx = this._ctx(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'square';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(920, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.09);
    gain.gain.setValueAtTime(0.10, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.start(t); osc.stop(t + 0.09);
  }

  playHit() {
    const now = Date.now();
    if (now - this._hitAt < 80) return;
    this._hitAt = now;
    const ctx = this._ctx(); if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * 0.055);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    src.connect(gain); gain.connect(ctx.destination);
    src.start(t);
  }

  playWave() {
    const ctx = this._ctx(); if (!ctx) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'triangle'; osc.frequency.value = freq;
      const st = t + i * 0.11;
      g.gain.setValueAtTime(0.20, st);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.28);
      osc.start(st); osc.stop(st + 0.28);
    });
  }

  playGameOver() {
    const ctx = this._ctx(); if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 1.4);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.setValueAtTime(0.28, t + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    osc.start(t); osc.stop(t + 1.6);
    // Low resonant undertone
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.connect(g2); g2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(200, t + 0.45);
    osc2.frequency.exponentialRampToValueAtTime(55, t + 1.8);
    g2.gain.setValueAtTime(0, t + 0.45);
    g2.gain.linearRampToValueAtTime(0.20, t + 0.65);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    osc2.start(t + 0.45); osc2.stop(t + 1.8);
  }

  playBuy() {
    const ctx = this._ctx(); if (!ctx) return;
    const t = ctx.currentTime;
    [523, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'triangle'; osc.frequency.value = freq;
      const st = t + i * 0.09;
      g.gain.setValueAtTime(0.22, st);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.22);
      osc.start(st); osc.stop(st + 0.22);
    });
  }

  playBaseHit() {
    const ctx = this._ctx(); if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.22);
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.start(t); osc.stop(t + 0.28);
    // Low-pass noise layer
    const len = Math.floor(ctx.sampleRate * 0.14);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass'; lpf.frequency.value = 380;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.28, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    src.connect(lpf); lpf.connect(ng); ng.connect(ctx.destination);
    src.start(t);
  }
}

const GameAudio = new AudioManager();
