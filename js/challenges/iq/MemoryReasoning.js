/* ═══════════════════════════════════════════════
   MindShift IQ — Memory + Reasoning Hybrid
   Show grid → hide → ask specific question
   ═══════════════════════════════════════════════ */
import { ChallengeBase } from '../ChallengeBase.js';
import { calcScore } from '../../data/challengePool.js';

const PHASES = { SHOW: 'show', HIDE: 'hide', ANSWER: 'answer' };

export class MemoryReasoning extends ChallengeBase {
  constructor(data, engine) {
    super(data, engine);
    window._MS_SCORE_MODULE = { calcScore };
    this._phase      = PHASES.SHOW;
    this._answered   = false;
    this._optionEls  = [];
    this._countdown  = null;
  }

  setup() { this._drawBackground(); }

  start() {
    super.start();
    this._renderShow();
    setTimeout(() => {
      if (!this._resolved) this._transition();
    }, this.data.showTime);
  }

  teardown() {
    super.teardown();
    if (this._countdown) { clearInterval(this._countdown); this._countdown = null; }
  }

  // ── Show Phase ─────────────────────────────────
  _renderShow() {
    this._phase = PHASES.SHOW;
    this.clearOverlay();
    this.setOverlayInteractive(false);

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;';

    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--cat-iq-memory);';
    badge.textContent = '🧩 Memory + Reasoning — Memorize the grid!';
    wrap.appendChild(badge);

    const info = document.createElement('p');
    info.className = 'challenge-instruction';
    info.textContent = `Study the ${this.data.cols}×${this.data.rows} grid carefully`;
    wrap.appendChild(info);

    // Countdown
    let remaining = Math.ceil(this.data.showTime / 1000);
    const timer = document.createElement('div');
    timer.style.cssText = 'font-family:var(--font-display);font-size:1.8rem;font-weight:800;color:var(--cat-iq-memory);text-shadow:0 0 20px rgba(34,211,238,0.4);';
    timer.textContent = remaining + 's';
    wrap.appendChild(timer);
    this._countdown = setInterval(() => {
      remaining--;
      timer.textContent = remaining + 's';
      if (remaining <= 0) clearInterval(this._countdown);
    }, 1000);

    // Grid
    const grid = document.createElement('div');
    grid.className = 'mr-grid';
    grid.style.gridTemplateColumns = `repeat(${this.data.cols}, 80px)`;

    this.data.items.forEach((item, i) => {
      const cell = document.createElement('div');
      cell.className = 'mr-cell show-phase';
      cell.style.animationDelay = `${i * 0.06}s`;
      cell.dataset.pos = i;
      if (item.type === 'emoji')   cell.textContent = item.value;
      if (item.type === 'color')   { cell.textContent = ''; cell.style.background = item.value; cell.style.borderColor = item.value + '88'; }
      if (item.type === 'number')  { cell.textContent = item.value; cell.style.fontFamily = 'var(--font-mono)'; cell.style.fontSize = '1.4rem'; cell.style.fontWeight = '800'; }
      if (item.type === 'shape')   cell.textContent = item.value; // emoji shape
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);
    this.overlay.appendChild(wrap);
    this.startAnim(() => this._drawBackground());
  }

  // ── Transition: hide grid ─────────────────────
  _transition() {
    clearInterval(this._countdown);
    this._phase = PHASES.HIDE;
    // Flash cells hidden
    document.querySelectorAll('.mr-cell').forEach(c => {
      c.classList.remove('show-phase');
      c.classList.add('hidden-phase');
    });
    setTimeout(() => {
      if (!this._resolved) this._renderAnswer();
    }, 600);
  }

  // ── Answer Phase ──────────────────────────────
  _renderAnswer() {
    this._phase = PHASES.ANSWER;
    this.clearOverlay();
    this.setOverlayInteractive(true);

    const wrap = document.createElement('div');
    wrap.className = 'challenge-prompt';
    wrap.style.cssText = 'animation:fadeInUp 0.4s ease both;max-width:680px;';

    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--cat-iq-memory);margin-bottom:10px;';
    badge.textContent = '🧩 Memory + Reasoning — Answer from memory!';
    wrap.appendChild(badge);

    // Question
    const q = document.createElement('p');
    q.style.cssText = 'font-family:var(--font-display);font-size:1.05rem;font-weight:700;color:var(--text-primary);margin-bottom:16px;line-height:1.5;';
    q.textContent = this.data.question;
    wrap.appendChild(q);

    // Show hidden grid as question marks
    const grid = document.createElement('div');
    grid.className = 'mr-grid';
    grid.style.cssText = `grid-template-columns:repeat(${this.data.cols}, 54px);gap:6px;margin-bottom:16px;justify-content:center;`;
    this.data.items.forEach((item, i) => {
      const cell = document.createElement('div');
      cell.style.cssText = `
        width:54px;height:54px;border-radius:10px;
        background:rgba(255,255,255,0.03);
        border:2px solid ${i === this.data.targetIdx ? 'var(--cat-iq-memory)' : 'rgba(255,255,255,0.06)'};
        display:flex;align-items:center;justify-content:center;
        font-size:1.2rem;font-weight:800;
        color:${i === this.data.targetIdx ? 'var(--cat-iq-memory)' : 'rgba(255,255,255,0.12)'};
        font-family:var(--font-display);
      `;
      cell.textContent = i === this.data.targetIdx ? '?' : '·';
      if (i === this.data.targetIdx) cell.style.boxShadow = '0 0 16px rgba(34,211,238,0.3)';
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);

    // Options
    const opts = document.createElement('div');
    opts.className = 'options-grid grid-4';
    this._optionEls = [];

    this.data.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.id = `mr-opt-${i}`;
      btn.style.animation = `fadeInUp 0.3s ease ${0.1 + i * 0.07}s both`;
      btn.style.fontSize = '1.2rem';
      btn.textContent = opt;
      btn.addEventListener('click', () => this._select(opt, btn));
      opts.appendChild(btn);
      this._optionEls.push(btn);
    });
    wrap.appendChild(opts);
    this.overlay.appendChild(wrap);

    // Start recall timer
    this.startTimer(
      this.data.timeLimitSec,
      (t) => this.engine.hud.setTimer(t, this.data.timeLimitSec),
      () => { if (!this._answered) this._timeUp(); }
    );
  }

  _select(value, btn) {
    if (this._answered || this._phase !== PHASES.ANSWER) return;
    this._answered = true;
    this._attempts++;
    const correct = String(value) === String(this.data.answer);

    this._optionEls.forEach(el => {
      el.disabled = true;
      if (String(el.textContent) === String(this.data.answer)) el.classList.add('correct-answer');
      else if (el === btn && !correct) el.classList.add('wrong-answer');
    });

    if (correct) this.audio?.playCorrect();
    else         this.audio?.playWrong();
    setTimeout(() => this.resolve(correct), 950);
  }

  _timeUp() {
    this._answered = true;
    this._optionEls.forEach(el => {
      el.disabled = true;
      if (String(el.textContent) === String(this.data.answer)) el.classList.add('correct-answer');
    });
    this.audio?.playWrong();
    setTimeout(() => this.resolve(false), 800);
  }

  _drawBackground() {
    const { width: W, height: H } = this.canvas;
    const bg = this.ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
    bg.addColorStop(0, 'rgba(34,211,238,0.06)'); bg.addColorStop(1, '#06060f');
    this.ctx.fillStyle = bg; this.ctx.fillRect(0, 0, W, H);

    const t = Date.now() / 1000;
    const cx = W / 2, cy = H * 0.06;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 0.3;
      const r = 40 + Math.sin(t + i) * 8;
      this.ctx.beginPath(); this.ctx.arc(cx + r * Math.cos(a), cy + r * Math.sin(a) * 0.4, 2, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(34,211,238,${0.06 + Math.sin(t + i) * 0.03})`; this.ctx.fill();
    }
  }
}
