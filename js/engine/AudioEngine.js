/* ═══════════════════════════════════════════════
   MindShift — AudioEngine (Web Audio API)
   ═══════════════════════════════════════════════ */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain    = null;
    this.musicGain  = null;
    this._muted     = false;
    this._musicNode = null;
    this._musicInterval = null;
    this.initialized = false;

    // Note frequencies (Hz)
    this.NOTES = {
      C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
      G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25,
      D5: 587.33, E5: 659.25
    };
    this.NOTE_NAMES = ['C4','D4','E4','F4','G4','A4','B4','C5'];
  }

  /** Call once after first user interaction */
  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.75;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.7;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.18;
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn('AudioEngine: Web Audio API not available', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  get muted() { return this._muted; }
  toggle() {
    this._muted = !this._muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this._muted ? 0 : 0.75, this.ctx.currentTime, 0.05);
    }
    return this._muted;
  }

  // ── Private helpers ──────────────────────────
  _osc(type, freq, start, dur, gainVal = 0.5, dest = null) {
    if (!this.initialized || this._muted) return;
    const target = dest || this.sfxGain;
    const osc = this.ctx.createOscillator();
    const g   = this.ctx.createGain();
    osc.type      = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gainVal, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(g);
    g.connect(target);
    osc.start(start);
    osc.stop(start + dur + 0.01);
  }

  _envelope(osc, gainNode, attack, decay, sustain, release, startTime) {
    const g = gainNode.gain;
    g.setValueAtTime(0, startTime);
    g.linearRampToValueAtTime(0.6, startTime + attack);
    g.linearRampToValueAtTime(sustain, startTime + attack + decay);
    g.setValueAtTime(sustain, startTime + attack + decay + 0.05);
    g.linearRampToValueAtTime(0.001, startTime + attack + decay + release);
  }

  // ── Sound Effects ─────────────────────────────
  playClick() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    this._osc('sine', 800, t, 0.05, 0.2);
    this._osc('sine', 1200, t, 0.04, 0.1);
  }

  playCorrect() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    this._osc('sine', 523.25, t,       0.25, 0.4);
    this._osc('sine', 659.25, t + 0.1, 0.25, 0.4);
    this._osc('sine', 783.99, t + 0.2, 0.3,  0.5);
  }

  playWrong() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    this._osc('sawtooth', 180, t,       0.25, 0.3);
    this._osc('sawtooth', 150, t + 0.1, 0.25, 0.3);
    this._osc('sawtooth', 120, t + 0.2, 0.3,  0.3);
  }

  playLevelUp() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    [261.63, 329.63, 392, 523.25, 659.25].forEach((f, i) => {
      this._osc('sine', f, t + i * 0.1, 0.3, 0.4);
    });
  }

  playLevelDown() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    [392, 329.63, 261.63, 196].forEach((f, i) => {
      this._osc('sine', f, t + i * 0.1, 0.3, 0.3);
    });
  }

  playTick() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    this._osc('square', 1000, t, 0.04, 0.15);
  }

  playUrgent() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    this._osc('square', 800, t,       0.08, 0.3);
    this._osc('square', 800, t + 0.1, 0.08, 0.3);
  }

  playStreak() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    this._osc('sine', 880,   t,       0.15, 0.4);
    this._osc('sine', 1108,  t + 0.1, 0.15, 0.4);
    this._osc('sine', 1319,  t + 0.2, 0.2,  0.5);
  }

  playHint() {
    if (!this.initialized) return;
    const t = this.ctx.currentTime;
    this._osc('triangle', 440, t,       0.2, 0.3);
    this._osc('triangle', 554, t + 0.1, 0.2, 0.3);
  }

  // ── Tone for Audio Challenge ──────────────────
  /**
   * Play a named note (C4, D4, etc.) and return its duration.
   * @param {string} noteName
   * @param {number} duration  seconds
   * @param {number} [delay=0] seconds to wait before playing
   */
  playNote(noteName, duration = 0.5, delay = 0) {
    if (!this.initialized) return;
    const freq = this.NOTES[noteName];
    if (!freq) return;

    const t = this.ctx.currentTime + delay;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = 2500;

    this._envelope(osc, gain, 0.01, 0.05, 0.5, duration * 0.8, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.1);
  }

  /** Play a sequence of notes for the audio challenge */
  playSequence(notes, noteDuration = 0.5, gap = 0.15) {
    notes.forEach((note, i) => {
      this.playNote(note, noteDuration, i * (noteDuration + gap));
    });
    return notes.length * (noteDuration + gap);
  }

  // ── Background Ambient Music ──────────────────
  startAmbient() {
    if (!this.initialized || this._musicInterval) return;
    this._playAmbientChord();
    this._musicInterval = setInterval(() => this._playAmbientChord(), 4200);
  }

  _playAmbientChord() {
    if (!this.initialized || this._muted) return;
    const chords = [
      [65.41, 98.00, 130.81],  // F2 G2 C3
      [55.00, 87.31, 130.81],  // A2 F2 C3
      [73.42, 98.00, 146.83],  // D2 G2 D3
      [61.74, 98.00, 123.47],  // B2 G2 B3
    ];
    const chord = chords[Math.floor(Math.random() * chords.length)];
    const t = this.ctx.currentTime;
    chord.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const g   = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.5);
      g.gain.setValueAtTime(0.12, t + 3.0);
      g.gain.linearRampToValueAtTime(0, t + 4.0);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + 4.2);
    });
  }

  stopAmbient() {
    if (this._musicInterval) {
      clearInterval(this._musicInterval);
      this._musicInterval = null;
    }
  }

  // ── Spoken Instructions (Web Speech API) ─────
  speak(text, rate = 1, pitch = 1) {
    if (!window.speechSynthesis || this._muted) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate  = rate;
    utter.pitch = pitch;
    utter.volume = 0.9;
    window.speechSynthesis.speak(utter);
  }

  stopSpeak() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }
}
