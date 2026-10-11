/* ═══════════════════════════════════════════════
   MindShift IQ — Logic Puzzle
   Visual deduction: ordering, comparison, rules
   ═══════════════════════════════════════════════ */
import { ChallengeBase } from '../ChallengeBase.js';
import { calcScore } from '../../data/challengePool.js';

export class LogicPuzzle extends ChallengeBase {
  constructor(data, engine) {
    super(data, engine);
    window._MS_SCORE_MODULE = { calcScore };
    this._answered   = false;
    this._optionEls  = [];
    this._barsAnimated = false;
  }

  setup() { this._drawBackground(); }

  start() {
    super.start();
    this._buildUI();
    this.startTimer(
      this.data.timeLimitSec,
      (t) => this.engine.hud.setTimer(t, this.data.timeLimitSec),
      () => { if (!this._answered) this._timeUp(); }
    );
    this.startAnim(() => this._drawBackground());
  }

  teardown() { super.teardown(); }

  // ── UI ─────────────────────────────────────────
  _buildUI() {
    this.clearOverlay();
    this.setOverlayInteractive(true);

    const wrap = document.createElement('div');
    wrap.className = 'challenge-prompt';
    wrap.style.cssText = 'animation:fadeInUp 0.4s ease both;max-width:700px;';

    // Badge
    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--cat-iq-logic);margin-bottom:10px;';
    badge.textContent = `💡 Logic Puzzle — ${this._subtypeLabel()}`;
    wrap.appendChild(badge);

    // Problem statement
    const problem = document.createElement('p');
    problem.style.cssText = 'font-family:var(--font-display);font-size:1rem;font-weight:600;color:var(--text-primary);line-height:1.65;margin-bottom:12px;';
    problem.textContent = this.data.problem;
    wrap.appendChild(problem);

    // Visual representation (bars/icons)
    if (this.data.visual && this.data.visual.length > 0) {
      const vis = document.createElement('div');
      vis.className = 'logic-visual';
      vis.id = 'logic-vis';
      this.data.visual.forEach(item => {
        const col = document.createElement('div');
        col.className = 'logic-bar-item';
        const bar = document.createElement('div');
        bar.className = 'logic-bar';
        bar.style.height = '4px'; // animate later
        bar.dataset.targetH = `${item.value * 0.7}px`;
        col.appendChild(bar);
        const label = document.createElement('div');
        label.className = 'logic-bar-label';
        label.textContent = item.label;
        col.appendChild(label);
        vis.appendChild(col);
      });
      wrap.appendChild(vis);
      // Animate bars in after a short delay
      setTimeout(() => {
        document.querySelectorAll('.logic-bar').forEach(b => {
          b.style.height = b.dataset.targetH;
        });
        this._barsAnimated = true;
      }, 300);
    }

    // Emoji icons for ordering puzzles
    if (this.data.icons) {
      const iconRow = document.createElement('div');
      iconRow.style.cssText = 'display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin:8px 0;';
      this.data.icons.forEach((ic, i) => {
        const el = document.createElement('div');
        el.style.cssText = `
          display:flex;flex-direction:column;align-items:center;gap:4px;
          animation:scaleIn 0.3s ease ${i * 0.07}s both;
        `;
        el.innerHTML = `<span style="font-size:1.8rem">${ic.emoji}</span>
          <span style="font-size:0.75rem;color:var(--text-muted);font-weight:600">${ic.label}</span>`;
        iconRow.appendChild(el);
      });
      wrap.appendChild(iconRow);
    }

    // Options
    const grid = document.createElement('div');
    grid.className = 'options-grid grid-4';
    this._optionEls = [];

    this.data.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.id = `logic-opt-${i}`;
      btn.style.animation = `fadeInUp 0.3s ease ${0.2 + i * 0.06}s both`;
      btn.textContent = opt;
      btn.addEventListener('click', () => this._select(opt, btn));
      grid.appendChild(btn);
      this._optionEls.push(btn);
    });
    wrap.appendChild(grid);
    this.overlay.appendChild(wrap);
  }

  _select(value, btn) {
    if (this._answered) return;
    this._answered = true;
    this._attempts++;
    const correct = String(value) === String(this.data.answer);

    this._optionEls.forEach(el => {
      el.disabled = true;
      if (String(el.textContent) === String(this.data.answer)) el.classList.add('correct-answer');
      else if (el === btn && !correct) el.classList.add('wrong-answer');
    });

    // Highlight the answer bar if visual
    if (correct && this.data.visual) {
      const bars = document.querySelectorAll('.logic-bar');
      const answerIdx = this.data.visual.findIndex(v => v.label === this.data.answer);
      if (bars[answerIdx]) {
        bars[answerIdx].style.background = '#10b981';
        bars[answerIdx].style.boxShadow  = '0 0 12px rgba(16,185,129,0.5)';
      }
    }

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

  _subtypeLabel() {
    return {
      ordering:   'Ordering',
      comparison: 'Comparison',
      deduction:  'Deduction',
      rule:       'Rule-Based',
      relationship: 'Relationships'
    }[this.data.subtype] || 'Logic';
  }

  _drawBackground() {
    const { width: W, height: H } = this.canvas;
    const bg = this.ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
    bg.addColorStop(0, 'rgba(52,211,153,0.06)'); bg.addColorStop(1, '#06060f');
    this.ctx.fillStyle = bg; this.ctx.fillRect(0, 0, W, H);

    const t = Date.now() / 1000;
    // Network dots & lines
    const pts = Array.from({ length: 6 }, (_, i) => ({
      x: W * (0.15 + i * 0.14) + Math.sin(t * 0.3 + i) * 18,
      y: H * 0.06 + Math.cos(t * 0.25 + i) * 10
    }));
    pts.forEach((p, i) => {
      if (i < pts.length - 1) {
        this.ctx.strokeStyle = 'rgba(52,211,153,0.07)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y); this.ctx.lineTo(pts[i + 1].x, pts[i + 1].y); this.ctx.stroke();
      }
      this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(52,211,153,${0.1 + Math.sin(t + i) * 0.05})`; this.ctx.fill();
    });
  }
}
