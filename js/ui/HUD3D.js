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
  'hologram-matrix': {
    title: 'Hologram Matrix — Pattern Induction',
    goal: 'Identify the missing geometric rule and complete the holographic matrix.',
    controls: 'Click / Tap candidate solution tiles 1–4 (or keys 1–4).',
    rules: 'Analyze shape transformations across rows and columns. Choose the correct tile to fill the missing slot. 3 lives per level.',
    hints: '⏳ Slow Time: Freezes matrix rotation.<br>👁️ Neural Ping: Eliminates 2 incorrect options.<br>🤖 ARIA Clue: Explains the active row/col pattern rule.'
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
    const existing = document.getElementById('hud-3d');
    if (existing) existing.remove();
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
          <button class="hud3d-help-btn" id="h3d-settings" title="Facility Settings (S)">
            <span class="help-icon">⚙️</span>
            <span class="help-text">Settings</span>
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

      <!-- Prominent Right Side Status Panel (Score, Timer, Lives) -->
      <aside class="hud3d-right-panel" id="h3d-status-panel">
        <div class="rp-header">
          <div class="rp-indicator"><span class="rp-pulse-dot"></span>LIVE TELEMETRY</div>
          <span class="rp-sub">MISSION COCKPIT</span>
        </div>

        <!-- Big Radial Round Timer -->
        <div class="rp-card rp-timer-card">
          <div class="rp-card-header">
            <span class="rp-icon">⏱️</span>
            <span class="rp-card-title">ROUND TIMER</span>
          </div>
          <div class="rp-radial-wrap">
            <svg class="rp-radial-svg" viewBox="0 0 88 88">
              <circle class="rp-circle-bg" cx="44" cy="44" r="38"></circle>
              <circle class="rp-circle-bar" id="h3d-panel-timer-circle" cx="44" cy="44" r="38"></circle>
            </svg>
            <div class="rp-radial-center">
              <span class="rp-timer-digits" id="h3d-panel-timer">14.0</span>
              <span class="rp-timer-unit">SEC</span>
            </div>
          </div>
        </div>

        <!-- Big 3 Lives Meter -->
        <div class="rp-card rp-lives-card">
          <div class="rp-card-header">
            <span class="rp-icon">❤️</span>
            <span class="rp-card-title">LIVES REMAINING</span>
          </div>
          <div class="rp-lives-row" id="h3d-panel-lives">
            <span class="rp-heart active" data-heart="1">❤️</span>
            <span class="rp-heart active" data-heart="2">❤️</span>
            <span class="rp-heart active" data-heart="3">❤️</span>
          </div>
          <div class="rp-lives-status" id="h3d-panel-lives-text">3 / 3 LIVES ACTIVE</div>
        </div>

        <!-- Big Mission Score & Combo Streak -->
        <div class="rp-card rp-score-card">
          <div class="rp-card-header">
            <span class="rp-icon">🏆</span>
            <span class="rp-card-title">MISSION SCORE</span>
          </div>
          <div class="rp-score-val" id="h3d-panel-score">0</div>
          <div class="rp-combo-pill" id="h3d-panel-combo">
            <span class="rp-combo-label">COMBO</span>
            <span class="rp-combo-val" id="h3d-panel-combo-val">0×</span>
          </div>
        </div>

        <!-- Panel Quick Actions -->
        <div class="rp-actions">
          <button class="rp-btn" id="h3d-rp-pause" title="Pause Game (P / Esc)">⏸ Pause</button>
          <button class="rp-btn" id="h3d-rp-settings" title="Settings (S)">⚙️ Settings</button>
        </div>
      </aside>

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
          <button class="hud3d-menu-btn" id="h3d-pause-settings">⚙️ Facility Settings</button>
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

      <!-- Facility Settings Modal (Replaces A11y with full settings suite) -->
      <div class="hud3d-settings-overlay" id="h3d-settings-overlay" style="display:none">
        <div class="hud3d-settings-card">
          <div class="settings-card-header">
            <div class="settings-header-title">
              <span class="settings-header-icon">⚙️</span>
              <div>
                <h2>FACILITY SETTINGS</h2>
                <p class="settings-header-sub">Configure acoustic synthesis, cognitive pacing, visuals & telemetry</p>
              </div>
            </div>
            <button class="help-close-btn" id="h3d-settings-close" title="Close Settings (Esc)">✕</button>
          </div>

          <!-- Navigation Tabs -->
          <div class="settings-tabs-nav" id="h3d-settings-tabs">
            <button class="settings-tab-btn active" data-tab="audio">🔊 Audio</button>
            <button class="settings-tab-btn" data-tab="gameplay">⏱️ Gameplay</button>
            <button class="settings-tab-btn" data-tab="display">🖥️ Display</button>
            <button class="settings-tab-btn" data-tab="controls">🎮 Controls</button>
            <button class="settings-tab-btn" data-tab="data">💾 Progress Data</button>
          </div>

          <!-- Tab 1: Audio -->
          <div class="settings-tab-panel active" id="tab-audio">
            <div class="setting-row">
              <div class="setting-meta">
                <strong>Master Volume</strong>
                <span>Overall acoustic loudness across all procedural synthesis channels</span>
              </div>
              <div class="setting-ctrl slider-ctrl">
                <input type="range" id="h3d-set-master-vol" min="0" max="100" value="70">
                <span class="slider-val" id="h3d-set-master-val">70%</span>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-meta">
                <strong>Sound Effects (SFX)</strong>
                <span>Lily pad tones, matrix chimes, combo pings & button feedback</span>
              </div>
              <div class="setting-ctrl slider-ctrl">
                <input type="range" id="h3d-set-sfx-vol" min="0" max="100" value="70">
                <span class="slider-val" id="h3d-set-sfx-val">70%</span>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-meta">
                <strong>Ambient Synthesizer</strong>
                <span>Subtle background cognitive drone & harmonic frequency pad</span>
              </div>
              <div class="setting-ctrl slider-ctrl">
                <input type="range" id="h3d-set-music-vol" min="0" max="100" value="50">
                <span class="slider-val" id="h3d-set-music-val">50%</span>
              </div>
            </div>

            <div class="setting-row actions-row" style="border:none;padding-top:4px;">
              <button class="hud3d-menu-btn" id="h3d-set-test-audio" style="width:auto;padding:8px 16px;font-size:0.85rem;">
                🔔 Test Sound Chime
              </button>
              <button class="hud3d-menu-btn" id="h3d-set-mute-btn" style="width:auto;padding:8px 16px;font-size:0.85rem;">
                🔇 Mute All Audio
              </button>
            </div>
          </div>

          <!-- Tab 2: Gameplay -->
          <div class="settings-tab-panel" id="tab-gameplay">
            <label class="setting-toggle-card">
              <input type="checkbox" id="h3d-set-extra-time">
              <div class="toggle-card-info">
                <strong>Extra Time Multiplier (1.5× Timer)</strong>
                <span>Expands round time limits by +50% for relaxed cognitive processing.</span>
              </div>
            </label>

            <label class="setting-toggle-card">
              <input type="checkbox" id="h3d-set-auto-aria">
              <div class="toggle-card-info">
                <strong>Adaptive ARIA Assistance</strong>
                <span>Automatically displays helpful guidance subtitles when struggling on tricky rounds.</span>
              </div>
            </label>

            <div class="setting-action-card">
              <div>
                <strong>Calibration Practice Trial (Level 0)</strong>
                <span>Run infinite-shield practice round with step-by-step guidance.</span>
              </div>
              <button class="hud3d-menu-btn primary" id="h3d-set-launch-practice" style="width:auto;padding:8px 16px;white-space:nowrap;">
                🟢 Start Practice (Lv 0)
              </button>
            </div>
          </div>

          <!-- Tab 3: Display -->
          <div class="settings-tab-panel" id="tab-display">
            <label class="setting-toggle-card">
              <input type="checkbox" id="h3d-set-high-contrast">
              <div class="toggle-card-info">
                <strong>High Contrast Mode</strong>
                <span>Deep obsidian contrast, brightened neon borders, and max legible text rendering.</span>
              </div>
            </label>

            <label class="setting-toggle-card">
              <input type="checkbox" id="h3d-set-reduced-motion">
              <div class="toggle-card-info">
                <strong>Reduced Motion</strong>
                <span>Suppresses 3D camera sweeps, shakes, and heavy particle explosions.</span>
              </div>
            </label>

            <label class="setting-toggle-card">
              <input type="checkbox" id="h3d-set-show-fps">
              <div class="toggle-card-info">
                <strong>Diagnostics Telemetry Overlay (F3)</strong>
                <span>Real-time display of frame rate (FPS), WebGL draw calls, and Elo ratings.</span>
              </div>
            </label>
          </div>

          <!-- Tab 4: Controls Guide -->
          <div class="settings-tab-panel" id="tab-controls">
            <div class="controls-guide-grid">
              <div class="control-key-item">
                <span class="control-kbd">1 – 7</span>
                <span class="control-desc">Select Pads (Lumen Pond) or Matrix Options (1–4)</span>
              </div>
              <div class="control-key-item">
                <span class="control-kbd">1</span>
                <span class="control-desc">Hint: Chrono Dilate (Slow Time)</span>
              </div>
              <div class="control-key-item">
                <span class="control-kbd">2</span>
                <span class="control-desc">Hint: Neural Ping (Highlight Next Target)</span>
              </div>
              <div class="control-key-item">
                <span class="control-kbd">3</span>
                <span class="control-desc">Hint: ARIA Cognitive Clue</span>
              </div>
              <div class="control-key-item">
                <span class="control-kbd">P / Esc</span>
                <span class="control-desc">Pause / Resume Trial</span>
              </div>
              <div class="control-key-item">
                <span class="control-kbd">H</span>
                <span class="control-desc">Open How-to-Play Guide</span>
              </div>
              <div class="control-key-item">
                <span class="control-kbd">S</span>
                <span class="control-desc">Open / Close Facility Settings</span>
              </div>
              <div class="control-key-item">
                <span class="control-kbd">Tab</span>
                <span class="control-desc">Catalogue Terminal (All Games)</span>
              </div>
              <div class="control-key-item">
                <span class="control-kbd">F3</span>
                <span class="control-desc">Toggle Diagnostic Telemetry Overlay</span>
              </div>
            </div>
          </div>

          <!-- Tab 5: Data Management -->
          <div class="settings-tab-panel" id="tab-data">
            <div class="data-mgmt-card">
              <div class="data-mgmt-info">
                <strong>Reset Progress for Active Game</strong>
                <span>Re-locks levels 2–30 for this game and resets star ratings. Level 1 stays unlocked.</span>
              </div>
              <button class="hud3d-menu-btn danger" id="h3d-set-reset-game" style="width:auto;padding:8px 16px;">
                🔄 Reset Active Game
              </button>
            </div>
            <div class="data-mgmt-card">
              <div class="data-mgmt-info">
                <strong>Reset All Facility Progress</strong>
                <span>Completely resets all unlocked levels and stars across all cognitive challenges.</span>
              </div>
              <button class="hud3d-menu-btn danger" id="h3d-set-reset-all" style="width:auto;padding:8px 16px;">
                ⚠️ Reset All Data
              </button>
            </div>
            <div id="h3d-set-data-msg" class="data-feedback-msg" style="display:none"></div>
          </div>

          <div class="settings-card-footer">
            <button class="hud3d-menu-btn primary" id="h3d-settings-confirm">Save & Close</button>
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
    this.initSettings();
  }

  _cacheElements() {
    const ids = [
      'back', 'help', 'settings', 'score', 'combo', 'game-name', 'level', 'round', 'domain-pill',
      'level-fill', 'lives', 'timer', 'timer-circle', 'timer-box', 'hints', 'pause',
      'catalogue', 'subtitle', 'sub-text', 'popup', 'pause-overlay', 'resume', 'restart',
      'quit', 'pause-help', 'pause-settings', 'debug', 'debug-content', 'goal', 'goal-text',
      'help-overlay', 'help-close', 'help-confirm', 'help-practice', 'help-title', 'help-goal',
      'help-controls', 'help-rules', 'help-hints',
      'onboard-overlay', 'onboard-title', 'onboard-goal', 'onboard-controls', 'onboard-rules',
      'onboard-skip', 'onboard-practice',
      'countdown-overlay', 'countdown-num', 'countdown-sub',
      'status-panel', 'panel-timer', 'panel-timer-circle', 'panel-lives', 'panel-lives-text',
      'panel-score', 'panel-combo', 'panel-combo-val', 'rp-pause', 'rp-settings',
      'settings-overlay', 'settings-close', 'settings-confirm',
      'set-master-vol', 'set-master-val', 'set-sfx-vol', 'set-sfx-val', 'set-music-vol', 'set-music-val',
      'set-test-audio', 'set-mute-btn',
      'set-extra-time', 'set-auto-aria', 'set-launch-practice',
      'set-high-contrast', 'set-reduced-motion', 'set-show-fps',
      'set-reset-game', 'set-reset-all', 'set-data-msg'
    ];
    for (const id of ids) {
      this._elements[id] = this._container?.querySelector(`#h3d-${id}`) || document.getElementById(`h3d-${id}`);
    }

    // Legacy a11y ID aliases for full backwards compatibility
    this._elements['a11y'] = this._elements['settings'];
    this._elements['pause-a11y'] = this._elements['pause-settings'];
    this._elements['a11y-overlay'] = this._elements['settings-overlay'];
    this._elements['a11y-close'] = this._elements['settings-close'];
    this._elements['a11y-confirm'] = this._elements['settings-confirm'];
    this._elements['a11y-extra-time'] = this._elements['set-extra-time'];
    this._elements['a11y-reduced-motion'] = this._elements['set-reduced-motion'];
    this._elements['a11y-high-contrast'] = this._elements['set-high-contrast'];
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

    // Facility Settings triggers
    this._elements['settings']?.addEventListener('click', () => {
      SFXLib.click?.() || SFXLib.playClick?.();
      this.showSettingsModal();
    });
    this._elements['pause-settings']?.addEventListener('click', () => {
      SFXLib.click?.() || SFXLib.playClick?.();
      this.showSettingsModal();
    });
    this._elements['rp-settings']?.addEventListener('click', () => {
      SFXLib.click?.() || SFXLib.playClick?.();
      this.showSettingsModal();
    });
    this._elements['rp-pause']?.addEventListener('click', () => {
      SFXLib.click?.() || SFXLib.playClick?.();
      this.togglePause();
    });
    this._elements['settings-close']?.addEventListener('click', () => this.hideSettingsModal());
    this._elements['settings-confirm']?.addEventListener('click', () => this.hideSettingsModal());

    // Settings Navigation Tabs
    const tabBtns = this._container?.querySelectorAll('.settings-tab-btn');
    tabBtns?.forEach(btn => {
      btn.addEventListener('click', () => {
        SFXLib.click?.();
        const tabName = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.toggle('active', b === btn));
        const panels = this._container?.querySelectorAll('.settings-tab-panel');
        panels?.forEach(p => p.classList.toggle('active', p.id === `tab-${tabName}`));
      });
    });

    // Audio Settings Sliders
    this._elements['set-master-vol']?.addEventListener('input', (e) => {
      const val = Number(e.target.value) || 0;
      if (this._elements['set-master-val']) this._elements['set-master-val'].textContent = `${val}%`;
      SFXLib.setMasterVolume(val / 100);
      this._saveSettings();
    });
    this._elements['set-sfx-vol']?.addEventListener('input', (e) => {
      const val = Number(e.target.value) || 0;
      if (this._elements['set-sfx-val']) this._elements['set-sfx-val'].textContent = `${val}%`;
      SFXLib.setSFXVolume(val / 100);
      this._saveSettings();
    });
    this._elements['set-music-vol']?.addEventListener('input', (e) => {
      const val = Number(e.target.value) || 0;
      if (this._elements['set-music-val']) this._elements['set-music-val'].textContent = `${val}%`;
      SFXLib.setMusicVolume(val / 100);
      this._saveSettings();
    });

    // Audio Test & Mute
    this._elements['set-test-audio']?.addEventListener('click', () => {
      SFXLib.correct?.();
      this.flashPopup('🔔 Sound Chime Tested', '#00f2fe');
    });
    this._elements['set-mute-btn']?.addEventListener('click', () => {
      const current = (typeof SFXLib.getMasterVolume === 'function') ? SFXLib.getMasterVolume() : 0.7;
      if (current > 0) {
        this._prevMasterVol = current;
        SFXLib.setMasterVolume(0);
        if (this._elements['set-master-vol']) this._elements['set-master-vol'].value = 0;
        if (this._elements['set-master-val']) this._elements['set-master-val'].textContent = '0%';
        this._elements['set-mute-btn'].textContent = '🔊 Unmute All';
        this.flashPopup('Audio: MUTED', '#ef4444');
      } else {
        const restored = this._prevMasterVol || 0.7;
        SFXLib.setMasterVolume(restored);
        const pct = Math.round(restored * 100);
        if (this._elements['set-master-vol']) this._elements['set-master-vol'].value = pct;
        if (this._elements['set-master-val']) this._elements['set-master-val'].textContent = `${pct}%`;
        this._elements['set-mute-btn'].textContent = '🔇 Mute All Audio';
        this.flashPopup('Audio: RESTORED', '#00f2fe');
      }
      this._saveSettings();
    });

    // Gameplay Toggles & Practice Launch
    this._elements['set-extra-time']?.addEventListener('change', (e) => {
      window.__extraTime = e.target.checked;
      this._saveSettings();
      this.flashPopup(window.__extraTime ? 'Extra Time: ACTIVE (1.5× Timer)' : 'Extra Time: Disabled', '#00f2fe');
    });
    this._elements['set-auto-aria']?.addEventListener('change', (e) => {
      window.__autoAria = e.target.checked;
      this._saveSettings();
      this.flashPopup(window.__autoAria ? 'ARIA Assist: ACTIVE' : 'ARIA Assist: Standby', '#00f2fe');
    });
    this._elements['set-launch-practice']?.addEventListener('click', () => {
      this.hideSettingsModal();
      EventBus.emit('game:practice', { gameId: this._currentGameId });
    });

    // Display Toggles
    this._elements['set-high-contrast']?.addEventListener('change', (e) => {
      window.__highContrast = e.target.checked;
      document.body.classList.toggle('high-contrast', e.target.checked);
      this._saveSettings();
      this.flashPopup(window.__highContrast ? 'High Contrast: ACTIVE' : 'High Contrast: Disabled', '#00f2fe');
    });
    this._elements['set-reduced-motion']?.addEventListener('change', (e) => {
      window.__reducedMotion = e.target.checked;
      document.body.classList.toggle('reduced-motion', e.target.checked);
      this._saveSettings();
      this.flashPopup(window.__reducedMotion ? 'Reduced Motion: ACTIVE' : 'Reduced Motion: Disabled', '#00f2fe');
    });
    this._elements['set-show-fps']?.addEventListener('change', (e) => {
      this._debugVisible = e.target.checked;
      if (this._elements['debug']) {
        this._elements['debug'].style.display = this._debugVisible ? 'block' : 'none';
      }
      this._saveSettings();
    });

    // Progress Data Reset Buttons
    this._elements['set-reset-game']?.addEventListener('click', () => {
      const ok = confirm(`Reset unlocked levels for ${this._currentGameId}? Levels 2–30 will be locked.`);
      if (ok) {
        EventBus.emit('progress:reset', { gameId: this._currentGameId });
        if (this._elements['set-data-msg']) {
          this._elements['set-data-msg'].textContent = `✓ Progress for ${this._currentGameId} reset to Level 1.`;
          this._elements['set-data-msg'].style.display = 'block';
        }
      }
    });
    this._elements['set-reset-all']?.addEventListener('click', () => {
      const ok = confirm('WARNING: Reset ALL progress across all games? All levels 2–30 will be locked.');
      if (ok) {
        EventBus.emit('progress:reset', { all: true });
        if (this._elements['set-data-msg']) {
          this._elements['set-data-msg'].textContent = '✓ All facility game progress reset to Level 1.';
          this._elements['set-data-msg'].style.display = 'block';
        }
      }
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

    // Hotkeys (Esc or P for pause, H for help, S for settings)
    document.addEventListener('keydown', (e) => {
      if (!this._visible) return;
      if (e.key === 'Escape') {
        if (this._elements['help-overlay']?.style.display === 'flex') {
          this.hideHowToPlay();
        } else if (this._elements['settings-overlay']?.style.display === 'flex') {
          this.hideSettingsModal();
        } else if (this._elements['onboard-overlay']?.style.display === 'flex') {
          this.hideOnboarding();
        } else {
          this.togglePause();
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (!e.target?.matches?.('input, textarea')) {
          this.togglePause();
        }
      } else if (e.key === 's' || e.key === 'S') {
        if (!e.target?.matches?.('input, textarea')) {
          this.toggleSettingsModal();
        }
      } else if (e.key === 'h' || e.key === 'H') {
        if (!e.target?.matches?.('input, textarea')) {
          this.toggleHowToPlay();
        }
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
        if (this._elements['set-show-fps']) {
          this._elements['set-show-fps'].checked = this._debugVisible;
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

      /* ── Prominent Right Side Status Panel (Score, Timer, Lives) ── */
      .hud3d-right-panel {
        position: fixed;
        top: 76px;
        right: 22px;
        width: 196px;
        background: rgba(8, 16, 32, 0.92);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1.5px solid rgba(0, 242, 254, 0.35);
        border-radius: 20px;
        box-shadow: 0 16px 45px rgba(0, 0, 0, 0.65), 0 0 28px rgba(0, 242, 254, 0.16);
        padding: 14px 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 60;
        pointer-events: auto;
        user-select: none;
        animation: rpSlideIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      @keyframes rpSlideIn {
        from { opacity: 0; transform: translateX(20px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      .rp-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 2px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 8px;
      }
      .rp-indicator {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        color: #00f2fe;
        text-transform: uppercase;
      }
      .rp-pulse-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #00f2fe;
        box-shadow: 0 0 8px #00f2fe;
        animation: rpPulse 1.2s infinite alternate;
      }
      @keyframes rpPulse {
        from { transform: scale(0.9); opacity: 0.7; }
        to   { transform: scale(1.3); opacity: 1; }
      }
      .rp-sub {
        font-size: 0.6rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: #64748b;
        text-transform: uppercase;
      }
      .rp-card {
        background: rgba(15, 23, 42, 0.78);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 8px 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 4px;
        transition: border-color 0.2s;
      }
      .rp-card:hover {
        border-color: rgba(0, 242, 254, 0.3);
      }
      .rp-card-header {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.65rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        color: #94a3b8;
        text-transform: uppercase;
      }
      .rp-card-header .rp-icon {
        font-size: 0.82rem;
      }

      /* Big Radial Timer in Right Panel */
      .rp-radial-wrap {
        position: relative;
        width: 88px;
        height: 88px;
        margin: 2px auto 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .rp-radial-svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }
      .rp-circle-bg {
        stroke: rgba(255, 255, 255, 0.1);
        stroke-width: 6;
        fill: none;
      }
      .rp-circle-bar {
        stroke: #00f2fe;
        stroke-width: 6;
        stroke-linecap: round;
        fill: none;
        transition: stroke-dashoffset 0.1s linear, stroke 0.3s;
        filter: drop-shadow(0 0 6px rgba(0, 242, 254, 0.45));
      }
      .rp-radial-center {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }
      .rp-timer-digits {
        font-family: var(--font-mono, monospace);
        font-size: 1.65rem;
        font-weight: 900;
        line-height: 1;
        color: #00f2fe;
        text-shadow: 0 0 14px rgba(0, 242, 254, 0.45);
      }
      .rp-timer-unit {
        font-size: 0.55rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        color: #64748b;
        margin-top: 3px;
      }

      /* Big Lives Meter in Right Panel */
      .rp-lives-row {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        margin: 4px 0 2px 0;
      }
      .rp-heart {
        font-size: 1.65rem;
        filter: grayscale(1);
        opacity: 0.28;
        transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .rp-heart.active {
        filter: none;
        opacity: 1;
        transform: scale(1.08);
        filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.65));
        animation: rpHeartPulse 1.6s infinite alternate;
      }
      @keyframes rpHeartPulse {
        from { transform: scale(1.02); }
        to   { transform: scale(1.16); }
      }
      .rp-lives-status {
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        color: #cbd5e1;
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 2px 8px;
        margin-top: 2px;
        white-space: nowrap;
      }

      /* Big Score & Combo in Right Panel */
      .rp-score-val {
        font-family: var(--font-mono, monospace);
        font-size: 1.75rem;
        font-weight: 900;
        color: #ffffff;
        text-shadow: 0 0 16px rgba(0, 242, 254, 0.45);
        line-height: 1.1;
        margin: 2px 0;
      }
      .rp-combo-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 3px 10px;
        font-size: 0.72rem;
        font-weight: 800;
        color: #94a3b8;
        transition: all 0.3s;
      }
      .rp-combo-pill.active {
        background: rgba(245, 158, 11, 0.22);
        border-color: #f59e0b;
        color: #f59e0b;
        box-shadow: 0 0 14px rgba(245, 158, 11, 0.45);
        animation: pulseCombo 0.4s ease infinite alternate;
      }

      /* Panel Quick Actions */
      .rp-actions {
        display: flex;
        gap: 6px;
        margin-top: 2px;
      }
      .rp-btn {
        flex: 1;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 8px;
        padding: 7px 6px;
        color: #e2e8f0;
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
        white-space: nowrap;
      }
      .rp-btn:hover {
        background: rgba(0, 242, 254, 0.2);
        border-color: #00f2fe;
        color: #00f2fe;
        transform: translateY(-1px);
      }

      /* ── Facility Settings Modal ── */
      .hud3d-settings-overlay {
        position: fixed;
        inset: 0;
        background: rgba(4, 9, 20, 0.90);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        z-index: 260;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: settingsFadeIn 0.25s ease;
      }
      @keyframes settingsFadeIn {
        from { opacity: 0; transform: scale(0.96); }
        to   { opacity: 1; transform: scale(1); }
      }
      .hud3d-settings-card {
        background: rgba(15, 23, 42, 0.98);
        border: 2px solid #00f2fe;
        box-shadow: 0 0 45px rgba(0, 242, 254, 0.35);
        border-radius: 22px;
        width: 100%;
        max-width: 620px;
        padding: 26px 30px;
        color: #f1f5f9;
        display: flex;
        flex-direction: column;
        gap: 18px;
        max-height: 90vh;
        overflow-y: auto;
      }
      .settings-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        padding-bottom: 14px;
      }
      .settings-header-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .settings-header-icon {
        font-size: 1.8rem;
      }
      .settings-header-title h2 {
        font-size: 1.35rem;
        color: #00f2fe;
        margin: 0;
        font-family: var(--font-display, 'Outfit', sans-serif);
        letter-spacing: 0.05em;
      }
      .settings-header-sub {
        font-size: 0.8rem;
        color: #94a3b8;
        margin: 2px 0 0 0;
      }

      /* Settings Navigation Tabs */
      .settings-tabs-nav {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .settings-tab-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        padding: 7px 14px;
        color: #cbd5e1;
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .settings-tab-btn:hover {
        background: rgba(0, 242, 254, 0.15);
        color: #00f2fe;
        border-color: rgba(0, 242, 254, 0.4);
      }
      .settings-tab-btn.active {
        background: #00f2fe;
        color: #051322;
        border-color: #00f2fe;
        box-shadow: 0 0 14px rgba(0, 242, 254, 0.4);
      }

      /* Tab Panels */
      .settings-tab-panel {
        display: none;
        flex-direction: column;
        gap: 14px;
        min-height: 220px;
      }
      .settings-tab-panel.active {
        display: flex !important;
      }

      /* Setting Rows & Controls */
      .setting-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 12px 16px;
      }
      .setting-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .setting-meta strong {
        font-size: 0.92rem;
        color: #f8fafc;
      }
      .setting-meta span {
        font-size: 0.8rem;
        color: #94a3b8;
        line-height: 1.3;
      }
      .setting-ctrl.slider-ctrl {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 170px;
      }
      .setting-ctrl input[type="range"] {
        flex: 1;
        accent-color: #00f2fe;
        cursor: pointer;
      }
      .slider-val {
        font-family: var(--font-mono, monospace);
        font-size: 0.85rem;
        font-weight: 800;
        color: #00f2fe;
        min-width: 42px;
        text-align: right;
      }

      .setting-toggle-card {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 14px 16px;
        transition: background 0.2s, border-color 0.2s;
      }
      .setting-toggle-card:hover {
        background: rgba(0, 242, 254, 0.07);
        border-color: rgba(0, 242, 254, 0.3);
      }
      .setting-toggle-card input[type="checkbox"] {
        width: 20px;
        height: 20px;
        accent-color: #00f2fe;
        cursor: pointer;
        margin-top: 2px;
      }
      .toggle-card-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .toggle-card-info strong {
        font-size: 0.92rem;
        color: #f8fafc;
      }
      .toggle-card-info span {
        font-size: 0.8rem;
        color: #94a3b8;
        line-height: 1.35;
      }

      .setting-action-card,
      .data-mgmt-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 14px 16px;
      }
      .data-mgmt-info strong {
        font-size: 0.92rem;
        color: #f8fafc;
        display: block;
        margin-bottom: 2px;
      }
      .data-mgmt-info span {
        font-size: 0.8rem;
        color: #94a3b8;
        line-height: 1.35;
      }
      .data-feedback-msg {
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid #10b981;
        color: #a7f3d0;
        font-size: 0.85rem;
        font-weight: 700;
        border-radius: 10px;
        padding: 10px 14px;
        text-align: center;
      }

      /* Controls Guide Grid */
      .controls-guide-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 10px;
      }
      .control-key-item {
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 10px 12px;
      }
      .control-kbd {
        font-family: var(--font-mono, monospace);
        background: rgba(0, 242, 254, 0.12);
        border: 1px solid rgba(0, 242, 254, 0.4);
        color: #00f2fe;
        font-weight: 800;
        font-size: 0.82rem;
        padding: 4px 10px;
        border-radius: 6px;
        min-width: 48px;
        text-align: center;
      }
      .control-desc {
        font-size: 0.82rem;
        color: #cbd5e1;
        line-height: 1.3;
      }

      .settings-card-footer {
        display: flex;
        justify-content: flex-end;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      /* High Contrast & Reduced Motion Overrides */
      body.high-contrast {
        filter: contrast(1.25);
      }
      body.high-contrast .hud3d-goal-bar,
      body.high-contrast .hud3d-cockpit-bar,
      body.high-contrast .hud3d-right-panel,
      body.high-contrast .hud3d-settings-card,
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
    // Update top bar lives hearts
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

    // Update Right Panel Lives Gauge
    if (this._elements['panel-lives']) {
      const pHearts = this._elements['panel-lives'].querySelectorAll('.rp-heart');
      pHearts.forEach((h, idx) => {
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
    if (this._elements['panel-lives-text']) {
      this._elements['panel-lives-text'].textContent = isPractice
        ? '🛡️ SHIELD ACTIVE (PRACTICE)'
        : `${lives} / ${maxLives} LIVES ACTIVE`;
      if (!isPractice && lives <= 1) {
        this._elements['panel-lives-text'].style.color = '#ef4444';
      } else {
        this._elements['panel-lives-text'].style.color = '#e2e8f0';
      }
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
    const formatted = Math.round(score).toLocaleString();
    if (this._elements['score']) {
      this._elements['score'].textContent = formatted;
    }
    if (this._elements['panel-score']) {
      this._elements['panel-score'].textContent = formatted;
    }
  }

  updateScore(score) {
    this.setScore(score);
  }

  setCombo(combo) {
    const comboStr = combo > 0 ? `${combo}×` : '0×';
    if (this._elements['combo']) {
      this._elements['combo'].textContent = comboStr;
      if (combo > 1) {
        this._elements['combo'].classList.add('hud3d-combo-flame');
      } else {
        this._elements['combo'].classList.remove('hud3d-combo-flame');
      }
    }
    if (this._elements['panel-combo-val']) {
      this._elements['panel-combo-val'].textContent = comboStr;
    }
    if (this._elements['panel-combo']) {
      if (combo > 1) {
        this._elements['panel-combo'].classList.add('active');
      } else {
        this._elements['panel-combo'].classList.remove('active');
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
    const timeFormatted = s >= 60
      ? `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
      : s.toFixed(1);

    const timerColor = fraction < 0.25 ? '#ff4d4d' : (fraction < 0.5 ? '#f59e0b' : '#00f2fe');

    if (this._elements['timer']) {
      this._elements['timer'].textContent = timeFormatted;
      this._elements['timer'].style.color = timerColor;
    }

    if (this._elements['timer-circle']) {
      const circ = 113.1;
      const offset = circ * (1 - fraction);
      this._elements['timer-circle'].style.strokeDasharray = `${circ}`;
      this._elements['timer-circle'].style.strokeDashoffset = `${offset}`;
      this._elements['timer-circle'].style.stroke = timerColor;
    }

    // Update Right Panel Radial Gauge & Digits
    if (this._elements['panel-timer']) {
      this._elements['panel-timer'].textContent = timeFormatted;
      this._elements['panel-timer'].style.color = timerColor;
    }

    if (this._elements['panel-timer-circle']) {
      const circ = 238.76;
      const offset = circ * (1 - fraction);
      this._elements['panel-timer-circle'].style.strokeDasharray = `${circ}`;
      this._elements['panel-timer-circle'].style.strokeDashoffset = `${offset}`;
      this._elements['panel-timer-circle'].style.stroke = timerColor;
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

  /* ── Facility Settings & Accessibility Methods ──────────────── */

  initSettings() {
    try {
      const saved = localStorage.getItem('mindshift_settings') || localStorage.getItem('mindshift_accessibility');
      if (saved) {
        const prefs = JSON.parse(saved);
        window.__extraTime = !!prefs.extraTime;
        window.__autoAria = prefs.autoAria !== false;
        window.__reducedMotion = !!prefs.reducedMotion;
        window.__highContrast = !!prefs.highContrast;

        if (prefs.masterVolume !== undefined) {
          SFXLib.setMasterVolume(prefs.masterVolume);
        }
        if (prefs.sfxVolume !== undefined) {
          SFXLib.setSFXVolume(prefs.sfxVolume);
        }
        if (prefs.musicVolume !== undefined) {
          SFXLib.setMusicVolume(prefs.musicVolume);
        }

        document.body.classList.toggle('reduced-motion', window.__reducedMotion);
        document.body.classList.toggle('high-contrast', window.__highContrast);

        if (prefs.showFps) {
          this._debugVisible = true;
          if (this._elements['debug']) this._elements['debug'].style.display = 'block';
        }
      }
    } catch (e) {
      console.warn('[HUD3D] initSettings error:', e);
    }
  }

  _saveSettings() {
    try {
      const prefs = {
        extraTime: !!window.__extraTime,
        autoAria: window.__autoAria !== false,
        reducedMotion: !!window.__reducedMotion,
        highContrast: !!window.__highContrast,
        showFps: !!this._debugVisible,
        masterVolume: (typeof SFXLib.getMasterVolume === 'function') ? SFXLib.getMasterVolume() : 0.7,
        sfxVolume: (typeof SFXLib.getSFXVolume === 'function') ? SFXLib.getSFXVolume() : 0.7,
        musicVolume: (typeof SFXLib.getMusicVolume === 'function') ? SFXLib.getMusicVolume() : 0.5
      };
      localStorage.setItem('mindshift_settings', JSON.stringify(prefs));
      localStorage.setItem('mindshift_accessibility', JSON.stringify(prefs));
    } catch (e) {}
  }

  showSettingsModal(tabName = 'audio') {
    const overlay = this._elements['settings-overlay'];
    if (!overlay) return;

    // Sync input states from active settings
    const masterVol = (typeof SFXLib.getMasterVolume === 'function') ? Math.round(SFXLib.getMasterVolume() * 100) : 70;
    const sfxVol = (typeof SFXLib.getSFXVolume === 'function') ? Math.round(SFXLib.getSFXVolume() * 100) : 70;
    const musicVol = (typeof SFXLib.getMusicVolume === 'function') ? Math.round(SFXLib.getMusicVolume() * 100) : 50;

    if (this._elements['set-master-vol']) this._elements['set-master-vol'].value = masterVol;
    if (this._elements['set-master-val']) this._elements['set-master-val'].textContent = `${masterVol}%`;
    if (this._elements['set-sfx-vol']) this._elements['set-sfx-vol'].value = sfxVol;
    if (this._elements['set-sfx-val']) this._elements['set-sfx-val'].textContent = `${sfxVol}%`;
    if (this._elements['set-music-vol']) this._elements['set-music-vol'].value = musicVol;
    if (this._elements['set-music-val']) this._elements['set-music-val'].textContent = `${musicVol}%`;

    if (this._elements['set-extra-time']) this._elements['set-extra-time'].checked = !!window.__extraTime;
    if (this._elements['set-auto-aria']) this._elements['set-auto-aria'].checked = window.__autoAria !== false;
    if (this._elements['set-high-contrast']) this._elements['set-high-contrast'].checked = !!window.__highContrast;
    if (this._elements['set-reduced-motion']) this._elements['set-reduced-motion'].checked = !!window.__reducedMotion;
    if (this._elements['set-show-fps']) this._elements['set-show-fps'].checked = !!this._debugVisible;

    // Reset data msg
    if (this._elements['set-data-msg']) this._elements['set-data-msg'].style.display = 'none';

    // Switch tab if specified
    if (tabName) {
      const tabBtns = this._container?.querySelectorAll('.settings-tab-btn');
      tabBtns?.forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
      const panels = this._container?.querySelectorAll('.settings-tab-panel');
      panels?.forEach(p => p.classList.toggle('active', p.id === `tab-${tabName}`));
    }

    if (!this._paused) {
      this._settingsPausedGame = true;
      this.togglePause();
    }

    overlay.style.display = 'flex';
  }

  hideSettingsModal() {
    if (this._elements['settings-overlay']) {
      this._elements['settings-overlay'].style.display = 'none';
    }
    if (this._settingsPausedGame) {
      this._settingsPausedGame = false;
      if (this._paused) this.togglePause();
    }
  }

  toggleSettingsModal() {
    if (this._elements['settings-overlay']?.style.display === 'flex') {
      this.hideSettingsModal();
    } else {
      this.showSettingsModal();
    }
  }

  // Aliases for backwards compatibility
  initAccessibility() { this.initSettings(); }
  _saveA11yPrefs() { this._saveSettings(); }
  showA11yModal() { this.showSettingsModal('display'); }
  hideA11yModal() { this.hideSettingsModal(); }

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
