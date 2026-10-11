/* ═══════════════════════════════════════════════
   MindShift — ChallengeBase
   Abstract base for all challenge types
   ═══════════════════════════════════════════════ */

export class ChallengeBase {
  /**
   * @param {object} data      Challenge data from challengePool
   * @param {object} engine    GameEngine reference
   */
  constructor(data, engine) {
    this.data     = data;
    this.engine   = engine;
    this.canvas   = engine.canvas;
    this.ctx      = engine.ctx;
    this.overlay  = document.getElementById('challenge-overlay');
    this.audio    = engine.audio;

    this._startTime   = null;
    this._endTime     = null;
    this._attempts    = 0;
    this._correct     = false;
    this._hintUsed    = false;
    this._resolved    = false;
    this._onComplete  = null;
    this._timerId     = null;
    this._animId      = null;
  }

  // ── Lifecycle hooks (override in subclass) ────
  /** Called once before start(). Sets up canvas / overlay DOM. */
  setup() {}

  /** Called to begin the challenge. Starts timer. */
  start() {
    this._startTime = performance.now();
  }

  /** Called when player provides input. */
  onInput(value) {}

  /** Called to provide a hint. */
  hint() {
    this._hintUsed = true;
    this.audio?.playHint();
  }

  /** Called when challenge ends (correct or timeout). */
  teardown() {
    this._stopTimer();
    this._stopAnim();
    this.clearOverlay();
  }

  // ── Completion ────────────────────────────────
  /**
   * Register a callback for when the challenge is resolved.
   * @param {function} cb  Called with (metrics)
   */
  onComplete(cb) { this._onComplete = cb; }

  /** Resolve the challenge as correct or incorrect */
  resolve(correct, responseTime = null) {
    if (this._resolved) return;
    this._resolved = true;
    this._correct  = correct;
    this._endTime  = performance.now();
    const rt = responseTime ?? (this._endTime - this._startTime) / 1000;

    const { calcScore } = this._getScoreModule();
    const score = calcScore({
      correct,
      difficulty:    this.data.difficulty,
      responseTime:  rt,
      timeLimitSec:  this.data.timeLimitSec,
      attempts:      this._attempts,
      hintUsed:      this._hintUsed
    });

    const metrics = {
      category:     this.data.category,
      difficulty:   this.data.difficulty,
      correct,
      score,
      attempts:     this._attempts,
      responseTime: Math.round(rt * 100) / 100,
      hintUsed:     this._hintUsed,
      totalTime:    Math.round((this._endTime - this._startTime) / 10) / 100
    };

    this.teardown();
    if (this._onComplete) this._onComplete(metrics);
  }

  // ── Canvas helpers ────────────────────────────
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  fillBackground(color = '#06060f') {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  clearOverlay() {
    if (this.overlay) {
      this.overlay.innerHTML = '';
      this.overlay.className = '';
    }
  }

  setOverlayInteractive(on = true) {
    if (this.overlay) {
      this.overlay.className = on ? 'interactive' : '';
    }
  }

  // ── Timer ─────────────────────────────────────
  startTimer(seconds, onTick, onExpire) {
    let remaining = seconds;
    onTick?.(remaining);
    this._timerId = setInterval(() => {
      remaining--;
      onTick?.(remaining);
      if (remaining <= 5 && remaining > 0) this.audio?.playTick();
      if (remaining <= 0) {
        this._stopTimer();
        if (!this._resolved) onExpire?.();
      }
    }, 1000);
  }

  _stopTimer() {
    if (this._timerId) { clearInterval(this._timerId); this._timerId = null; }
  }

  // ── Animation loop ────────────────────────────
  startAnim(fn) {
    const loop = () => {
      fn();
      this._animId = requestAnimationFrame(loop);
    };
    this._animId = requestAnimationFrame(loop);
  }

  _stopAnim() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
  }

  // ── Private ───────────────────────────────────
  _getScoreModule() {
    // Lazy import workaround (synchronous by the time challenges run)
    return window._MS_SCORE_MODULE || { calcScore: () => 0 };
  }

  _attempt(correct) {
    this._attempts++;
    if (correct) {
      this.audio?.playCorrect();
      this.resolve(true);
    } else {
      this.audio?.playWrong();
    }
  }
}
