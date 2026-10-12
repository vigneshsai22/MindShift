/* ═══════════════════════════════════════════════════════════════
   TweenLib.js — Lightweight tween engine for MindShift 3D
   No dependencies. Supports easing, chaining, delays, loops.
   Usage:
     Tween.to(mesh.position, { x: 5, y: 2 }, 0.6, 'easeOutBack')
           .delay(0.2)
           .onComplete(() => ...)
           .start();
   Call Tween.update(dt) every frame.
   ═══════════════════════════════════════════════════════════════ */

const _active = [];
let _idCounter = 0;

/* ── Easing Functions ─────────────────────────────────────────── */
const Ease = {
  linear:       t => t,
  easeInQuad:   t => t * t,
  easeOutQuad:  t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic:  t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInQuart:  t => t * t * t * t,
  easeOutQuart: t => 1 - (--t) * t * t * t,
  easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  easeOutBack:  t => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  easeInBack:   t => { const c1 = 1.70158; const c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
  easeOutElastic: t => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
  },
  easeInElastic: t => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI / 3));
  },
  easeOutBounce: t => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  easeInOutBack: t => {
    const c1 = 1.70158, c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
};

class TweenInstance {
  constructor(target, props, duration, easing) {
    this._id = ++_idCounter;
    this._target = target;
    this._props = props;
    this._duration = Math.max(0.001, duration);
    this._easeFn = typeof easing === 'function' ? easing : (Ease[easing] || Ease.easeOutCubic);
    this._elapsed = 0;
    this._delay = 0;
    this._delayElapsed = 0;
    this._started = false;
    this._complete = false;
    this._killed = false;
    this._startValues = {};
    this._onUpdate = null;
    this._onComplete = null;
    this._onStart = null;
    this._loop = false;
    this._yoyo = false;
    this._yoyoDir = 1;
    this._chain = null;
  }

  delay(seconds) { this._delay = seconds; return this; }
  onUpdate(fn)   { this._onUpdate = fn; return this; }
  onComplete(fn) { this._onComplete = fn; return this; }
  onStart(fn)    { this._onStart = fn; return this; }
  loop(yoyo = false) { this._loop = true; this._yoyo = yoyo; return this; }
  chain(tweenInstance) { this._chain = tweenInstance; return this; }

  start() {
    if (this._killed) return this;
    // Snapshot start values
    for (const key of Object.keys(this._props)) {
      if (this._target[key] !== undefined) {
        this._startValues[key] = this._target[key];
      }
    }
    this._started = false;
    this._complete = false;
    this._elapsed = 0;
    this._delayElapsed = 0;
    _active.push(this);
    return this;
  }

  kill() {
    this._killed = true;
    this._complete = true;
  }

  _update(dt) {
    if (this._killed || this._complete) return true;

    // Handle delay
    if (this._delayElapsed < this._delay) {
      this._delayElapsed += dt;
      return false;
    }

    // Fire onStart once
    if (!this._started) {
      this._started = true;
      // Re-snapshot in case values changed during delay
      for (const key of Object.keys(this._props)) {
        if (this._target[key] !== undefined) {
          this._startValues[key] = this._target[key];
        }
      }
      if (this._onStart) this._onStart();
    }

    this._elapsed += dt;
    let t = Math.min(1, this._elapsed / this._duration);
    const easedT = this._yoyoDir === -1 ? this._easeFn(1 - t) : this._easeFn(t);

    // Apply interpolated values
    for (const [key, endVal] of Object.entries(this._props)) {
      const startVal = this._startValues[key];
      if (startVal === undefined) continue;
      this._target[key] = startVal + (endVal - startVal) * easedT;
    }

    if (this._onUpdate) this._onUpdate(easedT);

    if (t >= 1) {
      if (this._loop) {
        this._elapsed = 0;
        if (this._yoyo) {
          this._yoyoDir *= -1;
          // Swap start and end for yoyo
          for (const key of Object.keys(this._props)) {
            const tmp = this._startValues[key];
            this._startValues[key] = this._props[key];
            this._props[key] = tmp;
          }
        } else {
          // Reset values to start
          for (const key of Object.keys(this._props)) {
            this._target[key] = this._startValues[key];
          }
        }
        return false;
      }

      // Snap to final values
      for (const [key, endVal] of Object.entries(this._props)) {
        this._target[key] = endVal;
      }
      this._complete = true;
      if (this._onComplete) this._onComplete();
      if (this._chain) this._chain.start();
      return true;
    }
    return false;
  }
}

/* ── Public API ────────────────────────────────────────────────── */
export const Tween = {
  /** Create and return (but don't start) a tween */
  to(target, props, duration = 0.5, easing = 'easeOutCubic') {
    return new TweenInstance(target, { ...props }, duration, easing);
  },

  /** Create, start and return a tween */
  run(target, props, duration = 0.5, easing = 'easeOutCubic') {
    return new TweenInstance(target, { ...props }, duration, easing).start();
  },

  /** Call every frame with delta time in seconds */
  update(dt) {
    for (let i = _active.length - 1; i >= 0; i--) {
      if (_active[i]._update(dt)) {
        _active.splice(i, 1);
      }
    }
  },

  /** Kill all active tweens */
  killAll() {
    for (const tw of _active) tw._killed = true;
    _active.length = 0;
  },

  /** Kill all tweens targeting a specific object */
  killTarget(target) {
    for (let i = _active.length - 1; i >= 0; i--) {
      if (_active[i]._target === target) {
        _active[i]._killed = true;
        _active.splice(i, 1);
      }
    }
  },

  /** Number of active tweens */
  get count() { return _active.length; },

  /** Direct access to easing functions */
  Ease,

  /** Promise-based helper */
  async promise(target, props, duration = 0.5, easing = 'easeOutCubic') {
    return new Promise(resolve => {
      new TweenInstance(target, { ...props }, duration, easing)
        .onComplete(resolve)
        .start();
    });
  },

  /** Delay helper — returns a promise that resolves after seconds */
  wait(seconds) {
    return new Promise(resolve => {
      const dummy = { _v: 0 };
      new TweenInstance(dummy, { _v: 1 }, seconds, 'linear')
        .onComplete(resolve)
        .start();
    });
  },
};
