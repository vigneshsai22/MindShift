/* ═══════════════════════════════════════════════════════════════
   SFXLib.js — Procedural sound effects library using Web Audio API
   No audio files needed — everything is synthesised.
   ═══════════════════════════════════════════════════════════════ */

let _ctx = null;
let _masterGain = null;
let _sfxGain = null;
let _musicGain = null;

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    _masterGain = _ctx.createGain();
    _masterGain.gain.value = 0.7;
    _masterGain.connect(_ctx.destination);

    _sfxGain = _ctx.createGain();
    _sfxGain.gain.value = 0.7;
    _sfxGain.connect(_masterGain);

    _musicGain = _ctx.createGain();
    _musicGain.gain.value = 0.5;
    _musicGain.connect(_masterGain);
  }
  return _ctx;
}

function playTone(freq, duration, type = 'sine', volume = 0.3, detune = 0) {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const safeDuration = Math.max(0.02, duration || 0.1);
    const safeVolume = Math.max(0.001, volume || 0.1);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.setValueAtTime(safeVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + safeDuration);
    osc.connect(gain);
    gain.connect(_sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + safeDuration);
  } catch (e) {
    // Non-blocking procedural audio fallback
  }
}

function playNoise(duration, volume = 0.15) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(gain);
  gain.connect(_sfxGain);
  source.start();
}

export const SFXLib = {
  /** Initialize Web Audio context */
  init() {
    try {
      const ctx = getCtx();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (e) {
      console.warn('[SFXLib] AudioContext init deferred:', e);
    }
  },

  /** Resume audio context (must be called on user gesture) */
  resume() {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
  },

  get context() { return getCtx(); },
  get sfxNode() { return _sfxGain; },
  get musicNode() { return _musicGain; },
  get masterNode() { return _masterGain; },

  setMasterVolume(v) { if (_masterGain) _masterGain.gain.value = v; },
  setSFXVolume(v)    { if (_sfxGain) _sfxGain.gain.value = v; },
  setMusicVolume(v)  { if (_musicGain) _musicGain.gain.value = v; },

  /* ── Sound Effects ──────────────────────────────────────────── */

  /** Positive feedback — ascending chime */
  correct() {
    playTone(523.25, 0.12, 'sine', 0.25);    // C5
    setTimeout(() => playTone(659.25, 0.12, 'sine', 0.25), 80);  // E5
    setTimeout(() => playTone(783.99, 0.18, 'sine', 0.3), 160);  // G5
  },

  /** Negative feedback — descending buzz */
  incorrect() {
    playTone(220, 0.25, 'sawtooth', 0.15);
    playTone(185, 0.3, 'sawtooth', 0.12);
  },

  /** Button click — short tick */
  click() {
    playTone(800, 0.05, 'square', 0.1);
  },

  /** Hint activation — mystical whoosh */
  hint() {
    playTone(440, 0.3, 'sine', 0.15);
    playTone(554.37, 0.3, 'sine', 0.1);
    playNoise(0.2, 0.05);
  },

  /** Combo increment — rising ping */
  combo(level = 1) {
    const baseFreq = 523.25 + level * 50;
    playTone(baseFreq, 0.1, 'sine', 0.2);
  },

  /** Star earned — sparkle */
  star() {
    playTone(1046.5, 0.08, 'sine', 0.2);
    setTimeout(() => playTone(1318.5, 0.08, 'sine', 0.2), 60);
    setTimeout(() => playTone(1568, 0.15, 'sine', 0.25), 120);
  },

  /** Level start — dramatic sweep */
  levelStart() {
    playTone(130.81, 0.4, 'sawtooth', 0.08);
    playTone(261.63, 0.3, 'triangle', 0.1);
    playNoise(0.15, 0.04);
  },

  /** Level complete — triumphant fanfare */
  levelComplete() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, 'sine', 0.2), i * 100);
    });
  },

  /** Boss clear — epic stinger */
  bossClear() {
    const notes = [261.63, 329.63, 392, 523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.25, 'sine', 0.2), i * 80);
    });
    setTimeout(() => playNoise(0.3, 0.06), 400);
  },

  /** Failure — somber tone */
  failure() {
    playTone(196, 0.5, 'sine', 0.15);
    setTimeout(() => playTone(185, 0.6, 'sine', 0.12), 200);
  },

  /** Timer warning — ticking pulse */
  timerWarning() {
    playTone(1000, 0.05, 'square', 0.15);
  },

  /** Timer expire — alarm */
  timerExpire() {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => playTone(880, 0.1, 'square', 0.2), i * 150);
    }
  },

  /** Menu hover — soft blip */
  hover() {
    playTone(600, 0.04, 'sine', 0.08);
  },

  /** Achievement unlock — celebration */
  achievement() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        playTone(freq, 0.15, 'sine', 0.15);
        playTone(freq * 1.5, 0.15, 'sine', 0.08);
      }, i * 90);
    });
  },

  /** Pad/key press — for memory/tone games */
  pad(noteIndex = 0, duration = 0.3) {
    // Pentatonic scale from C4
    const scale = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880];
    const freq = scale[noteIndex % scale.length];
    playTone(freq, duration, 'sine', 0.3);
    playTone(freq * 2, duration * 0.7, 'sine', 0.1);  // harmonic
  },

  /** Whoosh — for transitions */
  whoosh() {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(_sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    playNoise(0.1, 0.05);
  },

  /** Play a specific frequency (for custom games) */
  tone(freq, duration = 0.3, type = 'sine', volume = 0.2) {
    playTone(freq, duration, type, volume);
  },
  playTone(freq, duration = 0.3, type = 'sine', volume = 0.3, detune = 0) {
    playTone(freq, duration, type, volume, detune);
  },

  /* Aliases & Game specific sound triggers */
  playSuccess() {
    this.correct();
  },
  playError() {
    this.incorrect();
  },
  playNoteSuccess() {
    this.correct();
  },
  playClick() {
    this.click();
  },
  playHit() {
    playTone(180, 0.08, 'sawtooth', 0.2);
  },
  playSwitch() {
    playTone(720, 0.04, 'square', 0.12);
  },
  playLevelUp() {
    this.levelComplete();
  },
  playTimeout() {
    this.timerExpire();
  }
};
