/* ═══════════════════════════════════════════════════════════════
   TimerBar.js — Visual countdown timer bar for the HUD
   Creates an HTML overlay bar with animated countdown.
   Supports pause, resume, time bonuses, and warning pulses.
   ═══════════════════════════════════════════════════════════════ */

import { EventBus } from '../core/EventBus.js';

export class TimerBar {
  /**
   * @param {Object} opts
   * @param {number} opts.duration   - total time in seconds
   * @param {string} [opts.color='#06b6d4']
   * @param {string} [opts.warnColor='#f44336']
   * @param {number} [opts.warnAt=0.25] - fraction at which to start warning
   */
  constructor(opts = {}) {
    this.duration  = opts.duration || 30;
    this.color     = opts.color || '#06b6d4';
    this.warnColor = opts.warnColor || '#f44336';
    this.warnAt    = opts.warnAt || 0.25;

    this._remaining = this.duration;
    this._running   = false;
    this._warned    = false;
    this._onExpire  = null;
    this._onTick    = null;
  }

  onExpire(fn) { this._onExpire = fn; return this; }
  onTick(fn)   { this._onTick = fn; return this; }

  /** Start the timer */
  start() {
    this._remaining = this.duration;
    this._running = true;
    this._warned = false;
    return this;
  }

  /** Pause */
  pause() { this._running = false; }

  /** Resume */
  resume() { this._running = true; }

  /** Reset with optional new duration */
  reset(newDuration = null) {
    if (newDuration !== null) this.duration = newDuration;
    this._remaining = this.duration;
    this._running = false;
    this._warned = false;
  }

  /** Add bonus time */
  addTime(seconds) {
    this._remaining = Math.min(this.duration, this._remaining + seconds);
  }

  /** Subtract time (penalty) */
  subtractTime(seconds) {
    this._remaining = Math.max(0, this._remaining - seconds);
  }

  /**
   * Update — call every frame with dt in seconds
   * @returns {{ remaining: number, fraction: number, expired: boolean }}
   */
  update(dt) {
    if (!this._running) return this.getState();

    this._remaining -= dt;

    // Warning check
    if (!this._warned && this._remaining / this.duration <= this.warnAt) {
      this._warned = true;
      EventBus.emit('timer:warning', { remaining: this._remaining });
    }

    if (this._onTick) this._onTick(this._remaining, this.fraction);

    if (this._remaining <= 0) {
      this._remaining = 0;
      this._running = false;
      if (this._onExpire) this._onExpire();
      EventBus.emit('timer:expire', {});
      return { remaining: 0, fraction: 0, expired: true };
    }

    return this.getState();
  }

  get remaining() { return this._remaining; }
  get fraction() { return Math.max(0, this._remaining / this.duration); }
  get isRunning() { return this._running; }

  getState() {
    return {
      remaining: this._remaining,
      fraction: this.fraction,
      expired: this._remaining <= 0,
      warned: this._warned,
    };
  }

  /** Get display string "MM:SS" or "SS.s" */
  getDisplay() {
    const s = Math.max(0, this._remaining);
    if (s >= 60) {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m}:${sec.toString().padStart(2, '0')}`;
    }
    return s.toFixed(1);
  }

  /** Get the current bar color based on state */
  getCurrentColor() {
    return this._warned ? this.warnColor : this.color;
  }
}
