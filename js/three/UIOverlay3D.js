/* ═══════════════════════════════════════════════════════════════
   UIOverlay3D.js — 3D HUD Bridge & Compatibility Layer
   Wraps HUD.js and forwards legacy calls to EventBus.
   ═══════════════════════════════════════════════════════════════ */

import { HUD } from '../ui/HUD.js';
import { EventBus } from '../core/EventBus.js';

export class UIOverlay3D {
  constructor({ adaptive, session, onHint, onExit }) {
    this.adaptive = adaptive;
    this.session  = session;
    this.onHint   = onHint;
    this.onExit   = onExit;

    this.hud = new HUD({
      onHint: () => {
        if (this.onHint) this.onHint();
      },
      onExit: () => {
        if (this.onExit) this.onExit();
      }
    });

    this._timerInterval = null;
  }

  init() {
    this.hud.init();

    // Sync session stats periodically
    this._timerInterval = setInterval(() => {
      if (this.session) {
        EventBus.emit('score:change', { score: this.session._totalScore || 0 });
        EventBus.emit('streak:change', { streak: this.session._currentStreak || 0 });
      }
    }, 400);
  }

  showTimer(seconds) {
    EventBus.emit('timer:tick', { remaining: seconds, total: 30 });
  }

  updateTimer(seconds) {
    EventBus.emit('timer:tick', { remaining: seconds, total: 30 });
  }

  updateHints(remaining) {
    const el = document.getElementById('hud-hint-count');
    if (el) el.textContent = remaining;
  }

  showLabName(name) {
    EventBus.emit('trial:start', {
      sectorTitle: name,
      trialIndex: 1,
      totalTrials: 3,
      bannerTitle: name,
      bannerSub: 'FACILITY ASSESSMENT IN PROGRESS'
    });
  }

  hideLabName() {
    // Handled automatically by banner timeout
  }

  flashResult(correct) {
    EventBus.emit('trial:complete', { correct });
  }

  setDifficultyTheme(diff, label) {
    EventBus.emit('director:state', { state: label ? label.toUpperCase() : 'FLOW' });
  }

  showError(msg) {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;inset:0;background:#000;color:#ff4444;display:flex;align-items:center;justify-content:center;font-size:1.3rem;z-index:9999;text-align:center;padding:2rem;font-family:monospace';
    div.textContent = msg;
    document.body.appendChild(div);
  }

  dispose() {
    if (this._timerInterval) clearInterval(this._timerInterval);
    this.hud?.dispose();
  }
}
