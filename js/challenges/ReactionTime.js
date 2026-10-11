/* ═══════════════════════════════════════════════
   MindShift — Reaction Time Challenge
   Click the stimulus ASAP when it appears
   ═══════════════════════════════════════════════ */
import { ChallengeBase } from './ChallengeBase.js';
import { calcScore } from '../data/challengePool.js';

export class ReactionTime extends ChallengeBase {
  constructor(data, engine) {
    super(data, engine);
    window._MS_SCORE_MODULE = { calcScore };
    this._state = 'idle';   // idle | waiting | go | done | false_start
    this._waitTimeout = null;
    this._goTime = null;
    this._circleEl = null;
    this._msgEl = null;
    this._attempts = 0;
  }

  setup() { this._drawBackground(); }

  start() {
    super.start();
    this._renderArena();
    this._beginWait();
    this.startTimer(
      this.data.timeLimitSec,
      (t) => this.engine.hud.setTimer(t, this.data.timeLimitSec),
      () => { if (this._state !== 'done') this._handleMiss(); }
    );
  }

  teardown() {
    super.teardown();
    if (this._waitTimeout) { clearTimeout(this._waitTimeout); this._waitTimeout = null; }
  }

  // ── Rendering ─────────────────────────────────
  _renderArena() {
    this.clearOverlay();
    this.setOverlayInteractive(true);

    const arena = document.createElement('div');
    arena.className = 'reaction-arena';

    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#fca5a5;';
    badge.textContent = '⚡ Reaction Time — Click When Green!';
    arena.appendChild(badge);

    // Big circle
    this._circleEl = document.createElement('div');
    this._circleEl.className = 'reaction-circle waiting';
    this._circleEl.id = 'reaction-circle';
    this._circleEl.textContent = 'WAIT…';
    this._circleEl.addEventListener('click', () => this._onCircleClick());
    arena.appendChild(this._circleEl);

    // Message
    this._msgEl = document.createElement('p');
    this._msgEl.className = 'reaction-msg';
    this._msgEl.textContent = 'Get ready — click the circle when it turns GREEN';
    arena.appendChild(this._msgEl);

    this.overlay.appendChild(arena);
    this.startAnim(() => this._drawBackground());
  }

  // ── Game Logic ────────────────────────────────
  _beginWait() {
    this._state = 'waiting';
    const delay = this.data.waitMin + Math.random() * (this.data.waitMax - this.data.waitMin);
    this._waitTimeout = setTimeout(() => {
      if (!this._resolved) this._showGo();
    }, delay);
  }

  _showGo() {
    this._state = 'go';
    this._goTime = performance.now();
    if (this._circleEl) {
      this._circleEl.className = 'reaction-circle go';
      this._circleEl.textContent = 'NOW!';
    }
    if (this._msgEl) this._msgEl.textContent = 'CLICK NOW!';
    this.audio?.playTick();
  }

  _onCircleClick() {
    if (this._resolved) return;
    this._attempts++;

    if (this._state === 'waiting') {
      // False start
      this._state = 'false_start';
      if (this._waitTimeout) { clearTimeout(this._waitTimeout); this._waitTimeout = null; }
      if (this._circleEl) {
        this._circleEl.className = 'reaction-circle done';
        this._circleEl.textContent = 'TOO EARLY!';
        this._circleEl.style.borderColor = '#f59e0b';
        this._circleEl.style.color = '#f59e0b';
      }
      if (this._msgEl) this._msgEl.textContent = '⚠️ False start! Wait for green…';
      this.audio?.playWrong();
      // Give one retry
      setTimeout(() => {
        if (!this._resolved) {
          if (this._circleEl) {
            this._circleEl.className = 'reaction-circle waiting';
            this._circleEl.textContent = 'WAIT…';
            this._circleEl.style.borderColor = '';
            this._circleEl.style.color = '';
          }
          if (this._msgEl) this._msgEl.textContent = 'Get ready again…';
          this._beginWait();
        }
      }, 1200);
      return;
    }

    if (this._state === 'go') {
      const rt = (performance.now() - this._goTime) / 1000;
      this._state = 'done';
      if (this._circleEl) {
        this._circleEl.className = 'reaction-circle done';
        this._circleEl.textContent = `${Math.round(rt * 1000)}ms`;
        this._circleEl.style.removeProperty('animation');
      }
      if (this._msgEl) this._msgEl.textContent = `Reaction time: ${Math.round(rt * 1000)} ms`;
      this.audio?.playCorrect();

      // Achievement meta
      this.engine.sessionMeta = this.engine.sessionMeta || {};
      if (!this.engine.sessionMeta.fastestReaction || rt < this.engine.sessionMeta.fastestReaction) {
        this.engine.sessionMeta.fastestReaction = rt;
      }

      setTimeout(() => this.resolve(true, rt), 900);
    }
  }

  _handleMiss() {
    this._state = 'done';
    if (this._circleEl) {
      this._circleEl.className = 'reaction-circle done';
      this._circleEl.textContent = 'TOO SLOW';
    }
    this.audio?.playWrong();
    setTimeout(() => this.resolve(false), 800);
  }

  _drawBackground() {
    const { width: W, height: H } = this.canvas;
    const t = Date.now() / 1000;
    const bg = this.ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.6);
    const isGo = this._state === 'go';
    bg.addColorStop(0, isGo ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.06)');
    bg.addColorStop(1,'#06060f');
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0,0,W,H);

    // Ripple rings when GO
    if (isGo) {
      const elapsed = this._goTime ? (performance.now() - this._goTime)/1000 : 0;
      for (let i=0;i<3;i++) {
        const phase = (elapsed * 1.5 + i * 0.33) % 1;
        const r = phase * Math.min(W,H)*0.45;
        const alpha = (1 - phase) * 0.2;
        this.ctx.beginPath();
        this.ctx.arc(W/2,H/2,r,0,Math.PI*2);
        this.ctx.strokeStyle=`rgba(16,185,129,${alpha})`;
        this.ctx.lineWidth=2;
        this.ctx.stroke();
      }
    }
  }
}
