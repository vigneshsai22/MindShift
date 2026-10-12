/* ═══════════════════════════════════════════════
   MindShift — GameScreen
   Orchestrates the active gameplay loop
   ═══════════════════════════════════════════════ */
import { getChallenge, getIQChallenge } from '../data/challengePool.js';
import { CHALLENGE_CLASSES } from '../engine/GameEngine.js';

// Classic categories
const CLASSIC_CATEGORIES = ['logical','pattern','memory','visual','reaction','audio'];
// IQ categories
const IQ_CATEGORIES = ['iq-number','iq-pattern','iq-matrix','iq-odd','iq-spatial','iq-logic','iq-memory'];


const TOTAL_CHALLENGES = 10;

export class GameScreen {
  constructor(engine) {
    this.engine          = engine;
    this.el              = document.getElementById('game-screen');
    this._currentChallenge = null;
    this._challengeIdx   = 0;
    this._patternStreak  = 0;
  }

  show({ difficulty = 3 } = {}) {
    this.el.classList.add('active');

    // Init engine subsystems
    this.engine.adaptive.reset();
    this.engine.adaptive.setDifficulty(difficulty);
    this.engine.session.start(difficulty);
    this.engine.sessionMeta = {};
    this._challengeIdx = 0;
    this._patternStreak = 0;

    // Resize canvas
    this._resizeCanvas();

    // Init HUD
    this.engine.hud.reset(TOTAL_CHALLENGES, 3);

    // Bind hint & audio toggle
    const hintBtn = document.getElementById('btn-hint');
    if (hintBtn) hintBtn.onclick = () => this._useHint();
    const audioBtn = document.getElementById('btn-audio-toggle');
    if (audioBtn) audioBtn.onclick = () => {
      const muted = this.engine.audio.toggle();
      audioBtn.textContent = muted ? '🔇 Audio' : '🔊 Audio';
    };
    const backBtn = document.getElementById('btn-game-back');
    if (backBtn) backBtn.onclick = () => {
      this.engine.audio?.playClick();
      this.hide();
      this.engine.navigate('difficulty-select');
    };

    // Start ambient music
    this.engine.audio.startAmbient();

    // Begin first challenge
    this._nextChallenge();
  }

  hide() {
    this._teardownCurrent();
    this.engine.audio.stopAmbient();
    this.el.classList.remove('active');
    this.el.classList.add('exiting');
    setTimeout(() => this.el.classList.remove('exiting'), 400);
  }

  // ── Canvas ────────────────────────────────────
  _resizeCanvas() {
    const canvas = this.engine.canvas;
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper || !canvas) return;
    canvas.width  = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
  }

  // ── Challenge Loop ────────────────────────────
  _nextChallenge() {
    if (this._challengeIdx >= TOTAL_CHALLENGES) {
      this._endSession();
      return;
    }

    this._challengeIdx++;

    // Adaptive selection — route by mode
    const mode = this.engine.currentMode || 'classic';
    const difficulty = this.engine.adaptive.getDifficulty();
    let category, data;

    if (mode === 'iq') {
      category = this.engine.adaptive.nextIQCategory();
      data = getIQChallenge(category, difficulty);
    } else if (mode === 'mixed') {
      category = this.engine.adaptive.nextMixedCategory();
      data = category.startsWith('iq-') ? getIQChallenge(category, difficulty) : getChallenge(category, difficulty);
    } else {
      category = this.engine.adaptive.nextCategory();
      data = getChallenge(category, difficulty);
    }


    // Update HUD
    this.engine.hud.setCategory(category);
    this.engine.hud.setChallengeNumber(this._challengeIdx, TOTAL_CHALLENGES);

    // Instantiate and start challenge
    const ChallengeClass = CHALLENGE_CLASSES[category];
    if (!ChallengeClass) { this._nextChallenge(); return; }

    this._currentChallenge = new ChallengeClass(data, this.engine);
    this._currentChallenge.onComplete((metrics) => this._onChallengeComplete(metrics));
    this._currentChallenge.setup();
    this._currentChallenge.start();
  }

  _teardownCurrent() {
    if (this._currentChallenge) {
      try { this._currentChallenge.teardown(); } catch(e) {}
      this._currentChallenge = null;
    }
  }

  _onChallengeComplete(metrics) {
    // Adaptive update
    this.engine.adaptive.update({
      category:     metrics.category,
      correct:      metrics.correct,
      responseTime: metrics.responseTime,
      attempts:     metrics.attempts
    });

    // Session record
    this.engine.session.record(metrics);

    // HUD updates
    this.engine.hud.addScore(metrics.score);
    this.engine.hud.setStreak(this.engine.session.currentStreak);
    this.engine.hud.markDot(this._challengeIdx - 1, metrics.correct);

    // Pattern streak tracking
    if (metrics.category === 'pattern' && metrics.correct) {
      this._patternStreak++;
      this.engine.sessionMeta.patternStreak = Math.max(this.engine.sessionMeta.patternStreak||0, this._patternStreak);
    } else if (metrics.category === 'pattern') {
      this._patternStreak = 0;
    }

    // Streak sound
    if (this.engine.session.currentStreak > 0 && this.engine.session.currentStreak % 3 === 0) {
      this.engine.audio.playStreak();
      this.engine.hud.toast(`🔥 ${this.engine.session.currentStreak}× Streak!`, 'success');
    }

    // Navigate to per-challenge results
    this.hide();
    this.engine.navigate('results', {
      metrics,
      challengeIdx:  this._challengeIdx,
      total:         TOTAL_CHALLENGES,
      adaptiveMsg:   this.engine.adaptive.getAdaptiveMessage(metrics.correct),
      streak:        this.engine.session.currentStreak,
      isLast:        this._challengeIdx >= TOTAL_CHALLENGES
    });
  }

  // ── Continue from results ─────────────────────
  continueGame() {
    this.el.classList.add('active');
    this._resizeCanvas();
    this.engine.audio.startAmbient();
    this._nextChallenge();
  }

  // ── Hint ──────────────────────────────────────
  _useHint() {
    if (!this.engine.hud.consumeHint()) {
      this.engine.hud.toast('No hints remaining!', 'error');
      return;
    }
    if (this._currentChallenge) {
      this._currentChallenge._hintUsed = true;
      this._currentChallenge.hint();
      this.engine.hud.toast('💡 Hint used (-30 pts)', '');
    }
  }

  // ── End Session ───────────────────────────────
  _endSession() {
    const summary = this.engine.session.getSummary();
    this.engine.profiles.saveSession(this.engine.currentPlayer.id, summary);
    this.hide();
    this.engine.navigate('analytics', { summary });
  }
}
