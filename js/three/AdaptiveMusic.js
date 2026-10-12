/* ═══════════════════════════════════════════════════════════════
   AdaptiveMusic.js — Procedural 4-Layer Adaptive Soundtrack
   Synthesized 100% via Web Audio API.
   Layers:
   1. Sub-Bass Pulse (deep analog foundation)
   2. Atmospheric Pad (warm detuned tri-chords)
   3. Neural Arpeggio (pentatonic sequencer)
   4. Industrial Rhythm / Hi-Hat (percussive drive)
   ═══════════════════════════════════════════════════════════════
   Dynamically responds to:
   - AI Director state (BUILD, PEAK, RELIEF, RECOVER)
   - Player Combo multiplier (audio pitch rises with combo)
   - Cognitive difficulty level & streak
   ═══════════════════════════════════════════════════════════════ */

import { EventBus } from '../core/EventBus.js';

export class AdaptiveMusic {
  constructor(spatialAudio) {
    this._spatialAudio = spatialAudio;
    this.ctx = spatialAudio?.ctx || null;
    this._nodes = [];
    this._running = false;
    this._bpm = 90;
    this._diff = 3;
    this._streak = 0;
    this._comboMult = 1.0;
    this._directorState = 'BUILD';
    this._beat = 0;
    this._beatInterval = null;
    this._volume = 0.65;
    this._masterGain = null;
    this._unsubs = [];
  }

  start() {
    if (this._running) return;
    this._ensureContext();
    this._running = true;
    this._bindEvents();
    this._updateTempo();
  }

  _ensureContext() {
    if (!this.ctx && this._spatialAudio?.ctx) {
      this.ctx = this._spatialAudio.ctx;
    }
    if (this.ctx && !this._masterGain) {
      this._masterGain = this.ctx.createGain();
      this._masterGain.gain.value = this._volume;
      this._masterGain.connect(this.ctx.destination);
    }
  }

  _bindEvents() {
    this._unsubs.push(
      EventBus.on('director:state', (data) => {
        this._directorState = data.state;
        this._updateTempo();
      }),
      EventBus.on('combo:change', (data) => {
        this._comboMult = data.multiplier || 1.0;
      })
    );
  }

  stop() {
    this._running = false;
    if (this._beatInterval) clearInterval(this._beatInterval);
    this._unsubs.forEach(u => u());
    this._unsubs = [];
    this._nodes.forEach(n => {
      try { n.stop?.(); n.disconnect?.(); } catch {}
    });
    this._nodes = [];
  }

  setDifficulty(diff, streak = 0) {
    this._diff = Math.max(1, Math.min(5, diff));
    this._streak = streak;
    this._updateTempo();
  }

  _updateTempo() {
    let baseBpm = 80 + this._diff * 10 + Math.min(this._streak, 5) * 3;
    if (this._directorState === 'PEAK') baseBpm += 20;
    else if (this._directorState === 'RELIEF') baseBpm -= 15;
    else if (this._directorState === 'RECOVER') baseBpm -= 10;

    this._bpm = Math.max(65, Math.min(150, baseBpm));

    if (this._beatInterval) clearInterval(this._beatInterval);
    if (this._running) {
      this._beatInterval = setInterval(() => this._tick(), Math.round(60000 / this._bpm));
    }
  }

  update(delta) {
    // Keep context alive
    if (!this.ctx && this._spatialAudio?.ctx) {
      this._ensureContext();
    }
  }

  _tick() {
    this._ensureContext();
    if (!this.ctx || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const b = this._beat % 16;
    const pitchShift = Math.pow(1.05946, (this._comboMult - 1.0) * 3); // Semitone shift with combo

    // 1. Bass Pulse (Every beat or downbeats)
    if (b % 4 === 0 || (this._directorState === 'PEAK' && b % 2 === 0)) {
      this._playBass(now, pitchShift);
    }

    // 2. Pad Chords (Every 8 beats, unless relief in which case it plays continuously)
    if (b % 8 === 0) {
      this._playPad(now, pitchShift);
    }

    // 3. Arpeggio Sequence (Difficulty >= 2 or PEAK)
    if ((this._diff >= 2 || this._directorState === 'PEAK') && b % 2 === 0) {
      this._playArp(now, b, pitchShift);
    }

    // 4. Rhythm Drums & Hi-Hats (Suppressed in RELIEF)
    if (this._directorState !== 'RELIEF') {
      if (this._diff >= 3 && b % 2 === 1) this._playHiHat(now);
      if (this._directorState === 'PEAK' && (b === 4 || b === 12)) this._playSnare(now);
    }

    this._beat++;

    // Prune expired nodes
    if (this._nodes.length > 40) {
      this._nodes = this._nodes.filter(n => n.playbackState !== 'finished');
    }
  }

  _playBass(t, pitchShift = 1.0) {
    const rootFreq = [55, 58, 62, 65, 55][this._diff - 1] || 55;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = this._directorState === 'PEAK' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(rootFreq * pitchShift, t);
    osc.frequency.exponentialRampToValueAtTime((rootFreq * 0.7) * pitchShift, t + 0.3);

    gain.gain.setValueAtTime(0.18 * (this._volume / 0.7), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this._masterGain);
    osc.start(t);
    osc.stop(t + 0.38);
    this._nodes.push(osc);
  }

  _playPad(t, pitchShift = 1.0) {
    const chords = [
      [220, 277.18, 329.63], // A maj
      [196, 246.94, 293.66], // G maj
      [174.61, 220, 261.63], // F maj
      [164.81, 207.65, 246.94], // E maj
      [146.83, 185.00, 220.00]  // D min
    ];
    const freqs = chords[this._diff - 1] || chords[0];

    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f * pitchShift + (i * 0.4); // Subtle phase detune

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.05 * (this._volume / 0.7), t + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);

      osc.connect(gain);
      gain.connect(this._masterGain);
      osc.start(t);
      osc.stop(t + 3.3);
      this._nodes.push(osc);
    });
  }

  _playArp(t, beat, pitchShift = 1.0) {
    const notes = [440, 493.88, 554.37, 659.25, 739.99, 880];
    const note = notes[(beat + this._diff) % notes.length];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(note * pitchShift, t);

    gain.gain.setValueAtTime(0.04 * (this._volume / 0.7), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

    osc.connect(gain);
    gain.connect(this._masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
    this._nodes.push(osc);
  }

  _playHiHat(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(4500, t);

    gain.gain.setValueAtTime(0.03 * (this._volume / 0.7), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    osc.connect(gain);
    gain.connect(this._masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
    this._nodes.push(osc);
  }

  _playSnare(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);

    gain.gain.setValueAtTime(0.12 * (this._volume / 0.7), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

    osc.connect(gain);
    gain.connect(this._masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
    this._nodes.push(osc);
  }
}
