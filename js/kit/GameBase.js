/* ═══════════════════════════════════════════════════════════════
   GameBase.js — Abstract base class for all 30 MindShift 3D games
   Every game extends this and implements:
     build(scene, camera)  — create 3D objects, lights, UI
     start(levelParams)    — begin a level
     update(dt)            — per-frame logic
     pause()               — freeze timers, hide cursor
     resume()              — unfreeze
     exit()                — teardown (MUST dispose all resources)
     hint(type)            — handle hint activation

   Reports ONLY via EventBus 'trial:complete' with the standard payload.
   ═══════════════════════════════════════════════════════════════ */

import { EventBus } from '../core/EventBus.js';
import { Tween }    from './TweenLib.js';

/**
 * @typedef {Object} TrialResult
 * @property {string}  game         - game id
 * @property {number}  level        - 1..30
 * @property {string}  skill        - primary cognitive skill
 * @property {number}  difficulty   - D value
 * @property {boolean} correct      - did the player succeed?
 * @property {number}  accuracy     - 0..1 fine-grained accuracy
 * @property {number}  responseTime - seconds taken
 * @property {number}  parTime      - expected seconds for this level
 * @property {number}  attempts     - number of attempts used
 * @property {number}  hintsUsed    - 0..3
 * @property {Object}  extra        - game-specific data
 */

export class GameBase {
  /**
   * @param {Object} config
   * @param {string} config.id          - game id from games.json
   * @param {string} config.name        - display name
   * @param {string} config.skill       - primary skill
   * @param {string[]} config.tags      - secondary tags
   * @param {Object} config.palette     - { primary, secondary, accent }
   */
  constructor(config) {
    this.id       = config.id;
    this.name     = config.name;
    this.skill    = config.skill;
    this.tags     = config.tags || [];
    this.palette  = config.palette || { primary: '#7c3aed', secondary: '#1a1a2e', accent: '#06b6d4' };

    // Runtime state — reset per level
    this.scene    = null;
    this.camera   = null;
    this.level    = 1;
    this.difficulty = 600;
    this.paused   = false;
    this.finished = false;

    // Per-trial counters (MUST be reset in start())
    this._score       = 0;
    this._accuracy    = 0;
    this._correct     = false;
    this._attempts    = 0;
    this._hintsUsed   = 0;
    this._startTime   = 0;
    this._elapsed     = 0;
    this._parTime     = 30;
    this._combo       = 0;
    this._maxCombo    = 0;

    // Disposables tracking
    this._disposables = [];     // Three.js objects to dispose
    this._timeouts    = [];     // setTimeout handles
    this._intervals   = [];     // setInterval handles
    this._rafs        = [];     // requestAnimationFrame handles
    this._listeners   = [];     // { target, event, fn } for removeEventListener
    this._tweens      = [];     // tween instances
    this._eventUnsubs = [];     // EventBus unsubscribe functions
  }

  /* ── Lifecycle (override in subclass) ─────────────────────── */

  /**
   * Create 3D scene content. Called once when entering the game.
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   */
  build(scene, camera) {
    this.scene = scene;
    this.camera = camera;
  }

  /**
   * Start a specific level. Reset all per-trial state here.
   * @param {Object} levelParams - from levels/<gameId>.js
   */
  start(levelParams) {
    this.level      = levelParams.level || 1;
    this.difficulty  = levelParams.difficulty || 600 + 30 * (this.level - 1);
    this._parTime   = levelParams.parTime || 30;
    this.paused     = false;
    this.finished   = false;

    // Reset per-trial counters
    this._score     = 0;
    this._accuracy  = 0;
    this._correct   = false;
    this._attempts  = 0;
    this._hintsUsed = 0;
    this._startTime = performance.now();
    this._elapsed   = 0;
    this._combo     = 0;
    this._maxCombo  = 0;
  }

  /** Per-frame update. dt is in seconds. */
  update(dt) {
    if (this.paused || this.finished) return;
    this._elapsed += dt;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  /**
   * Handle hint activation.
   * @param {'slow_time'|'reveal'|'aria_clue'} type
   */
  hint(type) {
    this._hintsUsed++;
    EventBus.emit('game:hint', { game: this.id, type, hintsUsed: this._hintsUsed });
  }

  /**
   * Teardown — MUST dispose all resources.
   * Subclasses should call super.exit() at the end of their override.
   */
  exit() {
    this.finished = true;
    this.paused = true;

    // Kill tweens
    for (const tw of this._tweens) tw.kill();
    this._tweens.length = 0;

    // Clear timeouts
    for (const id of this._timeouts) clearTimeout(id);
    this._timeouts.length = 0;

    // Clear intervals
    for (const id of this._intervals) clearInterval(id);
    this._intervals.length = 0;

    // Cancel rafs
    for (const id of this._rafs) cancelAnimationFrame(id);
    this._rafs.length = 0;

    // Remove event listeners
    for (const { target, event, fn } of this._listeners) {
      target.removeEventListener(event, fn);
    }
    this._listeners.length = 0;

    // Unsubscribe EventBus
    for (const unsub of this._eventUnsubs) unsub();
    this._eventUnsubs.length = 0;

    // Dispose Three.js objects
    for (const obj of this._disposables) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => {
            if (m.map) m.map.dispose();
            if (m.normalMap) m.normalMap.dispose();
            if (m.emissiveMap) m.emissiveMap.dispose();
            m.dispose();
          });
        } else {
          if (obj.material.map) obj.material.map.dispose();
          if (obj.material.normalMap) obj.material.normalMap.dispose();
          if (obj.material.emissiveMap) obj.material.emissiveMap.dispose();
          obj.material.dispose();
        }
      }
      if (obj.parent) obj.parent.remove(obj);
    }
    this._disposables.length = 0;

    // Remove all children we added to scene (tagged)
    if (this.scene) {
      const toRemove = [];
      this.scene.traverse(child => {
        if (child.userData._gameOwner === this.id) toRemove.push(child);
      });
      for (const child of toRemove) {
        if (child.parent) child.parent.remove(child);
      }
    }
  }

  /* ── Helper Methods (use in subclasses) ───────────────────── */

  /** Add a Three.js object to the scene and track for disposal */
  addObject(obj) {
    obj.userData._gameOwner = this.id;
    if (this.scene) this.scene.add(obj);
    this._disposables.push(obj);
    return obj;
  }

  /** Add a child to a parent group and track for disposal */
  addChild(parent, obj) {
    obj.userData._gameOwner = this.id;
    parent.add(obj);
    this._disposables.push(obj);
    return obj;
  }

  /** Safe setTimeout that auto-cleans on exit */
  setTimeout(fn, ms) {
    const id = window.setTimeout(() => {
      const idx = this._timeouts.indexOf(id);
      if (idx >= 0) this._timeouts.splice(idx, 1);
      if (!this.finished) fn();
    }, ms);
    this._timeouts.push(id);
    return id;
  }

  /** Safe setInterval that auto-cleans on exit */
  setInterval(fn, ms) {
    const id = window.setInterval(() => {
      if (!this.finished) fn();
    }, ms);
    this._intervals.push(id);
    return id;
  }

  /** Safe addEventListener that auto-cleans on exit */
  listen(target, event, fn, options) {
    target.addEventListener(event, fn, options);
    this._listeners.push({ target, event, fn });
  }

  /** Safe EventBus subscription that auto-cleans on exit */
  on(event, fn) {
    const unsub = EventBus.on(event, fn);
    this._eventUnsubs.push(unsub);
    return unsub;
  }

  /** Start a tween and track it */
  tween(target, props, duration, easing) {
    const tw = Tween.to(target, props, duration, easing).start();
    this._tweens.push(tw);
    return tw;
  }

  /** Record a correct/incorrect response and update combo */
  recordResponse(correct) {
    this._attempts++;
    if (correct) {
      this._combo++;
      if (this._combo > this._maxCombo) this._maxCombo = this._combo;
      EventBus.emit('game:correct', { game: this.id, combo: this._combo });
    } else {
      this._combo = 0;
      EventBus.emit('game:incorrect', { game: this.id });
    }
  }

  /** Get elapsed time since start() in seconds */
  get elapsedTime() {
    return this._elapsed;
  }

  /** Get remaining time based on parTime */
  get remainingTime() {
    return Math.max(0, this._parTime - this._elapsed);
  }

  /**
   * Complete the trial and emit the standard event.
   * Call this when the level ends (win or timeout).
   */
  completeTrial(correct, accuracy = null) {
    if (this.finished) return;
    this.finished = true;

    const responseTime = this._elapsed;
    const acc = accuracy !== null ? accuracy : (correct ? 1.0 : 0.0);

    /** @type {TrialResult} */
    const result = {
      game:         this.id,
      level:        this.level,
      skill:        this.skill,
      difficulty:   this.difficulty,
      correct:      !!correct,
      accuracy:     parseFloat(acc.toFixed(3)),
      responseTime: parseFloat(responseTime.toFixed(2)),
      parTime:      this._parTime,
      attempts:     this._attempts,
      hintsUsed:    this._hintsUsed,
      combo:        this._maxCombo,
      extra: {}
    };

    EventBus.emit('trial:complete', result);
    return result;
  }

  /**
   * Compute star rating from trial result.
   * Static so it can be called from ResultScreen too.
   */
  static computeStars(result) {
    if (!result.correct) return 0;
    if (result.accuracy >= 0.9 && result.hintsUsed === 0) return 3;
    if (result.accuracy >= 0.8) return 2;
    return 1;
  }
}
