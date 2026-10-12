/* ═══════════════════════════════════════════════════════════════
   HUD3D.js — Responsive Holographic Cognitive Cockpit (Enhanced)
   Cohesive, responsive glassmorphic cockpit console with
   domain branding, animated circular timer, score multipliers,
   and interactive bottom action dock.
   ═══════════════════════════════════════════════════════════════ */

import { EventBus } from '../core/EventBus.js';
import { SFXLib }   from '../audio/SFXLib.js';

const SKILL_THEMES = {
  memory:      { label: 'WORKING MEMORY LAB', color: '#00f2fe', bg: 'rgba(0, 242, 254, 0.15)' },
  logical:     { label: 'LOGIC & DEDUCTION',   color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  reaction:    { label: 'PSYCHOMOTOR SPEED',  color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  pattern:     { label: 'PATTERN INDUCTION',  color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)' },
  spatial:     { label: 'SPATIAL ROTATION',   color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  observation: { label: 'ANOMALY OBSERVATION', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
};

export class HUD3D {
  constructor() {
    this._container = null;
    this._elements  = {};
    this._visible   = false;
    this._paused    = false;
    this._debugVisible = false;
    this._built     = false;
  }

  /** Build the HUD HTML and inject into the DOM */
  build() {
    if (this._built) return;
    this._built = true;

    const el = document.createElement('div');
    el.id = 'hud-3d';
    el.innerHTML = `
      <!-- Holographic Cockpit Top Bar -->
      <header class="hud3d-cockpit-bar">
        <!-- Left: Hub return & Skill Domain Pill -->
        <div class="hud3d-sect-left">
          <button class="hud3d-back-btn" id="h3d-back" title="Back to Hub">
            <span class="btn-arrow">←</span>
            <span class="btn-text">Hub</span>
          </button>
          <div class="hud3d-domain-pill" id="h3d-domain-pill">COGNITIVE TRIAL</div>
        </div>

        <!-- Center: Game Identity & Level Progress -->
        <div class="hud3d-sect-center">
          <div class="hud3d-title-group">
            <h1 class="hud3d-game-name" id="h3d-game-name">Cognitive Challenge</h1>
            <span class="hud3d-level-badge" id="h3d-level">Level 1 / 30</span>
          </div>
          <div class="hud3d-level-meter">
            <div class="hud3d-level-fill" id="h3d-level-fill" style="width: 3.33%;"></div>
          </div>
        </div>

        <!-- Right: Telemetry (Score, Combo, Radial Timer, Actions) -->
        <div class="hud3d-sect-right">
          <div class="hud3d-telemetry-item score-box">
            <span class="hud3d-lbl">SCORE</span>
            <span class="hud3d-val" id="h3d-score">0</span>
          </div>

          <div class="hud3d-telemetry-item combo-box">
            <span class="hud3d-lbl">COMBO</span>
            <span class="hud3d-val hud3d-combo" id="h3d-combo">0×</span>
          </div>

          <div class="hud3d-radial-timer" id="h3d-timer-box" title="Remaining Time">
            <svg class="timer-svg" viewBox="0 0 44 44">
              <circle class="timer-track" cx="22" cy="22" r="18"></circle>
              <circle class="timer-progress" id="h3d-timer-circle" cx="22" cy="22" r="18"></circle>
            </svg>
            <div class="timer-inner">
              <span class="timer-num" id="h3d-timer">25.0</span>
            </div>
          </div>

          <div class="hud3d-action-cluster">
            <button class="hud3d-icon-btn" id="h3d-pause" title="Pause Game (Esc)">⏸</button>
            <button class="hud3d-icon-btn" id="h3d-catalogue" title="All Games (Tab)">📋</button>
          </div>
        </div>
      </header>

      <!-- Center Voice Subtitle Banner -->
      <div class="hud3d-subtitle-wrap">
        <div class="hud3d-subtitle" id="h3d-subtitle">
          <span class="aria-voice-icon">🤖</span>
          <span class="aria-text" id="h3d-sub-text">ARIA Cognitive Protocol Active</span>
        </div>
      </div>

      <!-- Floating Popup Feedbacks (+150, Combo) -->
      <div class="hud3d-popup" id="h3d-popup"></div>

      <!-- Bottom Interactive Command Dock -->
      <footer class="hud3d-command-dock">
        <div class="hud3d-dock-cluster" id="h3d-hints">
          <button class="hud3d-dock-btn" data-hint="slow_time" title="Chrono Dilate: Slows playback">
            <span class="dock-icon">⏳</span>
            <span class="dock-title">Slow Time</span>
            <span class="dock-kbd">1</span>
          </button>
          <button class="hud3d-dock-btn" data-hint="reveal" title="Neural Ping: Reveals next node">
            <span class="dock-icon">👁️</span>
            <span class="dock-title">Neural Ping</span>
            <span class="dock-kbd">2</span>
          </button>
          <button class="hud3d-dock-btn" data-hint="aria_clue" title="ARIA Analysis: Guided hint">
            <span class="dock-icon">🤖</span>
            <span class="dock-title">ARIA Clue</span>
            <span class="dock-kbd">3</span>
          </button>
        </div>
      </footer>

      <!-- Pause Menu Overlay -->
      <div class="hud3d-pause-overlay" id="h3d-pause-overlay">
        <div class="hud3d-pause-menu">
          <h2>NEURAL PROTOCOL PAUSED</h2>
          <p class="pause-sub">Cognitive parameters suspended</p>
          <button class="hud3d-menu-btn primary" id="h3d-resume">▶ Resume Trial</button>
          <button class="hud3d-menu-btn" id="h3d-restart">🔄 Restart Level</button>
          <button class="hud3d-menu-btn danger" id="h3d-quit">✕ Exit to Hub</button>
        </div>
      </div>

      <!-- Telemetry F3 Overlay -->
      <div class="hud3d-debug" id="h3d-debug" style="display:none">
        <div id="h3d-debug-content"></div>
      </div>
    `;

    document.body.appendChild(el);
    this._container = el;
    this._cacheElements();
    this._bindEvents();
  }

  _cacheElements() {
    const ids = ['back', 'score', 'combo', 'game-name', 'level', 'domain-pill', 'level-fill',
                 'timer', 'timer-circle', 'timer-box', 'hints', 'pause', 'catalogue',
                 'subtitle', 'sub-text', 'popup', 'pause-overlay', 'resume', 'restart', 'quit',
                 'debug', 'debug-content'];
    for (const id of ids) {
      this._elements[id] = document.getElementById(`h3d-${id}`);
    }
  }

  _bindEvents() {
    // Back to hub
    this._elements['back']?.addEventListener('click', () => {
      SFXLib.click?.() || SFXLib.playClick?.();
      EventBus.emit('game:quit');
    });

    // Hint buttons
    const hintBtns = this._container.querySelectorAll('.hud3d-dock-btn');
    hintBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const type = btn.dataset.hint;
        SFXLib.hint?.();
        EventBus.emit('hint:request', { type });
      });
    });

    // Pause interactions
    this._elements['pause']?.addEventListener('click', () => this.togglePause());
    this._elements['resume']?.addEventListener('click', () => this.togglePause());
    this._elements['restart']?.addEventListener('click', () => {
      this.hidePause();
      EventBus.emit('game:restart');
    });
    this._elements['quit']?.addEventListener('click', () => {
      this.hidePause();
      EventBus.emit('game:quit');
    });

    // Catalogue
    this._elements['catalogue']?.addEventListener('click', () => {
      EventBus.emit('catalogue:toggle');
    });

    // Hotkeys
    document.addEventListener('keydown', (e) => {
      if (!this._visible) return;
      if (e.key === 'Escape') {
        this.togglePause();
      } else if (e.key === '1') {
        this._triggerHint('slow_time');
      } else if (e.key === '2') {
        this._triggerHint('reveal');
      } else if (e.key === '3') {
        this._triggerHint('aria_clue');
      } else if (e.key === 'F3') {
        e.preventDefault();
        this._debugVisible = !this._debugVisible;
        if (this._elements['debug']) {
          this._elements['debug'].style.display = this._debugVisible ? 'block' : 'none';
        }
      }
    });

    // EventBus popups
    EventBus.on('game:correct', (e) => {
      const combo = e.combo || 1;
      this.flashPopup(combo > 1 ? `+150 ×${combo}` : '+150', '#00f2fe');
    });
    EventBus.on('game:incorrect', () => this.flashPopup('✗ Discord', '#ff4d4d'));
    EventBus.on('hud:subtitle', ({ text }) => this.showSubtitle(text));
  }

  _triggerHint(type) {
    const btn = this._container?.querySelector(`.hud3d-dock-btn[data-hint="${type}"]`);
    if (btn && !btn.disabled) {
      btn.click();
    }
  }

  /* ── Public API ─────────────────────────────────────────────── */

  show(gameName = '', level = 1, skill = 'memory') {
    if (!this._built) this.build();
    this._container.style.display = 'flex';
    this._visible = true;
    this.setGameInfo(gameName, level, skill);
    this.setScore(0);
    this.setCombo(0);
    this.hidePause();
  }

  hide() {
    if (this._container) this._container.style.display = 'none';
    this._visible = false;
  }

  setScore(score) {
    if (this._elements['score']) {
      this._elements['score'].textContent = Math.round(score).toLocaleString();
    }
  }

  updateScore(score) {
    this.setScore(score);
  }

  setCombo(combo) {
    if (this._elements['combo']) {
      this._elements['combo'].textContent = combo > 0 ? `${combo}×` : '0×';
      if (combo > 1) {
        this._elements['combo'].classList.add('hud3d-combo-flame');
      } else {
        this._elements['combo'].classList.remove('hud3d-combo-flame');
      }
    }
  }

  updateCombo(combo) {
    this.setCombo(combo);
  }

  setLevel(level) {
    if (this._elements['level']) {
      this._elements['level'].textContent = `Level ${level} / 30`;
    }
    if (this._elements['level-fill']) {
      const pct = Math.min(100, Math.max(3, (level / 30) * 100));
      this._elements['level-fill'].style.width = `${pct}%`;
    }
  }

  setGameInfo(name, level = 1, skill = 'memory') {
    if (this._elements['game-name']) {
      this._elements['game-name'].textContent = name || 'Cognitive Challenge';
    }
    this.setLevel(level);

    const theme = SKILL_THEMES[skill] || SKILL_THEMES.memory;
    if (this._elements['domain-pill']) {
      this._elements['domain-pill'].textContent = theme.label;
      this._elements['domain-pill'].style.color = theme.color;
      this._elements['domain-pill'].style.borderColor = theme.color;
      this._elements['domain-pill'].style.background = theme.bg;
    }
  }

  updateTimer(remaining, total = 30) {
    const fraction = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 1;
    this.setTimer(remaining, fraction);
  }

  setTimer(remaining, fraction) {
    const s = Math.max(0, remaining);
    if (this._elements['timer']) {
      this._elements['timer'].textContent = s >= 60
        ? `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
        : s.toFixed(1);

      // Warning color shifts
      if (fraction < 0.25) {
        this._elements['timer'].style.color = '#ff4d4d';
      } else if (fraction < 0.5) {
        this._elements['timer'].style.color = '#f59e0b';
      } else {
        this._elements['timer'].style.color = '#00f2fe';
      }
    }

    // Radial SVG Circle Progress (circumference: 2 * PI * 18 ≈ 113.1)
    if (this._elements['timer-circle']) {
      const circ = 113.1;
      const offset = circ * (1 - fraction);
      this._elements['timer-circle'].style.strokeDasharray = `${circ}`;
      this._elements['timer-circle'].style.strokeDashoffset = `${offset}`;
      this._elements['timer-circle'].style.stroke = fraction < 0.25
        ? '#ff4d4d' : (fraction < 0.5 ? '#f59e0b' : '#00f2fe');
    }
  }

  showSubtitle(text) {
    if (this._elements['sub-text']) {
      this._elements['sub-text'].textContent = text;
    }
    if (this._elements['subtitle']) {
      this._elements['subtitle'].classList.add('active');
    }
  }

  flashPopup(text, color = '#00f2fe') {
    const popup = this._elements['popup'];
    if (!popup) return;

    popup.textContent = text;
    popup.style.color = color;
    popup.style.borderColor = color;
    popup.style.boxShadow = `0 0 25px ${color}`;
    popup.classList.add('visible');

    if (this._popupTimer) clearTimeout(this._popupTimer);
    this._popupTimer = setTimeout(() => {
      popup.classList.remove('visible');
    }, 900);
  }

  setHintAvailability(hints) {
    const btns = this._container?.querySelectorAll('.hud3d-dock-btn');
    btns?.forEach(btn => {
      const type = btn.dataset.hint;
      const info = hints.find(h => h.type === type);
      if (info && !info.available) {
        btn.disabled = true;
        btn.classList.add('disabled');
      } else {
        btn.disabled = false;
        btn.classList.remove('disabled');
      }
    });
  }

  togglePause() {
    this._paused = !this._paused;
    if (this._paused) this.showPause();
    else this.hidePause();
    EventBus.emit(this._paused ? 'game:pause' : 'game:resume');
  }

  showPause() {
    this._paused = true;
    this._elements['pause-overlay']?.classList.add('visible');
  }

  hidePause() {
    this._paused = false;
    this._elements['pause-overlay']?.classList.remove('visible');
  }

  showPauseOverlay() {
    this.showPause();
  }

  hidePauseOverlay() {
    this.hidePause();
  }

  updateDebug(data) {
    if (!this._elements['debug-content']) return;
    this._elements['debug-content'].innerHTML = `
      <div>FPS: <b>${data.fps}</b> | Calls: ${data.drawCalls} | Tris: ${data.triangles.toLocaleString()}</div>
      <div>Director: <b>${data.directorState}</b> | Elo: ${data.eloR} (RD ${data.eloRD})</div>
      <div>Target P: ${data.flowP} | Tweens: ${data.tweens}</div>
    `;
  }
}
