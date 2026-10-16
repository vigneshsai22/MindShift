/* ═══════════════════════════════════════════════════════════════
   HUD3D.js — Responsive Holographic Cognitive Cockpit
   Includes:
     • One-sentence Goal Bar at the top
     • Round Counter & Within-Level Progress Bar
     • 3 Lives Indicator (❤️ ❤️ ❤️)
     • Radial Per-Round Timer
     • Interactive "How to Play" / Controls Modal
     • Telemetry, Voice Subtitles & Real-time Feedback
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

const HOW_TO_PLAY_INFO = {
  'lumen-pond': {
    title: 'Lumen Pond — Working Memory Protocol',
    goal: 'Repeat the illuminated lily pads in exact sequence before the round timer expires.',
    controls: 'Click / Tap pads 1–7 or use number keys 1–7.',
    rules: 'Each level consists of 5 to 10 rounds. You have 3 lives per level. A wrong pad or timeout costs 1 life. Complete at least 60% of rounds with >= 1 life left to win.',
    hints: '⏳ Slow Time: Slows harmonic playback speed.<br>👁️ Neural Ping: Highlights the next required pad.<br>🤖 ARIA Clue: Vocal/text guidance for the current sequence.'
  },
  'terminal-hack': {
    title: 'Terminal Hack — Cryptanalytic Deduction',
    goal: 'Deduce the secret cryptographic password using likeness feedback.',
    controls: 'Click / Tap candidate passwords or use keyboard arrows + Enter.',
    rules: 'Each round provides terminal candidates. Likeness indicates matching characters in identical positions. Complete rounds within the time limit. 3 lives per level.',
    hints: '⏳ Slow Time: Adds extra deduction time.<br>👁️ Neural Ping: Filters out false candidate duds.<br>🤖 ARIA Clue: Reveals a correct letter position.'
  },
  'hologram-matrix': {
    title: 'Hologram Matrix — Pattern Induction',
    goal: 'Identify the missing geometric rule and complete the holographic matrix.',
    controls: 'Click / Tap candidate solution tiles 1–4 (or keys 1–4).',
    rules: 'Analyze shape transformations across rows and columns. Choose the correct tile to fill the missing slot. 3 lives per level.',
    hints: '⏳ Slow Time: Freezes matrix rotation.<br>👁️ Neural Ping: Eliminates 2 incorrect options.<br>🤖 ARIA Clue: Explains the active row/col pattern rule.'
  },
  'rotation-core': {
    title: 'Rotation Core — Spatial Reasoning',
    goal: 'Mentally rotate the 3D core structure to match the reference orientation.',
    controls: 'Click / Drag to inspect 3D orientation; select matching orientation.',
    rules: 'Compare complex 3D polyhedra under multi-axis rotations. Select matching orientation before time runs out. 3 lives per level.',
    hints: '⏳ Slow Time: Halts auto-spin drift.<br>👁️ Neural Ping: Highlights matching structural axis.<br>🤖 ARIA Clue: Indicates rotation axis and degrees.'
  },
  'reflex-arena': {
    title: 'Reflex Arena — Psychomotor Speed',
    goal: 'Intercept high-priority synaptic targets before they dissipate; avoid decoys.',
    controls: 'Click / Tap active target spheres or assigned hotkeys.',
    rules: 'Fast-paced waves of neural targets. Red decoys must be avoided. Missing targets or hitting decoys costs a life. 3 lives per level.',
    hints: '⏳ Slow Time: Dilates target dissipation rate.<br>👁️ Neural Ping: Highlights next target spawn.<br>🤖 ARIA Clue: Temporarily disables decoy hazards.'
  },
  'anomaly-rooms': {
    title: 'Anomaly Rooms — Visual Observation',
    goal: 'Spot structural discrepancies between the twin holographic chambers.',
    controls: 'Click / Tap anomalous objects in either chamber A or B.',
    rules: 'Examine both chambers for mutations, missing elements, or lighting shifts. 3 lives per level.',
    hints: '⏳ Slow Time: Enhances chamber illumination.<br>👁️ Neural Ping: Highlights anomaly bounding radius.<br>🤖 ARIA Clue: Directs attention to the anomaly sector.'
  }
};

export class HUD3D {
  constructor() {
    this._container = null;
    this._elements  = {};
    this._visible   = false;
    this._paused    = false;
    this._debugVisible = false;
    this._built     = false;
    this._currentGameId = 'lumen-pond';
  }

  /** Build the HUD HTML and inject into the DOM */
  build() {
    if (this._built && this._container && document.body.contains(this._container)) return;
    this._built = true;

    // Clean up any stale duplicate hud-3d elements
    const stale = document.querySelectorAll('#hud-3d');
    stale.forEach(el => el.remove());

    const el = document.createElement('div');
    el.id = 'hud-3d';
    el.innerHTML = `
      <!-- Goal Banner Bar -->
      <div class="hud3d-goal-bar" id="h3d-goal">
        <span class="goal-tag">GOAL</span>
        <span class="goal-text" id="h3d-goal-text">Repeat the illuminated lily pads in exact sequence</span>
      </div>

      <!-- Holographic Cockpit Top Bar -->
      <header class="hud3d-cockpit-bar">
        <!-- Left: Hub return, Domain Pill, How-to-Play -->
        <div class="hud3d-sect-left">
          <button class="hud3d-back-btn" id="h3d-back" title="Back to Hub">
            <span class="btn-arrow">←</span>
            <span class="btn-text">Hub</span>
          </button>
          <div class="hud3d-domain-pill" id="h3d-domain-pill">COGNITIVE TRIAL</div>
          <button class="hud3d-help-btn" id="h3d-help" title="How to Play & Controls (H)">
            <span class="help-icon">❓</span>
            <span class="help-text">How to Play</span>
          </button>
          <button class="hud3d-help-btn" id="h3d-a11y" title="Accessibility Options">
            <span class="help-icon">♿</span>
            <span class="help-text">A11y</span>
          </button>
        </div>

        <!-- Center: Game Identity, Level Badge, Round Badge, Lives & Progress Bar -->
        <div class="hud3d-sect-center">
          <div class="hud3d-title-group">
            <h1 class="hud3d-game-name" id="h3d-game-name">Cognitive Challenge</h1>
            <span class="hud3d-level-badge" id="h3d-level">Level 1 / 30</span>
            <span class="hud3d-round-badge" id="h3d-round">Round 1 / 5</span>
            <div class="hud3d-lives-meter" id="h3d-lives" title="Lives Remaining (3)">
              <span class="hud3d-heart active" data-heart="1">❤️</span>
              <span class="hud3d-heart active" data-heart="2">❤️</span>
              <span class="hud3d-heart active" data-heart="3">❤️</span>
            </div>
          </div>
          <div class="hud3d-level-meter" title="Round Mission Progress">
            <div class="hud3d-level-fill" id="h3d-level-fill" style="width: 20%;"></div>
          </div>
        </div>

        <!-- Right: Telemetry (Score, Combo, Radial Round Timer, Actions) -->
        <div class="hud3d-sect-right">
          <div class="hud3d-telemetry-item score-box">
            <span class="hud3d-lbl">SCORE</span>
            <span class="hud3d-val" id="h3d-score">0</span>
          </div>

          <div class="hud3d-telemetry-item combo-box">
            <span class="hud3d-lbl">COMBO</span>
            <span class="hud3d-val hud3d-combo" id="h3d-combo">0×</span>
          </div>

          <div class="hud3d-radial-timer" id="h3d-timer-box" title="Round Time Remaining">
            <svg class="timer-svg" viewBox="0 0 44 44">
              <circle class="timer-track" cx="22" cy="22" r="18"></circle>
              <circle class="timer-progress" id="h3d-timer-circle" cx="22" cy="22" r="18"></circle>
            </svg>
            <div class="timer-inner">
              <span class="timer-num" id="h3d-timer">14.0</span>
            </div>
          </div>

          <div class="hud3d-action-cluster">
            <button class="hud3d-icon-btn" id="h3d-pause" title="Pause Game (Esc / P)">⏸</button>
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

      <!-- Floating Popup Feedbacks (+150, Combo, Round results) -->
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

      <!-- How to Play Overlay Modal -->
      <div class="hud3d-help-overlay" id="h3d-help-overlay" style="display:none">
        <div class="hud3d-help-card">
          <div class="help-card-header">
            <h2 id="h3d-help-title">Game Guide</h2>
            <button class="help-close-btn" id="h3d-help-close" title="Close Guide (Esc)">✕</button>
          </div>
          <div class="help-card-body">
            <div class="help-section">
              <h3>🎯 OBJECTIVE</h3>
              <p id="h3d-help-goal">Complete all rounds in the mission.</p>
            </div>
            <div class="help-section">
              <h3>🎮 CONTROLS</h3>
              <p id="h3d-help-controls">Mouse click or touch.</p>
            </div>
            <div class="help-section">
              <h3>❤️ MISSION RULES & LIVES</h3>
              <p id="h3d-help-rules">Each level has 5–10 rounds and 3 lives. Pass >= 60% of rounds with >= 1 life left to win.</p>
            </div>
            <div class="help-section">
              <h3>💡 NEURAL HINTS</h3>
              <p id="h3d-help-hints">Use hints 1, 2, or 3 wisely.</p>
            </div>
          </div>
          <div class="help-card-footer" style="display:flex;gap:10px;justify-content:flex-end;">
            <button class="hud3d-menu-btn" id="h3d-help-practice" style="width:auto;padding:10px 18px;">🎮 Play Practice (Lv 0)</button>
            <button class="hud3d-menu-btn primary" id="h3d-help-confirm" style="width:auto;padding:10px 18px;">Got it, Let's Play!</button>
          </div>
        </div>
      </div>

      <!-- Pause Menu Overlay -->
      <div class="hud3d-pause-overlay" id="h3d-pause-overlay">
        <div class="hud3d-pause-menu">
          <h2>NEURAL PROTOCOL PAUSED</h2>
          <p class="pause-sub">Cognitive parameters suspended</p>
          <button class="hud3d-menu-btn primary" id="h3d-resume">▶ Resume Trial</button>
          <button class="hud3d-menu-btn" id="h3d-restart">🔄 Restart Level</button>
          <button class="hud3d-menu-btn" id="h3d-pause-help">❓ How to Play</button>
          <button class="hud3d-menu-btn" id="h3d-pause-a11y">♿ Accessibility</button>
          <button class="hud3d-menu-btn danger" id="h3d-quit">✕ Exit to Hub</button>
        </div>
      </div>

      <!-- 3-Step Onboarding Modal -->
      <div class="hud3d-onboarding-overlay" id="h3d-onboard-overlay" style="display:none">
        <div class="hud3d-onboard-card">
          <div class="onboard-step-badge">STEP 1 OF 3: MISSION PROTOCOL</div>
          <h2 id="h3d-onboard-title">Cognitive Protocol Initialization</h2>
          
          <div class="onboard-goal-banner">
            <span class="onboard-goal-tag">OBJECTIVE</span>
            <span class="onboard-goal-text" id="h3d-onboard-goal">Memorize the glowing pads and repeat the sequence</span>
          </div>

          <div class="onboard-details">
            <div class="onboard-detail-row">
              <span class="onboard-icon">🎮</span>
              <div>
                <strong>CONTROLS:</strong>
                <p id="h3d-onboard-controls">Click/tap with mouse or use keys [1–7].</p>
              </div>
            </div>
            <div class="onboard-detail-row">
              <span class="onboard-icon">❤️</span>
              <div>
                <strong>RULES & LIVES:</strong>
                <p id="h3d-onboard-rules">Each level has 5–10 rounds. You start with 3 lives. Pass >= 60% of rounds with >= 1 life left to win.</p>
              </div>
            </div>
          </div>

          <div class="onboard-actions">
            <button class="hud3d-menu-btn" id="h3d-onboard-skip">Skip to Level 1 ⏩</button>
            <button class="hud3d-menu-btn primary" id="h3d-onboard-practice">🟢 Start Practice Round (Level 0)</button>
          </div>
        </div>
      </div>

      <!-- 3-Second Countdown Overlay -->
      <div class="hud3d-countdown-overlay" id="h3d-countdown-overlay" style="display:none">
        <div class="countdown-card">
          <div class="countdown-badge">NEURAL SYNCHRONIZATION</div>
          <div class="countdown-num" id="h3d-countdown-num">3</div>
          <div class="countdown-sub" id="h3d-countdown-sub">GET READY...</div>
        </div>
      </div>

      <!-- Accessibility Settings Modal -->
      <div class="hud3d-a11y-overlay" id="h3d-a11y-overlay" style="display:none">
        <div class="hud3d-a11y-card">
          <div class="a11y-header">
            <h2>♿ ACCESSIBILITY SETTINGS</h2>
            <button class="help-close-btn" id="h3d-a11y-close">✕</button>
          </div>
          <div class="a11y-body">
            <label class="a11y-toggle-row">
              <input type="checkbox" id="h3d-a11y-extra-time">
              <div class="a11y-toggle-info">
                <strong>Extra Time Multiplier (1.5×)</strong>
                <span>Extends per-round timer by 50% for relaxed cognitive processing.</span>
              </div>
            </label>
            <label class="a11y-toggle-row">
              <input type="checkbox" id="h3d-a11y-reduced-motion">
              <div class="a11y-toggle-info">
                <strong>Reduced Motion</strong>
                <span>Suppresses camera shakes, rapid spins, and intense particle bursts.</span>
              </div>
            </label>
            <label class="a11y-toggle-row">
              <input type="checkbox" id="h3d-a11y-high-contrast">
              <div class="a11y-toggle-info">
                <strong>High Contrast Mode</strong>
                <span>Enhances text sharpness, neon borders, and darkens backdrop opacity.</span>
              </div>
            </label>
          </div>
          <div class="a11y-footer">
            <button class="hud3d-menu-btn primary" id="h3d-a11y-confirm">Save & Close</button>
          </div>
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
    this._injectStyles();
    this.initAccessibility();
  }

  _cacheElements() {
    const ids = [
      'back', 'help', 'a11y', 'score', 'combo', 'game-name', 'level', 'round', 'domain-pill',
      'level-fill', 'lives', 'timer', 'timer-circle', 'timer-box', 'hints', 'pause',
      'catalogue', 'subtitle', 'sub-text', 'popup', 'pause-overlay', 'resume', 'restart',
      'quit', 'pause-help', 'pause-a11y', 'debug', 'debug-content', 'goal', 'goal-text',
      'help-overlay', 'help-close', 'help-confirm', 'help-practice', 'help-title', 'help-goal',
      'help-controls', 'help-rules', 'help-hints',
      'onboard-overlay', 'onboard-title', 'onboard-goal', 'onboard-controls', 'onboard-rules',
      'onboard-skip', 'onboard-practice',
      'countdown-overlay', 'countdown-num', 'countdown-sub',
      'a11y-overlay', 'a11y-close', 'a11y-confirm', 'a11y-extra-time', 'a11y-reduced-motion', 'a11y-high-contrast'
    ];
    for (const id of ids) {
      this._elements[id] = this._container ? this._container.querySelector(`#h3d-${id}`) : document.getElementById(`h3d-${id}`);
    }
  }

  _bindEvents() {
    // Back to hub
    this._elements['back']?.addEventListener('click', () => {
      SFXLib.click?.() || SFXLib.playClick?.();
      EventBus.emit('game:quit');
    });

    // How to play button
    this._elements['help']?.addEventListener('click', () => {
      SFXLib.click?.() || SFXLib.playClick?.();
      this.showHowToPlay();
    });
    this._elements['help-close']?.addEventListener('click', () => this.hideHowToPlay());
    this._elements['help-confirm']?.addEventListener('click', () => this.hideHowToPlay());
    this._elements['help-practice']?.addEventListener('click', () => {
      this.hideHowToPlay();
      EventBus.emit('game:practice', { gameId: this._currentGameId });
    });

    // Accessibility modal bindings
    this._elements['a11y']?.addEventListener('click', () => this.showA11yModal());
    this._elements['pause-a11y']?.addEventListener('click', () => this.showA11yModal());
    this._elements['a11y-close']?.addEventListener('click', () => this.hideA11yModal());
    this._elements['a11y-confirm']?.addEventListener('click', () => this.hideA11yModal());

    this._elements['a11y-extra-time']?.addEventListener('change', (e) => {
      window.__extraTime = e.target.checked;
      this._saveA11yPrefs();
      this.flashPopup(window.__extraTime ? 'Extra Time: ACTIVE (1.5× Timer)' : 'Extra Time: Disabled', '#00f2fe');
    });
    this._elements['a11y-reduced-motion']?.addEventListener('change', (e) => {
      window.__reducedMotion = e.target.checked;
      document.body.classList.toggle('reduced-motion', e.target.checked);
      this._saveA11yPrefs();
      this.flashPopup(window.__reducedMotion ? 'Reduced Motion: ACTIVE' : 'Reduced Motion: Disabled', '#00f2fe');
    });
    this._elements['a11y-high-contrast']?.addEventListener('change', (e) => {
      window.__highContrast = e.target.checked;
      document.body.classList.toggle('high-contrast', e.target.checked);
      this._saveA11yPrefs();
      this.flashPopup(window.__highContrast ? 'High Contrast: ACTIVE' : 'High Contrast: Disabled', '#00f2fe');
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
    this._elements['pause-help']?.addEventListener('click', () => {
      this.showHowToPlay();
    });
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

    // Hotkeys (Esc or P for pause, H for help)
    document.addEventListener('keydown', (e) => {
      if (!this._visible) return;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (this._elements['help-overlay']?.style.display === 'flex') {
          this.hideHowToPlay();
        } else if (this._elements['a11y-overlay']?.style.display === 'flex') {
          this.hideA11yModal();
        } else if (this._elements['onboard-overlay']?.style.display === 'flex') {
          this.hideOnboarding();
        } else {
          this.togglePause();
        }
      } else if (e.key === 'h' || e.key === 'H') {
        this.toggleHowToPlay();
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

    // EventBus listeners
    EventBus.on('hud:goal', ({ goal, game }) => {
      if (game) this._currentGameId = game;
      this.setGoalText(goal);
    });

    EventBus.on('hud:round', ({ current, total, lives, maxLives, isPractice }) => {
      this.setRoundInfo(current, total, lives, maxLives, isPractice);
    });

    EventBus.on('hud:timer', ({ remaining, total }) => {
      this.updateTimer(remaining, total);
    });

    EventBus.on('hud:popup', ({ text, color }) => {
      this.flashPopup(text, color || '#00f2fe');
    });

    EventBus.on('hud:subtitle', ({ text }) => this.showSubtitle(text));
  }

  _injectStyles() {
    if (document.getElementById('hud3d-mission-styles')) return;
    const style = document.createElement('style');
    style.id = 'hud3d-mission-styles';
    style.textContent = `
      /* Top Goal Bar */
      .hud3d-goal-bar {
        position: absolute;
        top: 6px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(8, 16, 32, 0.92);
        border: 1px solid rgba(0, 242, 254, 0.4);
        border-radius: 20px;
        padding: 4px 18px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 60;
        pointer-events: auto;
        box-shadow: 0 4px 20px rgba(0, 242, 254, 0.2);
        max-width: 90vw;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hud3d-goal-bar .goal-tag {
        background: #00f2fe;
        color: #051322;
        font-size: 0.68rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        padding: 2px 7px;
        border-radius: 10px;
      }
      .hud3d-goal-bar .goal-text {
        font-size: 0.85rem;
        color: #e2e8f0;
        font-weight: 600;
        letter-spacing: 0.02em;
      }

      /* Help Button */
      .hud3d-help-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 8px;
        padding: 6px 12px;
        color: #e2e8f0;
        cursor: pointer;
        font-size: 0.82rem;
        font-weight: 600;
        transition: all 0.2s ease;
      }
      .hud3d-help-btn:hover {
        background: rgba(0, 242, 254, 0.2);
        border-color: #00f2fe;
        color: #00f2fe;
        transform: translateY(-1px);
      }

      /* Round Badge & Lives Meter */
      .hud3d-round-badge {
        font-size: 0.82rem;
        font-weight: 700;
        background: rgba(0, 242, 254, 0.12);
        border: 1px solid rgba(0, 242, 254, 0.4);
        color: #00f2fe;
        padding: 2px 8px;
        border-radius: 6px;
      }
      .hud3d-lives-meter {
        display: inline-flex;
        gap: 4px;
        align-items: center;
        margin-left: 4px;
      }
      .hud3d-heart {
        font-size: 0.95rem;
        opacity: 0.25;
        filter: grayscale(1);
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .hud3d-heart.active {
        opacity: 1;
        filter: none;
        animation: heartPulse 1.8s infinite alternate;
      }
      @keyframes heartPulse {
        from { transform: scale(1); }
        to { transform: scale(1.12); }
      }

      /* How-to-play Modal */
      .hud3d-help-overlay {
        position: fixed;
        inset: 0;
        background: rgba(4, 9, 20, 0.88);
        backdrop-filter: blur(16px);
        z-index: 120;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .hud3d-help-card {
        background: rgba(15, 23, 42, 0.96);
        border: 2px solid #00f2fe;
        box-shadow: 0 0 35px rgba(0, 242, 254, 0.35);
        border-radius: 20px;
        width: 100%;
        max-width: 580px;
        padding: 28px;
        color: #f1f5f9;
        display: flex;
        flex-direction: column;
        gap: 18px;
        animation: helpZoom 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      @keyframes helpZoom {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .help-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        padding-bottom: 12px;
      }
      .help-card-header h2 {
        font-size: 1.35rem;
        color: #00f2fe;
        margin: 0;
      }
      .help-close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 1.3rem;
        cursor: pointer;
        padding: 4px 8px;
      }
      .help-close-btn:hover { color: #ef4444; }
      .help-section {
        margin-bottom: 10px;
      }
      .help-section h3 {
        font-size: 0.82rem;
        color: #38bdf8;
        letter-spacing: 0.06em;
        margin-bottom: 4px;
        text-transform: uppercase;
      }
      .help-section p {
        font-size: 0.92rem;
        color: #cbd5e1;
        line-height: 1.5;
        margin: 0;
      }
      .help-card-footer {
        display: flex;
        justify-content: flex-end;
        padding-top: 8px;
      }

      /* Pause Overlay */
      .hud3d-pause-overlay {
        position: fixed;
        inset: 0;
        background: rgba(4, 10, 20, 0.88);
        backdrop-filter: blur(14px);
        z-index: 200;
        display: none;
        align-items: center;
        justify-content: center;
      }
      .hud3d-pause-overlay.visible {
        display: flex !important;
      }
      .hud3d-pause-menu {
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(0, 242, 254, 0.4);
        border-radius: 18px;
        padding: 36px 44px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 242, 254, 0.2);
      }
      .hud3d-pause-menu h2 {
        font-family: var(--font-display, 'Outfit', sans-serif);
        font-size: 1.5rem;
        letter-spacing: 0.1em;
        color: #38bdf8;
        margin: 0;
      }
      .hud3d-pause-menu .pause-sub {
        color: #94a3b8;
        font-size: 0.88rem;
        margin: 0 0 8px 0;
      }
      .hud3d-menu-btn {
        width: 220px;
        padding: 12px 20px;
        border-radius: 10px;
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #fff;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .hud3d-menu-btn:hover {
        background: rgba(56, 189, 248, 0.2);
        border-color: #38bdf8;
        transform: translateY(-2px);
      }
      .hud3d-menu-btn.primary {
        background: #00f2fe;
        color: #051322;
        border-color: #00f2fe;
        font-weight: 700;
      }
      .hud3d-menu-btn.primary:hover {
        background: #38bdf8;
        box-shadow: 0 0 20px rgba(0, 242, 254, 0.4);
      }
      .hud3d-menu-btn.danger {
        border-color: rgba(239, 68, 68, 0.4);
        color: #fca5a5;
      }
      .hud3d-menu-btn.danger:hover {
        background: rgba(239, 68, 68, 0.2);
        border-color: #ef4444;
      }

      /* 3-Step Onboarding Modal */
      .hud3d-onboarding-overlay {
        position: fixed;
        inset: 0;
        background: rgba(3, 7, 18, 0.92);
        backdrop-filter: blur(18px);
        z-index: 250;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        animation: onboardFadeIn 0.3s ease;
      }
      @keyframes onboardFadeIn {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }
      .hud3d-onboard-card {
        background: rgba(15, 23, 42, 0.98);
        border: 2px solid #00f2fe;
        box-shadow: 0 0 45px rgba(0, 242, 254, 0.35);
        border-radius: 24px;
        width: 100%;
        max-width: 620px;
        padding: 32px 36px;
        color: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .onboard-step-badge {
        font-size: 0.75rem;
        font-weight: 900;
        letter-spacing: 0.12em;
        color: #00f2fe;
        text-transform: uppercase;
      }
      .hud3d-onboard-card h2 {
        font-family: var(--font-display, 'Outfit', sans-serif);
        font-size: 1.6rem;
        margin: 0;
        color: #f8fafc;
      }
      .onboard-goal-banner {
        background: rgba(0, 242, 254, 0.1);
        border: 1px solid rgba(0, 242, 254, 0.4);
        border-radius: 14px;
        padding: 12px 18px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .onboard-goal-tag {
        background: #00f2fe;
        color: #051322;
        font-size: 0.72rem;
        font-weight: 900;
        padding: 3px 8px;
        border-radius: 8px;
      }
      .onboard-goal-text {
        font-size: 0.95rem;
        font-weight: 700;
        color: #e2e8f0;
      }
      .onboard-details {
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: rgba(0, 0, 0, 0.25);
        border-radius: 14px;
        padding: 16px 20px;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .onboard-detail-row {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }
      .onboard-detail-row .onboard-icon {
        font-size: 1.3rem;
        flex-shrink: 0;
      }
      .onboard-detail-row strong {
        font-size: 0.8rem;
        color: #38bdf8;
        letter-spacing: 0.05em;
        display: block;
      }
      .onboard-detail-row p {
        margin: 2px 0 0 0;
        font-size: 0.9rem;
        color: #cbd5e1;
        line-height: 1.4;
      }
      .onboard-actions {
        display: flex;
        gap: 14px;
        justify-content: flex-end;
        margin-top: 8px;
      }
      .onboard-actions .hud3d-menu-btn {
        width: auto;
        padding: 12px 22px;
      }

      /* 3-Second Countdown Overlay */
      .hud3d-countdown-overlay {
        position: fixed;
        inset: 0;
        background: rgba(3, 7, 18, 0.85);
        backdrop-filter: blur(12px);
        z-index: 300;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .countdown-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 10px;
      }
      .countdown-badge {
        font-size: 0.9rem;
        font-weight: 800;
        letter-spacing: 0.15em;
        color: #00f2fe;
      }
      .countdown-num {
        font-family: var(--font-display, 'Outfit', sans-serif);
        font-size: 7rem;
        font-weight: 900;
        color: #00f2fe;
        text-shadow: 0 0 40px rgba(0, 242, 254, 0.8), 0 0 80px rgba(0, 242, 254, 0.4);
        line-height: 1;
        animation: countdownPulse 0.95s infinite alternate cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      @keyframes countdownPulse {
        from { transform: scale(0.9); opacity: 0.8; }
        to { transform: scale(1.15); opacity: 1; }
      }
      .countdown-sub {
        font-size: 1.1rem;
        font-weight: 700;
        color: #e2e8f0;
        letter-spacing: 0.1em;
      }

      /* Accessibility Modal */
      .hud3d-a11y-overlay {
        position: fixed;
        inset: 0;
        background: rgba(4, 9, 20, 0.88);
        backdrop-filter: blur(14px);
        z-index: 260;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .hud3d-a11y-card {
        background: rgba(15, 23, 42, 0.98);
        border: 2px solid #38bdf8;
        box-shadow: 0 0 35px rgba(56, 189, 248, 0.3);
        border-radius: 20px;
        width: 100%;
        max-width: 520px;
        padding: 28px;
        color: #f1f5f9;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .a11y-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        padding-bottom: 12px;
      }
      .a11y-header h2 {
        font-size: 1.25rem;
        color: #38bdf8;
        margin: 0;
      }
      .a11y-body {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .a11y-toggle-row {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 14px 16px;
        transition: background 0.2s;
      }
      .a11y-toggle-row:hover {
        background: rgba(56, 189, 248, 0.08);
        border-color: rgba(56, 189, 248, 0.3);
      }
      .a11y-toggle-row input[type="checkbox"] {
        width: 20px;
        height: 20px;
        accent-color: #00f2fe;
        cursor: pointer;
        margin-top: 2px;
      }
      .a11y-toggle-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .a11y-toggle-info strong {
        font-size: 0.95rem;
        color: #f8fafc;
      }
      .a11y-toggle-info span {
        font-size: 0.82rem;
        color: #94a3b8;
        line-height: 1.35;
      }
      .a11y-footer {
        display: flex;
        justify-content: flex-end;
        padding-top: 6px;
      }

      /* High Contrast & Reduced Motion Overrides */
      body.high-contrast {
        filter: contrast(1.25);
      }
      body.high-contrast .hud3d-goal-bar,
      body.high-contrast .hud3d-cockpit-bar,
      body.high-contrast .hud3d-onboard-card,
      body.high-contrast .hud3d-help-card,
      body.high-contrast .hud3d-pause-menu,
      body.high-contrast .result-card-3d {
        background: #000000 !important;
        border: 2px solid #00f2fe !important;
        box-shadow: 0 0 25px rgba(0, 242, 254, 0.6) !important;
      }
      body.high-contrast .hud3d-val,
      body.high-contrast .goal-text,
      body.high-contrast .res-metric-val {
        color: #ffffff !important;
        font-weight: 900 !important;
      }

      body.reduced-motion * {
        animation-duration: 0.001ms !important;
        transition-duration: 0.001ms !important;
      }
    `;
    document.head.appendChild(style);
  }

  _triggerHint(type) {
    const btn = this._container?.querySelector(`.hud3d-dock-btn[data-hint="${type}"]`);
    if (btn && !btn.disabled) {
      btn.click();
    }
  }

  /* ── Public API ─────────────────────────────────────────────── */

  show(gameName = '', level = 1, skill = 'memory', gameId = '') {
    if (!this._built) this.build();
    this._container.style.display = 'flex';
    this._visible = true;
    if (gameId) this._currentGameId = gameId;
    this.setGameInfo(gameName, level, skill);
    this.setScore(0);
    this.setCombo(0);
    this.hidePause();
    this.hideHowToPlay();
  }

  hide() {
    if (this._container) this._container.style.display = 'none';
    this._visible = false;
    this.hideHowToPlay();
  }

  setGoalText(goal) {
    if (this._elements['goal-text']) {
      this._elements['goal-text'].textContent = goal || 'Complete the cognitive challenge mission';
    }
  }

  setRoundInfo(current, total, lives, maxLives = 3, isPractice = false) {
    if (this._elements['round']) {
      this._elements['round'].textContent = isPractice
        ? 'PRACTICE CALIBRATION'
        : `Round ${current} / ${total}`;
    }
    // Update progress meter
    if (this._elements['level-fill']) {
      const pct = Math.min(100, Math.max(5, (current / Math.max(1, total)) * 100));
      this._elements['level-fill'].style.width = `${pct}%`;
    }
    // Update lives hearts
    if (this._elements['lives']) {
      const hearts = this._elements['lives'].querySelectorAll('.hud3d-heart');
      hearts.forEach((h, idx) => {
        if (isPractice) {
          h.classList.add('active');
          h.textContent = '🛡️';
        } else {
          h.textContent = '❤️';
          if (idx < lives) {
            h.classList.add('active');
          } else {
            h.classList.remove('active');
            h.textContent = '🤍';
          }
        }
      });
    }
  }

  showHowToPlay() {
    const overlay = this._elements['help-overlay'];
    if (!overlay) return;

    const info = HOW_TO_PLAY_INFO[this._currentGameId] || HOW_TO_PLAY_INFO['lumen-pond'];
    if (this._elements['help-title']) this._elements['help-title'].textContent = info.title;
    if (this._elements['help-goal']) this._elements['help-goal'].textContent = info.goal;
    if (this._elements['help-controls']) this._elements['help-controls'].textContent = info.controls;
    if (this._elements['help-rules']) this._elements['help-rules'].textContent = info.rules;
    if (this._elements['help-hints']) this._elements['help-hints'].innerHTML = info.hints;

    overlay.style.display = 'flex';
  }

  hideHowToPlay() {
    if (this._elements['help-overlay']) {
      this._elements['help-overlay'].style.display = 'none';
    }
  }

  toggleHowToPlay() {
    if (this._elements['help-overlay']?.style.display === 'flex') {
      this.hideHowToPlay();
    } else {
      this.showHowToPlay();
    }
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
      this._elements['level'].textContent = (level === 0) ? 'Level 0 (Practice)' : `Level ${level} / 30`;
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

  updateTimer(remaining, total = 14) {
    const fraction = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 1;
    this.setTimer(remaining, fraction);
  }

  setTimer(remaining, fraction) {
    const s = Math.max(0, remaining);
    if (this._elements['timer']) {
      this._elements['timer'].textContent = s >= 60
        ? `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
        : s.toFixed(1);

      if (fraction < 0.25) {
        this._elements['timer'].style.color = '#ff4d4d';
      } else if (fraction < 0.5) {
        this._elements['timer'].style.color = '#f59e0b';
      } else {
        this._elements['timer'].style.color = '#00f2fe';
      }
    }

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

  /* ── 3-Step Onboarding & Accessibility Methods ──────────────── */

  initAccessibility() {
    try {
      const saved = localStorage.getItem('mindshift_accessibility');
      if (saved) {
        const prefs = JSON.parse(saved);
        window.__extraTime = !!prefs.extraTime;
        window.__reducedMotion = !!prefs.reducedMotion;
        window.__highContrast = !!prefs.highContrast;
        document.body.classList.toggle('reduced-motion', window.__reducedMotion);
        document.body.classList.toggle('high-contrast', window.__highContrast);
      }
    } catch (e) {
      console.warn('[HUD3D] initAccessibility error:', e);
    }
  }

  _saveA11yPrefs() {
    try {
      const prefs = {
        extraTime: !!window.__extraTime,
        reducedMotion: !!window.__reducedMotion,
        highContrast: !!window.__highContrast
      };
      localStorage.setItem('mindshift_accessibility', JSON.stringify(prefs));
    } catch (e) {}
  }

  showA11yModal() {
    const overlay = this._elements['a11y-overlay'];
    if (!overlay) return;
    if (this._elements['a11y-extra-time']) this._elements['a11y-extra-time'].checked = !!window.__extraTime;
    if (this._elements['a11y-reduced-motion']) this._elements['a11y-reduced-motion'].checked = !!window.__reducedMotion;
    if (this._elements['a11y-high-contrast']) this._elements['a11y-high-contrast'].checked = !!window.__highContrast;
    overlay.style.display = 'flex';
  }

  hideA11yModal() {
    if (this._elements['a11y-overlay']) {
      this._elements['a11y-overlay'].style.display = 'none';
    }
  }

  showOnboarding(gameId, { onPractice, onSkip } = {}) {
    this._currentGameId = gameId || this._currentGameId;
    const overlay = this._elements['onboard-overlay'];
    if (!overlay) return;

    const info = HOW_TO_PLAY_INFO[gameId] || HOW_TO_PLAY_INFO['lumen-pond'];
    if (this._elements['onboard-title']) this._elements['onboard-title'].textContent = info.title;
    if (this._elements['onboard-goal']) this._elements['onboard-goal'].textContent = info.goal;
    if (this._elements['onboard-controls']) this._elements['onboard-controls'].textContent = info.controls;
    if (this._elements['onboard-rules']) this._elements['onboard-rules'].textContent = info.rules;

    const practiceBtn = this._elements['onboard-practice'];
    const skipBtn = this._elements['onboard-skip'];

    if (practiceBtn) {
      const newPractice = practiceBtn.cloneNode(true);
      practiceBtn.parentNode.replaceChild(newPractice, practiceBtn);
      this._elements['onboard-practice'] = newPractice;
      newPractice.addEventListener('click', () => {
        this.hideOnboarding();
        if (onPractice) onPractice();
      });
    }

    if (skipBtn) {
      const newSkip = skipBtn.cloneNode(true);
      skipBtn.parentNode.replaceChild(newSkip, skipBtn);
      this._elements['onboard-skip'] = newSkip;
      newSkip.addEventListener('click', () => {
        this.hideOnboarding();
        if (onSkip) onSkip();
      });
    }

    overlay.style.display = 'flex';
    try { SFXLib.whoosh?.(); } catch (e) {}
  }

  hideOnboarding() {
    if (this._elements['onboard-overlay']) {
      this._elements['onboard-overlay'].style.display = 'none';
    }
  }

  showCountdown(onComplete) {
    const overlay = this._elements['countdown-overlay'];
    const numEl = this._elements['countdown-num'];
    const subEl = this._elements['countdown-sub'];
    if (!overlay || !numEl) {
      if (onComplete) onComplete();
      return;
    }

    overlay.style.display = 'flex';
    let count = 3;
    numEl.textContent = '3';
    numEl.style.color = '#00f2fe';
    if (subEl) subEl.textContent = 'NEURAL PROTOCOL INITIALIZING...';
    try { SFXLib.playTone(440, 0.12, 'sine', 0.2); } catch (e) {}

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        numEl.textContent = String(count);
        if (subEl) subEl.textContent = count === 2 ? 'CALIBRATING SYNAPSES...' : 'FOCUS READY...';
        try { SFXLib.playTone(440 + (3 - count) * 110, 0.12, 'sine', 0.2); } catch (e) {}
      } else if (count === 0) {
        numEl.textContent = 'GO!';
        numEl.style.color = '#10b981';
        if (subEl) subEl.textContent = 'MISSION ACTIVE!';
        try {
          SFXLib.playTone(880, 0.25, 'triangle', 0.3);
        } catch (e) {}
      } else {
        clearInterval(interval);
        overlay.style.display = 'none';
        numEl.style.color = '#00f2fe';
        if (onComplete) onComplete();
      }
    }, 800);
  }
}
