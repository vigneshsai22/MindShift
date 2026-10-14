/* ═══════════════════════════════════════════════════════════════
   GameBase.js — Abstract base class for all MindShift 3D games
   Mission Architecture:
     Level = N Rounds (5 at Lv 1 -> 10 at Lv 30)
     Lives: 3 per level (wrong/timed-out round costs 1 life)
     Win condition: >= 60% rounds correct AND >= 1 life left
     Duration: 45–75s (Lv 1–10), 60–100s (Lv 11–20), 75–120s (Lv 21–30)
     Reports ONCE PER LEVEL via 'trial:complete'
     Emits 'round:complete' per round for fine-grained telemetry
   ═══════════════════════════════════════════════════════════════ */

import { EventBus } from '../core/EventBus.js';
import { Tween }    from './TweenLib.js';

/**
 * @typedef {Object} TrialResult
 * @property {string}  game         - game id
 * @property {number}  level        - 0..30
 * @property {string}  skill        - primary cognitive skill
 * @property {number}  difficulty   - D value
 * @property {boolean} correct      - did the player succeed?
 * @property {number}  accuracy     - 0..1 fine-grained accuracy
 * @property {number}  responseTime - mean seconds per round
 * @property {number}  parTime      - expected seconds for this level
 * @property {number}  attempts     - number of round attempts
 * @property {number}  hintsUsed    - 0..3
 * @property {Object}  extra        - rounds, correctRounds, livesLost, durationSec, idleTime
 */

export class GameBase {
  /**
   * @param {Object} config
   * @param {string} config.id          - game id from games.json
   * @param {string} config.name        - display name
   * @param {string} config.skill       - primary skill
   * @param {string[]} config.tags      - secondary tags
   * @param {Object} config.palette     - { primary, secondary, accent }
   * @param {string} config.goalText    - one-sentence goal description
   */
  constructor(config) {
    this.id       = config.id;
    this.name     = config.name;
    this.skill    = config.skill;
    this.tags     = config.tags || [];
    this.palette  = config.palette || { primary: '#7c3aed', secondary: '#1a1a2e', accent: '#06b6d4' };
    this.goalText = config.goalText || 'Complete the cognitive challenge sequence.';

    // Runtime state — reset per level
    this.scene    = null;
    this.camera   = null;
    this.level    = 1;
    this.difficulty = 600;
    this.paused   = false;
    this.finished = false;
    this.isPractice = false;

    // Multi-Round Mission Architecture
    this.totalRounds    = 5;
    this.currentRound   = 0;
    this.maxLives       = 3;
    this.lives          = 3;
    this.correctRounds  = 0;
    this.livesLost      = 0;
    this.roundResults   = [];
    this.roundTimeLimit = 14;
    this.roundElapsed   = 0;
    this.roundStartTime = 0;
    this.roundActive    = false;
    this.transitioning  = false;

    // Per-trial metrics
    this._score         = 0;
    this._accuracy      = 0;
    this._correct       = false;
    this._attempts      = 0;
    this._hintsUsed     = 0;
    this._startTime     = 0;
    this._elapsed       = 0;
    this._parTime       = 55;
    this._combo         = 0;
    this._maxCombo      = 0;

    // Telemetry & idle time
    this.levelStartTime = 0;
    this.lastInputTime  = 0;
    this.idleTime       = 0;
    this.levelParams    = null;

    // Disposables tracking
    this._disposables = [];     // Three.js objects to dispose
    this._timeouts    = [];     // setTimeout handles
    this._intervals   = [];     // setInterval handles
    this._rafs        = [];     // requestAnimationFrame handles
    this._listeners   = [];     // { target, event, fn } for removeEventListener
    this._tweens      = [];     // tween instances
    this._eventUnsubs = [];     // EventBus unsubscribe functions

    // InputManager integration
    this.inputManager = window.__inputManager || null;
    this._registeredTargetIds = [];
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
    this.inputManager = window.__inputManager || null;
    if (this.inputManager) {
      this.inputManager.setCamera(camera);
      this.inputManager.setScene(scene);
    }
  }

  /**
   * Start a specific level. Initializes the round mission.
   * @param {Object} levelParams - from levels/<gameId>.js
   */
  start(levelParams = {}) {
    this.levelParams = levelParams;
    this.level       = (levelParams.level !== undefined) ? levelParams.level : 1;
    this.isPractice  = (this.level === 0 || !!levelParams.isPractice);
    this.difficulty  = levelParams.difficulty || (600 + 30 * Math.max(0, this.level - 1));

    // Multi-round configuration
    if (this.isPractice) {
      this.totalRounds = 1;
      this.maxLives    = 99;
    } else {
      this.totalRounds = levelParams.rounds || Math.min(10, Math.floor(5 + (this.level - 1) * (5 / 29)));
      this.maxLives    = levelParams.lives || 3;
    }

    this.lives         = this.maxLives;
    this.correctRounds = 0;
    this.livesLost     = 0;
    this.roundResults  = [];
    this.currentRound  = 0;
    this.roundActive   = false;
    this.transitioning = false;
    this.paused        = false;
    this.finished      = false;

    // Telemetry tracking
    const now           = performance.now();
    this._startTime     = now;
    this.levelStartTime = now;
    this.lastInputTime  = now;
    this.idleTime       = 0;
    this._elapsed       = 0;
    this._score         = 0;
    this._accuracy      = 0;
    this._correct       = false;
    this._attempts      = 0;
    this._hintsUsed     = 0;
    this._combo         = 0;
    this._maxCombo      = 0;

    // Par time scaled to rounds
    this._parTime = levelParams.parTime || Math.round(this.totalRounds * 11);

    // Initial HUD broadcasts
    EventBus.emit('hud:goal', { goal: this.goalText, game: this.id });
    EventBus.emit('hud:round', {
      current: 1,
      total: this.totalRounds,
      lives: this.lives,
      maxLives: this.maxLives,
      isPractice: this.isPractice
    });

    // Start first round
    this.startRound(1);
  }

  /**
   * Start a round within the level.
   * @param {number} roundIndex - 1..totalRounds
   */
  startRound(roundIndex) {
    if (this.finished) return;
    this.currentRound   = roundIndex;
    this.roundElapsed   = 0;
    this.roundStartTime = performance.now();
    this.roundActive    = true;
    this.transitioning  = false;

    // Within-level difficulty ramp: 0.0 on round 1 -> 1.0 on round N
    const ramp = (this.totalRounds > 1) ? ((roundIndex - 1) / (this.totalRounds - 1)) : 0;

    // Round countdown limit with accessibility extra-time multiplier
    const extraMultiplier = (window.__extraTime ? 1.5 : 1.0);
    const baseRoundTime = this.levelParams?.perRoundTime || Math.max(10, 14 - Math.floor((this.level - 1) * 0.12));
    this.roundTimeLimit = baseRoundTime * extraMultiplier;

    // Telemetry update to HUD
    EventBus.emit('hud:round', {
      current: this.currentRound,
      total: this.totalRounds,
      lives: this.lives,
      maxLives: this.maxLives,
      isPractice: this.isPractice
    });
    EventBus.emit('hud:timer', { remaining: this.roundTimeLimit, total: this.roundTimeLimit });

    // Subclass round initialization hook
    if (typeof this.setupRound === 'function') {
      this.setupRound(this.currentRound, ramp, this.levelParams);
    }
  }

  /**
   * Conclude a round. Evaluates lives, awards score, and transitions.
   * @param {boolean} correct - whether player completed this round correctly
   * @param {string}  [reason=''] - failure explanation if not correct
   */
  endRound(correct, reason = '') {
    if (!this.roundActive || this.transitioning || this.finished) return;
    this.roundActive   = false;
    this.transitioning = true;

    const roundDuration = (performance.now() - this.roundStartTime) / 1000;
    this._attempts++;

    if (correct) {
      this.correctRounds++;
      this._combo++;
      if (this._combo > this._maxCombo) this._maxCombo = this._combo;

      const timeBonus = Math.floor(Math.max(0, this.roundTimeLimit - roundDuration) * 12);
      const scoreAdd = 120 + timeBonus;
      this._score += scoreAdd;

      EventBus.emit('game:correct', { game: this.id, combo: this._combo, scoreAdd });
      EventBus.emit('hud:popup', {
        text: `✓ Round ${this.currentRound} Correct! +${scoreAdd}`,
        color: '#00f2fe'
      });
      EventBus.emit('round:complete', {
        game: this.id,
        round: this.currentRound,
        totalRounds: this.totalRounds,
        correct: true,
        responseTime: roundDuration,
        score: this._score
      });
    } else {
      this._combo = 0;
      if (!this.isPractice) {
        this.lives = Math.max(0, this.lives - 1);
        this.livesLost++;
      }
      const failReason = reason || 'Incorrect Response';
      EventBus.emit('game:incorrect', { game: this.id, reason: failReason });
      EventBus.emit('hud:popup', {
        text: this.isPractice ? `Practice hint: ${failReason}` : `✗ ${failReason} (-1 Life)`,
        color: '#ef4444'
      });
      EventBus.emit('round:complete', {
        game: this.id,
        round: this.currentRound,
        totalRounds: this.totalRounds,
        correct: false,
        responseTime: roundDuration,
        reason: failReason,
        livesRemaining: this.lives
      });
    }

    this.roundResults.push({
      round: this.currentRound,
      correct: !!correct,
      responseTime: parseFloat(roundDuration.toFixed(2)),
      reason: correct ? '' : (reason || 'Incorrect')
    });

    // Update HUD round display
    EventBus.emit('hud:round', {
      current: this.currentRound,
      total: this.totalRounds,
      lives: this.lives,
      maxLives: this.maxLives,
      isPractice: this.isPractice
    });

    // Subclass teardown hook
    if (typeof this.teardownRound === 'function') {
      try { this.teardownRound(correct, reason); } catch (e) { console.warn('teardownRound error:', e); }
    }

    // Pacing: 0.75s–0.9s transition between rounds
    this.setTimeout(() => {
      if (this.finished) return;

      if (!this.isPractice && this.lives <= 0) {
        this.failLevel('Out of lives! Neural synchrony degraded.');
      } else if (this.currentRound >= this.totalRounds) {
        this.finishLevel();
      } else {
        this.startRound(this.currentRound + 1);
      }
    }, 850);
  }

  /** Finish the mission when all rounds complete. Evaluates win criteria. */
  finishLevel() {
    if (this.finished) return;
    const accuracy = this.totalRounds > 0 ? (this.correctRounds / this.totalRounds) : 0;
    // Win condition: >= 60% accuracy AND >= 1 life left (or practice)
    const isWin = this.isPractice || (accuracy >= 0.60 && this.lives >= 1);
    const totalDuration = (performance.now() - this.levelStartTime) / 1000;
    const meanResponseTime = this.roundResults.length > 0
      ? (this.roundResults.reduce((s, r) => s + r.responseTime, 0) / this.roundResults.length)
      : totalDuration;

    this.completeTrial(isWin, accuracy, {
      rounds:        this.totalRounds,
      correctRounds: this.correctRounds,
      livesLost:     this.livesLost,
      livesRemaining:this.lives,
      durationSec:   parseFloat(totalDuration.toFixed(2)),
      idleTime:      parseFloat(this.idleTime.toFixed(2)),
      roundResults:  this.roundResults
    });
  }

  /** Fail the mission if lives are depleted. */
  failLevel(reason = 'Mission Failed') {
    if (this.finished) return;
    const accuracy = this.totalRounds > 0 ? (this.correctRounds / this.totalRounds) : 0;
    const totalDuration = (performance.now() - this.levelStartTime) / 1000;
    const meanResponseTime = this.roundResults.length > 0
      ? (this.roundResults.reduce((s, r) => s + r.responseTime, 0) / this.roundResults.length)
      : totalDuration;

    this.completeTrial(false, accuracy, {
      rounds:        this.totalRounds,
      correctRounds: this.correctRounds,
      livesLost:     this.livesLost,
      livesRemaining:this.lives,
      durationSec:   parseFloat(totalDuration.toFixed(2)),
      idleTime:      parseFloat(this.idleTime.toFixed(2)),
      failReason:    reason,
      roundResults:  this.roundResults
    });
  }

  /** Record player interaction to keep idle timer reset */
  registerPlayerAction() {
    this.lastInputTime = performance.now();
  }

  /** Per-frame update. dt is in seconds. */
  update(dt) {
    if (this.paused || this.finished) return;
    this._elapsed += dt;

    // Track idle time if no input for > 3.0 seconds
    const secSinceAction = (performance.now() - this.lastInputTime) / 1000;
    if (secSinceAction > 3.0) {
      this.idleTime += dt;
    }

    // Per-round countdown timer
    if (this.roundActive && !this.transitioning) {
      this.roundElapsed += dt;
      const remaining = Math.max(0, this.roundTimeLimit - this.roundElapsed);
      EventBus.emit('hud:timer', { remaining, total: this.roundTimeLimit });

      if (this.roundElapsed >= this.roundTimeLimit) {
        this.endRound(false, 'Time ran out!');
      }
    }
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.lastInputTime = performance.now();
  }

  /**
   * Handle hint activation.
   * @param {'slow_time'|'reveal'|'aria_clue'} type
   */
  hint(type) {
    this.registerPlayerAction();
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
    this.roundActive = false;

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

    // Remove all children tagged with this game
    if (this.scene) {
      const toRemove = [];
      this.scene.traverse(child => {
        if (child.userData._gameOwner === this.id) toRemove.push(child);
      });
      for (const child of toRemove) {
        if (child.parent) child.parent.remove(child);
      }
    }

    // Unregister interactive targets from InputManager
    if (this.inputManager) {
      for (const tId of this._registeredTargetIds) {
        this.inputManager.unregisterTarget(tId);
      }
      this._registeredTargetIds.length = 0;
      this.inputManager.setDragHandler(null);
    }
  }

  /* ── Helper Methods ───────────────────────────────────────── */

  registerTarget(id, object, handlers = {}) {
    if (!this.inputManager) {
      this.inputManager = window.__inputManager || null;
    }
    if (this.inputManager) {
      const wrappedHandlers = { ...handlers };
      if (handlers.onPress) {
        wrappedHandlers.onPress = (...args) => {
          this.registerPlayerAction();
          handlers.onPress(...args);
        };
      }
      if (handlers.onClick) {
        wrappedHandlers.onClick = (...args) => {
          this.registerPlayerAction();
          handlers.onClick(...args);
        };
      }
      if (handlers.onHover) {
        wrappedHandlers.onHover = (...args) => {
          this.registerPlayerAction();
          handlers.onHover(...args);
        };
      }
      this.inputManager.registerTarget(id, object, wrappedHandlers);
      this._registeredTargetIds.push(id);
    }
    return object;
  }

  createHitProxy(object, opts = {}) {
    if (!this.inputManager) {
      this.inputManager = window.__inputManager || null;
    }
    return this.inputManager?.createHitProxy(object, opts);
  }

  addObject(obj) {
    obj.userData._gameOwner = this.id;
    if (this.scene) this.scene.add(obj);
    this._disposables.push(obj);
    return obj;
  }

  addChild(parent, obj) {
    obj.userData._gameOwner = this.id;
    parent.add(obj);
    this._disposables.push(obj);
    return obj;
  }

  setTimeout(fn, ms) {
    const id = window.setTimeout(() => {
      const idx = this._timeouts.indexOf(id);
      if (idx >= 0) this._timeouts.splice(idx, 1);
      if (!this.finished) fn();
    }, ms);
    this._timeouts.push(id);
    return id;
  }

  setInterval(fn, ms) {
    const id = window.setInterval(() => {
      if (!this.finished) fn();
    }, ms);
    this._intervals.push(id);
    return id;
  }

  listen(target, event, fn, options) {
    const wrapped = (e) => {
      this.registerPlayerAction();
      fn(e);
    };
    target.addEventListener(event, wrapped, options);
    this._listeners.push({ target, event, fn: wrapped });
  }

  on(event, fn) {
    const unsub = EventBus.on(event, fn);
    this._eventUnsubs.push(unsub);
    return unsub;
  }

  tween(target, props, duration, easing) {
    const tw = Tween.to(target, props, duration, easing).start();
    this._tweens.push(tw);
    return tw;
  }

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

  get elapsedTime() {
    return (performance.now() - this.levelStartTime) / 1000;
  }

  get remainingTime() {
    return Math.max(0, this.roundTimeLimit - this.roundElapsed);
  }

  /**
   * Complete the trial and emit the standard event.
   * Call this when the level ends (win or timeout/failure).
   */
  completeTrial(correct, accuracy = null, extra = {}) {
    if (this.finished && this._alreadyEmittedTrial) return;
    this.finished = true;
    this._alreadyEmittedTrial = true;

    const totalDuration = (performance.now() - this.levelStartTime) / 1000;
    const acc = accuracy !== null ? accuracy : (correct ? 1.0 : 0.0);
    this._correct = !!correct;
    this._accuracy = parseFloat(acc.toFixed(3));
    this._elapsed = totalDuration;
    const meanResponseTime = this.roundResults.length > 0
      ? (this.roundResults.reduce((s, r) => s + r.responseTime, 0) / this.roundResults.length)
      : totalDuration;

    /** @type {TrialResult} */
    const result = {
      game:         this.id,
      level:        this.level,
      skill:        this.skill,
      difficulty:   this.difficulty,
      correct:      !!correct,
      accuracy:     parseFloat(acc.toFixed(3)),
      responseTime: parseFloat(meanResponseTime.toFixed(2)),
      parTime:      this._parTime,
      attempts:     this._attempts,
      hintsUsed:    this._hintsUsed,
      combo:        this._maxCombo,
      extra: {
        rounds:        this.totalRounds,
        correctRounds: this.correctRounds,
        livesLost:     this.livesLost,
        durationSec:   parseFloat(totalDuration.toFixed(2)),
        idleTime:      parseFloat(this.idleTime.toFixed(2)),
        ...extra
      }
    };

    EventBus.emit('trial:complete', result);
    return result;
  }

  /**
   * Compute star rating from trial result.
   */
  static computeStars(result) {
    if (!result.correct) return 0;
    if (result.accuracy >= 0.9 && result.hintsUsed === 0) return 3;
    if (result.accuracy >= 0.8) return 2;
    return 1;
  }
}
