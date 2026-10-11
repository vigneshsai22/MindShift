/* ═══════════════════════════════════════════════
   MindShift IQ — Matrix Puzzle
   3×3 animated grid — pick the missing tile
   ═══════════════════════════════════════════════ */
import { ChallengeBase } from '../ChallengeBase.js';
import { calcScore } from '../../data/challengePool.js';

export class MatrixPuzzle extends ChallengeBase {
  constructor(data, engine) {
    super(data, engine);
    window._MS_SCORE_MODULE = { calcScore };
    this._answered   = false;
    this._optionBtns = [];
    this._revealDone = false;
    this._revealProgress = 0; // 0–9
  }

  setup() { this._drawBackground(); }

  start() {
    super.start();
    this._buildOptionsOverlay();
    this.startTimer(
      this.data.timeLimitSec,
      (t) => this.engine.hud.setTimer(t, this.data.timeLimitSec),
      () => { if (!this._answered) this._timeUp(); }
    );
    // Animate grid cells in, one by one
    this._animateGridIn();
  }

  teardown() { super.teardown(); this._stopAnim(); }

  // ── Animated grid reveal ───────────────────────
  _animateGridIn() {
    const reveal = (idx) => {
      if (idx >= 9) {
        this._revealDone = true;
        this.startAnim(() => this._drawScene());
        return;
      }
      this._revealProgress = idx;
      this._drawScene();
      setTimeout(() => reveal(idx + 1), 80);
    };
    reveal(0);
  }

  _drawScene() {
    const { width: W, height: H } = this.canvas;
    const ctx = this.ctx;
    this._drawBackground();

    const CELL = Math.min(80, (Math.min(W, H) * 0.55) / 3);
    const GAP  = 10;
    const GRID  = CELL * 3 + GAP * 2;
    const gx    = W / 2 - GRID / 2;
    const gy    = H / 2 - GRID / 2 - 20;

    for (let i = 0; i < 9; i++) {
      if (i > this._revealProgress && !this._revealDone) break;
      const row = Math.floor(i / 3);
      const col = i % 3;
      const cx  = gx + col * (CELL + GAP);
      const cy  = gy + row * (CELL + GAP);
      const isBlank = i === 8;
      const cell    = this.data.grid[i];

      // Cell bg
      ctx.fillStyle   = isBlank ? 'rgba(251,146,60,0.14)' : 'rgba(255,255,255,0.04)';
      ctx.strokeStyle = isBlank ? '#fb923c' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth   = isBlank ? 2.5 : 1;
      this._rr(ctx, cx, cy, CELL, CELL, 10);
      ctx.fill(); ctx.stroke();

      if (!isBlank && cell) {
        ctx.save();
        ctx.translate(cx + CELL / 2, cy + CELL / 2);
        if (cell.rotation) ctx.rotate((cell.rotation * Math.PI) / 180);
        this._shape(ctx, cell.shape, cell.color, 0, 0, CELL * 0.3 * (cell.size || 1));
        ctx.restore();
      } else if (isBlank) {
        ctx.fillStyle = 'rgba(251,146,60,0.5)';
        ctx.font = `bold ${CELL * 0.38}px Outfit`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('?', cx + CELL / 2, cy + CELL / 2);
      }

      // Row/col guide dots
      if (this._revealDone) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        if (col < 2) { ctx.beginPath(); ctx.arc(cx + CELL + GAP / 2, cy + CELL / 2, 2, 0, Math.PI * 2); ctx.fill(); }
        if (row < 2) { ctx.beginPath(); ctx.arc(cx + CELL / 2, cy + CELL + GAP / 2, 2, 0, Math.PI * 2); ctx.fill(); }
      }
    }

    // Label
    ctx.fillStyle = 'rgba(148,163,184,0.5)';
    ctx.font = '12px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('▼  Choose the missing tile  ▼', W / 2, gy + GRID + 18);
  }

  // ── Options Overlay ───────────────────────────
  _buildOptionsOverlay() {
    this.clearOverlay();
    this.setOverlayInteractive(true);

    const wrap = document.createElement('div');
    wrap.style.cssText = `
      position:absolute;bottom:14px;left:50%;transform:translateX(-50%);
      display:flex;flex-direction:column;align-items:center;gap:8px;
    `;
    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:0.7rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#fb923c;';
    badge.textContent = '🔶 Matrix Puzzle — Select the missing tile';
    wrap.appendChild(badge);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;pointer-events:all;';
    this._optionBtns = [];

    this.data.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        width:76px;height:76px;border-radius:12px;
        background:rgba(255,255,255,0.04);
        border:2px solid rgba(255,255,255,0.1);
        cursor:pointer;transition:all 0.15s ease;overflow:hidden;
        animation:scaleIn 0.3s ease ${i * 0.07}s both;
      `;
      const mini = document.createElement('canvas');
      mini.width = 60; mini.height = 60;
      btn.appendChild(mini);
      const mctx = mini.getContext('2d');
      mctx.clearRect(0, 0, 60, 60);
      if (opt) {
        mctx.save(); mctx.translate(30, 30);
        if (opt.rotation) mctx.rotate((opt.rotation * Math.PI) / 180);
        this._shape(mctx, opt.shape, opt.color, 0, 0, 18 * (opt.size || 1));
        mctx.restore();
      }

      btn.addEventListener('mouseenter', () => {
        if (!this._answered) { btn.style.borderColor = '#fb923c'; btn.style.transform = 'scale(1.06)'; }
      });
      btn.addEventListener('mouseleave', () => {
        if (!this._answered) { btn.style.borderColor = 'rgba(255,255,255,0.1)'; btn.style.transform = 'scale(1)'; }
      });
      btn.addEventListener('click', () => this._select(i));
      row.appendChild(btn);
      this._optionBtns.push(btn);
    });

    wrap.appendChild(row);
    this.overlay.appendChild(wrap);
  }

  _select(idx) {
    if (this._answered) return;
    this._answered = true;
    this._attempts++;
    const correct = idx === this.data.correctIdx;

    this._optionBtns.forEach((b, i) => {
      b.disabled = true; b.style.transform = 'scale(1)';
      if (i === this.data.correctIdx) { b.style.borderColor = '#10b981'; b.style.background = 'rgba(16,185,129,0.2)'; b.style.boxShadow = '0 0 20px rgba(16,185,129,0.4)'; }
      else if (i === idx && !correct)  { b.style.borderColor = '#ef4444'; b.style.background = 'rgba(239,68,68,0.2)'; }
    });

    if (correct) this.audio?.playCorrect();
    else         this.audio?.playWrong();
    setTimeout(() => this.resolve(correct), 950);
  }

  _timeUp() {
    this._answered = true;
    this._optionBtns.forEach((b, i) => {
      b.disabled = true;
      if (i === this.data.correctIdx) { b.style.borderColor = '#10b981'; b.style.background = 'rgba(16,185,129,0.2)'; }
    });
    this.audio?.playWrong();
    setTimeout(() => this.resolve(false), 800);
  }

  // ── Helpers ───────────────────────────────────
  _shape(ctx, shape, color, cx, cy, size) {
    ctx.fillStyle = color; ctx.strokeStyle = color + 'cc'; ctx.lineWidth = 2;
    switch (shape) {
      case 'circle':
        ctx.beginPath(); ctx.arc(cx, cy, size, 0, Math.PI * 2); ctx.fill(); break;
      case 'square':
        ctx.fillRect(cx - size, cy - size, size * 2, size * 2); break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(cx, cy - size); ctx.lineTo(cx + size, cy + size); ctx.lineTo(cx - size, cy + size);
        ctx.closePath(); ctx.fill(); break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(cx, cy - size); ctx.lineTo(cx + size, cy); ctx.lineTo(cx, cy + size); ctx.lineTo(cx - size, cy);
        ctx.closePath(); ctx.fill(); break;
      case 'star':
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? size : size * 0.45;
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
                  : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
        }
        ctx.closePath(); ctx.fill(); break;
      default:
        ctx.beginPath(); ctx.arc(cx, cy, size, 0, Math.PI * 2); ctx.fill();
    }
  }

  _rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  _drawBackground() {
    const { width: W, height: H } = this.canvas;
    const bg = this.ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
    bg.addColorStop(0, 'rgba(251,146,60,0.07)'); bg.addColorStop(1, '#06060f');
    this.ctx.fillStyle = bg; this.ctx.fillRect(0, 0, W, H);
  }
}
