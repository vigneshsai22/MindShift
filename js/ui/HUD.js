/* ═══════════════════════════════════════════════════════════════
   HUD.js — Cyberpunk Sci-Fi 3D Head-Up Display & Debug Overlay
   Driven exclusively via EventBus events.
   Features:
   - Dynamic top bar: Score (count-up easing), Streak counter, Combo multiplier
   - Sector / Lab indicator with trial sequence dots
   - Neural integrity / timer bar with low-time warning strobe
   - AI Director state badge (BUILD / PEAK / RELIEF / RECOVER)
   - F3 Debug Overlay: Real-time Elo R, RD, D, Flow p, Director state, FPS
   - Floating score numbers & hit feedback
   - Audio volume slider & PostFX quality toggle
   - Hint & Abort buttons
   - Clean disposal removing all EventBus listeners
   ═══════════════════════════════════════════════════════════════ */

import { EventBus } from '../core/EventBus.js';
import { CONFIG } from '../core/Config.js';

export class HUD {
  constructor({ onHint, onExit } = {}) {
    this.onHint = onHint;
    this.onExit = onExit;

    this._el = null;
    this._score = 0;
    this._displayedScore = 0;
    this._streak = 0;
    this._combo = 1.0;
    this._hints = 3;
    this._debugVisible = false;

    // Debug metrics
    this._fps = 60;
    this._drawCalls = 0;
    this._directorState = 'BUILD';
    this._eloRating = 1200;
    this._eloRD = 350;
    this._trialDiff = 1200;
    this._flowP = 0.70;

    this._unsubscribers = [];
    this._scoreAnimId = null;
  }

  init() {
    this._createDOM();
    this._bindEvents();
    this._bindKeyboard();
  }

  _createDOM() {
    this._el = document.createElement('div');
    this._el.id = 'mindshift-hud';
    this._el.className = 'mindshift-hud-container';
    this._el.innerHTML = `
      <!-- TOP HUD BAR -->
      <header class="hud-top-bar">
        <div class="hud-section hud-left">
          <div class="hud-stat-box">
            <span class="hud-stat-label">NEURAL SCORE</span>
            <span class="hud-stat-value hud-glow-cyan" id="hud-score-val">0</span>
          </div>
          <div class="hud-stat-box">
            <span class="hud-stat-label">STREAK</span>
            <span class="hud-stat-value hud-glow-amber" id="hud-streak-val">0🔥</span>
          </div>
          <div class="hud-stat-box hud-combo-box" id="hud-combo-box">
            <span class="hud-stat-label">COMBO</span>
            <span class="hud-stat-value hud-glow-purple" id="hud-combo-val">x1.0</span>
          </div>
        </div>

        <div class="hud-section hud-center">
          <div class="hud-sector-title" id="hud-sector-title">SECTOR 1 // MEMORY VAULT</div>
          <div class="hud-trial-progress" id="hud-trial-progress">
            <span class="hud-progress-dot active"></span>
            <span class="hud-progress-dot"></span>
            <span class="hud-progress-dot"></span>
            <span class="hud-progress-dot boss"></span>
          </div>
          <div class="hud-director-badge" id="hud-director-badge">DIRECTOR: BUILD</div>
        </div>

        <div class="hud-section hud-right">
          <div class="hud-timer-wrap">
            <span class="hud-stat-label">TIME BUFFER</span>
            <span class="hud-timer-val" id="hud-timer-val">30.0s</span>
            <div class="hud-timer-bar-track">
              <div class="hud-timer-bar-fill" id="hud-timer-bar-fill" style="width: 100%;"></div>
            </div>
          </div>
          <div class="hud-action-buttons">
            <button class="hud-btn hud-btn-hint" id="hud-btn-hint" title="Request ARIA hint (costs multiplier)">
              💡 HINT (<span id="hud-hint-count">3</span>)
            </button>
            <button class="hud-btn hud-btn-abort" id="hud-btn-abort" title="Exit simulation">
              ✕ ABORT
            </button>
          </div>
        </div>
      </header>

      <!-- CROSSHAIR -->
      <div class="hud-crosshair">
        <div class="ch-line ch-h"></div>
        <div class="ch-line ch-v"></div>
        <div class="ch-dot"></div>
      </div>

      <!-- INTERACT PROMPT -->
      <div class="hud-interact-prompt" id="hud-interact-prompt">
        <span class="key-pill">E</span> <span id="hud-interact-text">INTERACT</span>
      </div>

      <!-- CENTER LAB BANNER -->
      <div class="hud-center-banner" id="hud-center-banner">
        <h2 id="hud-banner-title">MEMORY VAULT</h2>
        <p id="hud-banner-sub">RECALL NEURAL SEQUENCE</p>
      </div>

      <!-- FLOATING POPUPS CONTAINER -->
      <div class="hud-floating-container" id="hud-floating-container"></div>

      <!-- BOTTOM CONTROL TRAY -->
      <footer class="hud-bottom-tray">
        <div class="hud-tray-item">
          <span class="hud-tray-label">AUDIO</span>
          <input type="range" id="hud-vol-slider" min="0" max="1" step="0.05" value="0.75" class="hud-slider">
        </div>
        <div class="hud-tray-item">
          <span class="hud-tray-label">POST-FX</span>
          <select id="hud-quality-select" class="hud-select">
            <option value="high" selected>HIGH</option>
            <option value="medium">MEDIUM</option>
            <option value="low">LOW</option>
          </select>
        </div>
        <div class="hud-tray-item hud-f3-hint">
          <span>PRESS [F3] FOR ADAPTIVE TELEMETRY</span>
        </div>
      </footer>

      <!-- F3 ADAPTIVE TELEMETRY DEBUG OVERLAY -->
      <div class="hud-debug-overlay" id="hud-debug-overlay" style="display: none;">
        <div class="debug-header">
          <h3>⚡ NEURAL BREACH ADAPTIVE TELEMETRY (F3)</h3>
          <span class="debug-live-tag">● LIVE ENGINE</span>
        </div>
        <div class="debug-grid">
          <div class="debug-col">
            <div class="debug-row"><span class="k">Director State:</span> <span class="v" id="dbg-director">BUILD</span></div>
            <div class="debug-row"><span class="k">Flow Prediction (p):</span> <span class="v" id="dbg-p">0.70</span></div>
            <div class="debug-row"><span class="k">Flow Zone Target:</span> <span class="v">0.65 - 0.75</span></div>
            <div class="debug-row"><span class="k">FPS:</span> <span class="v" id="dbg-fps">60</span></div>
            <div class="debug-row"><span class="k">Draw Calls:</span> <span class="v" id="dbg-draws">14</span></div>
          </div>
          <div class="debug-col">
            <div class="debug-row"><span class="k">Player Elo (R):</span> <span class="v" id="dbg-elo-r">1200</span></div>
            <div class="debug-row"><span class="k">Uncertainty (RD):</span> <span class="v" id="dbg-elo-rd">350</span></div>
            <div class="debug-row"><span class="k">Trial Diff (D):</span> <span class="v" id="dbg-trial-d">1200</span></div>
            <div class="debug-row"><span class="k">Active Perks:</span> <span class="v" id="dbg-perks">NONE</span></div>
            <div class="debug-row"><span class="k">K-Factor:</span> <span class="v" id="dbg-k">32.0</span></div>
          </div>
        </div>
        <div class="debug-formula">
          <code>p = 1 / (1 + 10^((D - R)/400))  |  ΔR = K(RD) * (S - p)</code>
        </div>
      </div>
    `;

    document.body.appendChild(this._el);
  }

  _bindEvents() {
    // Top bar action buttons
    document.getElementById('hud-btn-hint')?.addEventListener('click', () => {
      if (this.onHint) this.onHint();
      EventBus.emit('hud:hint_requested');
    });

    document.getElementById('hud-btn-abort')?.addEventListener('click', () => {
      if (confirm('Abort current simulation and return to main terminal?')) {
        if (this.onExit) this.onExit();
        EventBus.emit('hud:abort');
      }
    });

    // Volume & PostFX
    document.getElementById('hud-vol-slider')?.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      EventBus.emit('audio:volume_change', { volume: vol });
    });

    document.getElementById('hud-quality-select')?.addEventListener('change', (e) => {
      EventBus.emit('graphics:quality_change', { quality: e.target.value });
    });

    // EventBus Subscriptions
    this._sub('score:change', (data) => this._setScore(data.score, data.delta));
    this._sub('streak:change', (data) => this._setStreak(data.streak));
    this._sub('combo:change', (data) => this._setCombo(data.combo, data.multiplier));
    this._sub('timer:tick', (data) => this._updateTimer(data.remaining, data.total));
    this._sub('director:state', (data) => this._setDirectorState(data.state));
    this._sub('trial:start', (data) => this._onTrialStart(data));
    this._sub('trial:complete', (data) => this._onTrialComplete(data));
    this._sub('telemetry:update', (data) => this._updateTelemetry(data));
    this._sub('juice:popup', (data) => this.showFloatingPopup(data.text, data.color));
    this._sub('player:interact_prompt', (data) => this._setInteractPrompt(data.show, data.text));
  }

  _sub(event, fn) {
    const unsub = EventBus.on(event, fn);
    this._unsubscribers.push(unsub);
  }

  _bindKeyboard() {
    this._onKeyDown = (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.toggleDebug();
      }
    };
    window.addEventListener('keydown', this._onKeyDown);
  }

  toggleDebug() {
    this._debugVisible = !this._debugVisible;
    const dbgEl = document.getElementById('hud-debug-overlay');
    if (dbgEl) dbgEl.style.display = this._debugVisible ? 'block' : 'none';
  }

  _setScore(score, delta = 0) {
    this._score = score;
    this._animateScore();
    if (delta > 0) {
      this.showFloatingPopup(`+${delta}`, '#00ffcc');
    }
  }

  _animateScore() {
    if (this._scoreAnimId) cancelAnimationFrame(this._scoreAnimId);
    const scoreEl = document.getElementById('hud-score-val');
    if (!scoreEl) return;

    const start = this._displayedScore;
    const end = this._score;
    const t0 = performance.now();
    const duration = 300;

    const step = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      this._displayedScore = Math.round(start + (end - start) * p);
      scoreEl.textContent = this._displayedScore.toLocaleString();
      if (p < 1) {
        this._scoreAnimId = requestAnimationFrame(step);
      }
    };
    this._scoreAnimId = requestAnimationFrame(step);
  }

  _setStreak(streak) {
    this._streak = streak;
    const streakEl = document.getElementById('hud-streak-val');
    if (streakEl) {
      streakEl.textContent = `${streak}🔥`;
      streakEl.classList.add('hud-pop');
      setTimeout(() => streakEl.classList.remove('hud-pop'), 200);
    }
  }

  _setCombo(combo, mult) {
    this._combo = mult || 1.0;
    const comboEl = document.getElementById('hud-combo-val');
    const box = document.getElementById('hud-combo-box');
    if (comboEl) {
      comboEl.textContent = `x${this._combo.toFixed(1)}`;
      if (this._combo > 1.0 && box) {
        box.classList.add('combo-active');
      } else if (box) {
        box.classList.remove('combo-active');
      }
    }
  }

  _updateTimer(remaining, total = 30) {
    const valEl = document.getElementById('hud-timer-val');
    const barEl = document.getElementById('hud-timer-bar-fill');
    if (!valEl || !barEl) return;

    const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
    barEl.style.width = `${pct}%`;
    valEl.textContent = `${Math.max(0, remaining).toFixed(1)}s`;

    if (remaining <= 5.0) {
      valEl.style.color = '#ff3344';
      barEl.style.backgroundColor = '#ff3344';
      valEl.classList.add('hud-strobe');
    } else if (remaining <= 10.0) {
      valEl.style.color = '#ffaa00';
      barEl.style.backgroundColor = '#ffaa00';
      valEl.classList.remove('hud-strobe');
    } else {
      valEl.style.color = '#00ffcc';
      barEl.style.backgroundColor = '#00e5ff';
      valEl.classList.remove('hud-strobe');
    }
  }

  _setDirectorState(state) {
    this._directorState = state;
    const badge = document.getElementById('hud-director-badge');
    const dbgDirector = document.getElementById('dbg-director');
    if (badge) {
      badge.textContent = `DIRECTOR: ${state}`;
      badge.className = `hud-director-badge badge-${state.toLowerCase()}`;
    }
    if (dbgDirector) dbgDirector.textContent = state;
  }

  _onTrialStart(data) {
    const titleEl = document.getElementById('hud-sector-title');
    if (titleEl && data.sectorTitle) {
      titleEl.textContent = `${data.sectorTitle.toUpperCase()} // TRIAL ${data.trialIndex || 1}/${data.totalTrials || 3}`;
    }

    // Update dots
    const dots = document.querySelectorAll('#hud-trial-progress .hud-progress-dot');
    dots.forEach((dot, idx) => {
      dot.classList.remove('active', 'done');
      if (idx < (data.trialIndex - 1)) dot.classList.add('done');
      else if (idx === (data.trialIndex - 1)) dot.classList.add('active');
    });

    if (data.bannerTitle) {
      this.showBanner(data.bannerTitle, data.bannerSub || '');
    }
  }

  _onTrialComplete(data) {
    if (data.correct) {
      this.showFloatingPopup('OPTIMAL BREACH!', '#00ff88');
    } else {
      this.showFloatingPopup('BREACH FAILED', '#ff3344');
    }
  }

  showBanner(title, sub = '') {
    const banner = document.getElementById('hud-center-banner');
    const titleEl = document.getElementById('hud-banner-title');
    const subEl = document.getElementById('hud-banner-sub');
    if (!banner || !titleEl) return;

    titleEl.textContent = title;
    if (subEl) subEl.textContent = sub;
    banner.classList.add('show');
    setTimeout(() => banner.classList.remove('show'), 2200);
  }

  showFloatingPopup(text, color = '#00ffcc') {
    const container = document.getElementById('hud-floating-container');
    if (!container) return;

    const pop = document.createElement('div');
    pop.className = 'hud-floating-popup';
    pop.style.color = color;
    pop.textContent = text;
    container.appendChild(pop);

    setTimeout(() => pop.remove(), 1200);
  }

  _setInteractPrompt(show, text = 'INTERACT') {
    const prompt = document.getElementById('hud-interact-prompt');
    const textEl = document.getElementById('hud-interact-text');
    if (!prompt) return;
    if (show) {
      if (textEl) textEl.textContent = text;
      prompt.classList.add('visible');
    } else {
      prompt.classList.remove('visible');
    }
  }

  _updateTelemetry(data) {
    if (data.fps !== undefined) {
      this._fps = data.fps;
      const el = document.getElementById('dbg-fps');
      if (el) el.textContent = Math.round(data.fps);
    }
    if (data.drawCalls !== undefined) {
      this._drawCalls = data.drawCalls;
      const el = document.getElementById('dbg-draws');
      if (el) el.textContent = data.drawCalls;
    }
    if (data.flowP !== undefined) {
      this._flowP = data.flowP;
      const el = document.getElementById('dbg-p');
      if (el) el.textContent = data.flowP.toFixed(3);
    }
    if (data.eloR !== undefined) {
      this._eloRating = data.eloR;
      const el = document.getElementById('dbg-elo-r');
      if (el) el.textContent = Math.round(data.eloR);
    }
    if (data.eloRD !== undefined) {
      this._eloRD = data.eloRD;
      const el = document.getElementById('dbg-elo-rd');
      if (el) el.textContent = Math.round(data.eloRD);
    }
    if (data.trialD !== undefined) {
      this._trialDiff = data.trialD;
      const el = document.getElementById('dbg-trial-d');
      if (el) el.textContent = Math.round(data.trialD);
    }
    if (data.perks !== undefined) {
      const el = document.getElementById('dbg-perks');
      if (el) el.textContent = Array.isArray(data.perks) ? data.perks.join(', ') : data.perks;
    }
    if (data.kFactor !== undefined) {
      const el = document.getElementById('dbg-k');
      if (el) el.textContent = data.kFactor.toFixed(1);
    }
  }

  dispose() {
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
    if (this._onKeyDown) window.removeEventListener('keydown', this._onKeyDown);
    if (this._scoreAnimId) cancelAnimationFrame(this._scoreAnimId);
    this._el?.remove();
  }
}
