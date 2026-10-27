/* ═══════════════════════════════════════════════════════════════
   SequencePlayer.js — Plays and records sequences for memory/
   pattern games. Handles light+sound playback, player input
   recording, and sequence comparison.
   ═══════════════════════════════════════════════════════════════ */

export class SequencePlayer {
  constructor(options = {}) {
    this._sequence    = [];
    this._playerInput = [];
    this._playing     = false;
    this._recording   = false;
    this._currentStep = 0;
    this._onStep      = null;   // (index, value, isLast) => void
    this._onPlayStep  = null;   // (value, index, isLast) => void
    this._onComplete  = null;
    this._onError     = null;
    this._stepDelay   = options.stepDuration ? Math.round(options.stepDuration * 1000) : (options.interval ? Math.round(options.interval * 1000) : 600);
    this._timer       = null;
  }

  /**
   * Set the sequence to play.
   * @param {Array} seq - array of values (pad indices, note names, colors, etc.)
   */
  setSequence(seq) {
    this._sequence = [...seq];
    return this;
  }

  /** Configure playback speed in milliseconds directly */
  setStepDelay(ms) {
    this._stepDelay = ms;
    return this;
  }

  /** Configure active flash/playback duration per step in seconds */
  setStepDuration(sec) {
    this._stepDuration = sec;
    this._stepDelay = Math.round(((this._stepDuration || 0) + (this._interval || 0)) * 1000) || Math.round(sec * 1000);
    return this;
  }

  /** Configure pause interval between steps in seconds */
  setInterval(sec) {
    this._interval = sec;
    this._stepDelay = Math.round(((this._stepDuration || 0) + (this._interval || 0)) * 1000) || Math.round(sec * 1000);
    return this;
  }

  /** Register callbacks */
  onStep(fn)         { this._onStep = fn; return this; }
  onPlayStep(fn)     { this._onPlayStep = fn; return this; }
  onComplete(fn)     { this._onComplete = fn; return this; }
  onSequenceEnd(fn)  { this._onComplete = fn; return this; }
  onError(fn)        { this._onError = fn; return this; }

  /**
   * Play the sequence visually/aurally.
   * Accepts optional sequence array directly.
   */
  play(seq = null) {
    if (seq && Array.isArray(seq)) {
      this.setSequence(seq);
    }
    this.stop();
    this._playing = true;
    this._currentStep = 0;
    this._playNext();
  }

  _playNext() {
    if (!this._playing) return;
    if (this._currentStep >= this._sequence.length) {
      this._playing = false;
      if (this._onComplete) this._onComplete();
      return;
    }

    const idx = this._currentStep;
    const val = this._sequence[idx];
    const isLast = idx === this._sequence.length - 1;

    if (this._onPlayStep) this._onPlayStep(val, idx, isLast);
    if (this._onStep) this._onStep(idx, val, isLast);
    this._currentStep++;

    this._timer = setTimeout(() => this._playNext(), this._stepDelay);
  }

  /** Start recording player input */
  startRecording() {
    this._playerInput = [];
    this._recording = true;
  }

  /**
   * Record one player input.
   * @param {*} value - the value the player selected
   * @returns {{ correct: boolean, complete: boolean, index: number }}
   */
  recordInput(value) {
    if (!this._recording) return { correct: false, complete: false, index: -1 };

    const idx = this._playerInput.length;
    const expected = this._sequence[idx];
    const correct = value === expected;

    this._playerInput.push(value);

    if (!correct) {
      this._recording = false;
      if (this._onError) this._onError(idx, value, expected);
      return { correct: false, complete: false, index: idx };
    }

    const complete = this._playerInput.length >= this._sequence.length;
    if (complete) {
      this._recording = false;
      if (this._onComplete) this._onComplete();
    }

    return { correct: true, complete, index: idx };
  }

  /** Check if the full player input matches the sequence */
  isMatch() {
    if (this._playerInput.length !== this._sequence.length) return false;
    return this._playerInput.every((v, i) => v === this._sequence[i]);
  }

  /** Get accuracy (fraction of correct inputs) */
  getAccuracy() {
    if (this._sequence.length === 0) return 0;
    let correct = 0;
    for (let i = 0; i < this._playerInput.length; i++) {
      if (this._playerInput[i] === this._sequence[i]) correct++;
    }
    return correct / this._sequence.length;
  }

  /** Stop playback or recording */
  stop() {
    this._playing = false;
    this._recording = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /** Reset to initial state */
  reset() {
    this.stop();
    this._sequence = [];
    this._playerInput = [];
    this._currentStep = 0;
  }

  get isPlaying()   { return this._playing; }
  get isRecording() { return this._recording; }
  get sequence()    { return this._sequence; }
  get playerInput() { return this._playerInput; }
  get length()      { return this._sequence.length; }
}
