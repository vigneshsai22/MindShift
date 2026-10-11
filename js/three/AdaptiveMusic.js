/* ═══════════════════════════════════════════════════════════════
   AdaptiveMusic.js
   Procedural layered background music: bass pulse, pad, arp, hi-hat.
   Layers and tempo increase with difficulty and answer streak.
   Synthesized entirely via Web Audio API — no audio files needed.
   ═══════════════════════════════════════════════════════════════ */

export class AdaptiveMusic {
  constructor(ctxOrSpatialAudio) {
    this._spatialAudio = ctxOrSpatialAudio && ('ctx' in ctxOrSpatialAudio) ? ctxOrSpatialAudio : null;
    this.ctx    = this._spatialAudio ? this._spatialAudio.ctx : ctxOrSpatialAudio;
    this._nodes = [];
    this._running = false;
    this._bpm   = 80;
    this._diff  = 3;
    this._streak = 0;
    this._masterGain = null;
    this._beatInterval = null;
    this._beat = 0;
  }

  start() {
    if (this._running) return;
    this._running = true;
    // Use setInterval as a simple clock; AudioContext.currentTime drives actual timing
    this._beatInterval = setInterval(() => this._tick(), this._getBeatMs());
  }

  stop() {
    this._running = false;
    clearInterval(this._beatInterval);
    this._nodes.forEach(n => { try { n.stop?.(); n.disconnect?.(); } catch {} });
    this._nodes = [];
  }

  setDifficulty(diff, streak = 0) {
    this._diff   = diff;
    this._streak = streak;
    // Tempo ramps up with difficulty and streak
    this._bpm = 75 + diff * 12 + Math.min(streak, 5) * 4;
    clearInterval(this._beatInterval);
    if (this._running) this._beatInterval = setInterval(() => this._tick(), this._getBeatMs());
  }

  update() {
    // Listener update handled by SpatialAudio; nothing needed here per-frame
  }

  _getBeatMs() { return Math.round(60000 / this._bpm); }

  _tick() {
    const ctx = this.ctx || this._spatialAudio?.ctx;
    if (!ctx || ctx.state === 'suspended') return;
    this.ctx = ctx;
    const now = this.ctx.currentTime;
    const b   = this._beat % 16;

    // Bass pulse — every beat on 0,4,8,12
    if (b % 4 === 0) this._playBass(now);

    // Pad chord — every 8 beats
    if (b === 0) this._playPad(now);

    // Arp — from difficulty 2 onwards, on alternate beats
    if (this._diff >= 2 && b % 2 === 0) this._playArp(now, b);

    // Hi-hat — from difficulty 3, on every beat
    if (this._diff >= 3) this._playHiHat(now);

    // Sub-beat arp — difficulty 5 only
    if (this._diff >= 5 && b % 2 === 1) this._playArp(now, b + 7);

    this._beat++;
  }

  _playBass(t) {
    if (!this.ctx) return;
    const freq = [55, 58, 62, 65, 55][this._diff - 1] ?? 55;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 0.4);
    this._nodes.push(osc);
  }

  _playPad(t) {
    if (!this.ctx) return;
    const chords = [[220,277,330],[196,247,294],[175,220,262],[164,207,247],[147,185,220]];
    const freqs  = chords[this._diff - 1] ?? chords[2];
    freqs.forEach(f => {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f + (Math.random() - 0.5) * 2; // slight detune for warmth
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.06, t + 0.3);
      gain.gain.setValueAtTime(0.06, t + 1.2);
      gain.gain.linearRampToValueAtTime(0, t + 1.8);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 2);
      this._nodes.push(osc);
    });
  }

  _playArp(t, step) {
    if (!this.ctx) return;
    const scale = [262, 294, 330, 349, 392, 440, 494, 523];
    const freq  = scale[step % scale.length];
    const osc   = this.ctx.createOscillator();
    const gain  = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq * (1 + (this._diff - 1) * 0.1);
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 0.22);
    this._nodes.push(osc);
  }

  _playHiHat(t) {
    if (!this.ctx) return;
    const buf   = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
    const data  = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src   = this.ctx.createBufferSource();
    const gain  = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;
    src.buffer = buf;
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
    src.start(t);
    this._nodes.push(src);
  }
}
