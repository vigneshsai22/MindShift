/* ═══════════════════════════════════════════════════════════════
   ResultScreen3D.js — 3D Trial / Level Complete Results Overlay
   Displays stars earned (1-3), score breakdown, Elo delta,
   accuracy, response time vs par, and action buttons.
   ═══════════════════════════════════════════════════════════════ */

import { EventBus } from '../core/EventBus.js';
import { SFXLib }   from '../audio/SFXLib.js';

export class ResultScreen3D {
  constructor() {
    this._container = null;
    this._built = false;
    this._visible = false;
    this._onNext = null;
    this._onRetry = null;
    this._onCatalogue = null;
  }

  build() {
    if (this._built && this._container && document.body.contains(this._container)) return;
    const existing = document.getElementById('result-screen-3d');
    if (existing) existing.remove();
    this._built = true;

    const el = document.createElement('div');
    el.id = 'result-screen-3d';
    el.className = 'result-overlay-3d';
    el.style.display = 'none';

    el.innerHTML = `
      <div class="result-card-3d">
        <div class="result-header">
          <div class="result-badge" id="res-badge">TRIAL COMPLETE</div>
          <h2 class="result-title" id="res-title">Lumen Pond — Level 1</h2>
        </div>

        <div class="result-stars" id="res-stars">
          <span class="star" data-index="1">⭐</span>
          <span class="star" data-index="2">⭐</span>
          <span class="star" data-index="3">⭐</span>
        </div>

        <div class="result-breakdown" id="res-breakdown">
          <span class="res-breakdown-pill" id="res-rounds-pill">5 / 5 Rounds Correct</span>
          <span class="res-breakdown-pill" id="res-lives-pill">3 Lives Left ❤️</span>
        </div>

        <div class="result-metrics">
          <div class="res-metric-item">
            <span class="res-metric-label">SCORE</span>
            <span class="res-metric-val" id="res-score">1,450</span>
          </div>
          <div class="res-metric-item">
            <span class="res-metric-label">ACCURACY</span>
            <span class="res-metric-val" id="res-accuracy">100%</span>
          </div>
          <div class="res-metric-item">
            <span class="res-metric-label">TIME</span>
            <span class="res-metric-val" id="res-time">12.4s</span>
          </div>
          <div class="res-metric-item">
            <span class="res-metric-label">RATING DELTA</span>
            <span class="res-metric-val res-elo-plus" id="res-elo">+24 Elo</span>
          </div>
        </div>

        <div class="result-feedback" id="res-feedback">
          "Synaptic transmission optimal. Neural pathways reinforced."
        </div>

        <div class="result-actions">
          <button class="btn-res secondary" id="res-btn-hub">← Exit to Hub</button>
          <button class="btn-res secondary" id="res-btn-cat">Choose Game (Tab)</button>
          <button class="btn-res secondary" id="res-btn-retry">Retry Level</button>
          <button class="btn-res primary" id="res-btn-next">Next Level ▶</button>
        </div>
      </div>
    `;

    document.body.appendChild(el);
    this._container = el;

    el.querySelector('#res-btn-hub')?.addEventListener('click', () => {
      SFXLib.click?.() || SFXLib.playClick?.();
      this.hide();
      EventBus.emit('game:quit');
    });

    el.querySelector('#res-btn-next').addEventListener('click', () => {
      SFXLib.playClick?.() || SFXLib.click?.();
      this.hide();
      if (this._onNext) this._onNext();
    });

    el.querySelector('#res-btn-retry').addEventListener('click', () => {
      SFXLib.playClick?.() || SFXLib.click?.();
      this.hide();
      if (this._onRetry) this._onRetry();
    });

    el.querySelector('#res-btn-cat').addEventListener('click', () => {
      SFXLib.playClick?.() || SFXLib.click?.();
      this.hide();
      if (this._onCatalogue) this._onCatalogue();
    });
  }

  /**
   * Show trial outcome
   * @param {Object} data
   */
  show(data = {}) {
    this.build();
    this._visible = true;
    this._container.style.display = 'flex';

    this._onNext = data.onNext || null;
    this._onRetry = data.onRetry || null;
    this._onCatalogue = data.onCatalogue || null;

    const {
      gameName = 'Challenge',
      level = 1,
      score = 0,
      accuracy = 1.0,
      responseTime = 10,
      parTime = 15,
      stars = 1,
      eloDelta = 15,
      passed = true,
      isTimeout = false,
      hintsUsed = 0,
      ariaComment = ''
    } = data;

    const timedOut = isTimeout || (!passed && responseTime >= (parTime || 1));

    const titleEl = this._container.querySelector('#res-title');
    const badgeEl = this._container.querySelector('#res-badge');
    const scoreEl = this._container.querySelector('#res-score');
    const accEl   = this._container.querySelector('#res-accuracy');
    const timeEl  = this._container.querySelector('#res-time');
    const eloEl   = this._container.querySelector('#res-elo');
    const feedEl  = this._container.querySelector('#res-feedback');
    const starEls = this._container.querySelectorAll('#res-stars .star');

    if (titleEl) titleEl.textContent = `${gameName} — Level ${level}`;
    const nextBtn = this._container.querySelector('#res-btn-next');
    if (nextBtn) {
      if (!passed || stars === 0) {
        nextBtn.style.display = 'none';
      } else {
        nextBtn.style.display = '';
        if (level < 30) {
          nextBtn.textContent = `Next Level (${level + 1} / 30) ▶`;
        } else {
          nextBtn.textContent = 'All 30 Levels Cleared! 🎉';
        }
      }
    }
    if (badgeEl) {
      badgeEl.textContent = passed ? 'TRIAL COMPLETE' : (timedOut ? 'TIME EXPIRED' : 'TRIAL FAILED');
      badgeEl.style.color = passed ? 'var(--color-accent, #00f2fe)' : '#ff4d4d';
    }

    const rounds = data.rounds || data.extra?.rounds || 5;
    const correctRounds = data.correctRounds !== undefined ? data.correctRounds : (data.extra?.correctRounds !== undefined ? data.extra.correctRounds : Math.round(accuracy * rounds));
    const livesRemaining = data.livesRemaining !== undefined ? data.livesRemaining : (data.extra?.livesRemaining !== undefined ? data.extra.livesRemaining : (passed ? 2 : 0));

    const roundsPill = this._container.querySelector('#res-rounds-pill');
    const livesPill = this._container.querySelector('#res-lives-pill');
    if (roundsPill) roundsPill.textContent = `${correctRounds} / ${rounds} Rounds Correct`;
    if (livesPill) {
      livesPill.textContent = `${livesRemaining} Lives Left ❤️`;
      livesPill.style.color = livesRemaining > 1 ? '#10b981' : (livesRemaining === 1 ? '#f59e0b' : '#ef4444');
    }

    if (scoreEl) scoreEl.textContent = Math.round(score).toLocaleString();
    if (accEl)   accEl.textContent = `${Math.round(accuracy * 100)}%`;
    if (timeEl)  timeEl.textContent = `${responseTime.toFixed(1)}s (Par: ${parTime.toFixed(0)}s)`;

    if (eloEl) {
      if (eloDelta >= 0) {
        eloEl.textContent = `+${Math.round(eloDelta)} Elo`;
        eloEl.className = 'res-metric-val res-elo-plus';
      } else {
        eloEl.textContent = `${Math.round(eloDelta)} Elo`;
        eloEl.className = 'res-metric-val res-elo-minus';
      }
    }

    if (feedEl) {
      feedEl.textContent = ariaComment || (passed
        ? 'Synaptic cohesion reinforced. Response timing within nominal bounds.'
        : (timedOut
            ? 'Neural par-time expired. Pacing recalibration recommended.'
            : 'Cognitive strain detected. ARIA recalibrating baseline parameters.'));
    }

    // Star animations
    starEls.forEach((s, idx) => {
      s.classList.remove('earned', 'empty');
      if (idx < stars) {
        s.classList.add('earned');
      } else {
        s.classList.add('empty');
      }
    });

    try {
      if (passed) {
        SFXLib.levelComplete?.() || SFXLib.playLevelUp?.();
      } else if (timedOut) {
        SFXLib.timerExpire?.() || SFXLib.playTimeout?.() || SFXLib.failure?.();
      } else {
        SFXLib.failure?.() || SFXLib.incorrect?.() || SFXLib.playError?.();
      }
    } catch (e) {
      console.warn('[ResultScreen3D] Audio trigger safe fallback:', e);
    }
  }

  hide() {
    if (!this._visible || !this._container) return;
    this._visible = false;
    this._container.style.display = 'none';
  }
}
