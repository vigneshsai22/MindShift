/* ═══════════════════════════════════════════════
   MindShift IQ — Visual Pattern Puzzle
   Shape/color sequence — pick the next item
   ═══════════════════════════════════════════════ */
import { ChallengeBase } from '../ChallengeBase.js';
import { calcScore, SHAPES, COLORS } from '../../data/challengePool.js';

export class VisualPatternPuzzle extends ChallengeBase {
  constructor(data, engine) {
    super(data, engine);
    window._MS_SCORE_MODULE = { calcScore };
    this._answered    = false;
    this._optionBtns  = [];
    this._revealed    = false;
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
    this.startAnim(() => this._drawCanvas());
  }

  teardown() { super.teardown(); }

  // ── Canvas drawing ─────────────────────────────
  _drawCanvas() {
    const { width: W, height: H } = this.canvas;
    const ctx = this.ctx;

    // Background
    const bg = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, W * 0.6);
    bg.addColorStop(0, 'rgba(249,115,22,0.07)');
    bg.addColorStop(1, '#06060f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Draw pattern sequence on canvas
    const seq = this.data.sequence;
    const n   = seq.length;
    const cellW = Math.min(100, (W * 0.85) / n);
    const cellH = cellW;
    const startX = W / 2 - (n * cellW + (n - 1) * 12) / 2;
    const startY = H * 0.15;

    seq.forEach((item, i) => {
      const cx = startX + i * (cellW + 12) + cellW / 2;
      const cy = startY + cellH / 2;
      const isBlank = item.blank;

      // Cell background
      ctx.fillStyle = isBlank ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)';
      ctx.strokeStyle = isBlank ? '#f97316' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = isBlank ? 2 : 1;
      this._roundRect(ctx, cx - cellW / 2, cy - cellH / 2, cellW, cellH, 10);
      ctx.fill(); ctx.stroke();

      if (isBlank) {
        // Question mark
        ctx.fillStyle = 'rgba(249,115,22,0.6)';
        ctx.font = `bold ${cellW * 0.4}px Outfit`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('?', cx, cy);
      } else {
        // Draw shape with possible rotation
        ctx.save();
        ctx.translate(cx, cy);
        if (item.rotation) ctx.rotate((item.rotation * Math.PI) / 180);
        const s = cellW * 0.32 * (item.size || 1);
        this._drawShape(ctx, item.shape, item.color, 0, 0, s);
        ctx.restore();
      }

      // Connector
      if (i < n - 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('→', startX + (i + 0.5) * (cellW + 12) + cellW / 2 - 6, cy);
      }
    });

    // Rule label
    ctx.fillStyle = 'rgba(249,115,22,0.45)';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (this.data.difficulty <= 2) {
      ctx.fillText(`Rule: ${this.data.rule}`, W / 2, startY + cellH + 18);
    }
  }

  _buildUI() {
    this.clearOverlay();
    this.setOverlayInteractive(true);

    const wrap = document.createElement('div');
    wrap.style.cssText = `
      position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
      display:flex;flex-direction:column;align-items:center;gap:12px;
    `;

    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#f97316;';
    badge.textContent = '🔷 Visual Pattern — Pick the next item';
    wrap.appendChild(badge);

    // Option row
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;';
    this._optionBtns = [];

    this.data.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.id = `vp-opt-${i}`;
      btn.style.cssText = `
        width:80px;height:80px;border-radius:12px;
        background:rgba(255,255,255,0.04);
        border:2px solid rgba(255,255,255,0.1);
        cursor:pointer;transition:all 0.15s ease;
        display:flex;align-items:center;justify-content:center;
        animation:scaleIn 0.3s ease ${i * 0.08}s both;
        pointer-events:all;
      `;
      // Mini canvas
      const mini = document.createElement('canvas');
      mini.width = 60; mini.height = 60;
      btn.appendChild(mini);
      const mctx = mini.getContext('2d');
      mctx.save();
      mctx.translate(30, 30);
      if (opt.rotation) mctx.rotate((opt.rotation * Math.PI) / 180);
      const s = 18 * (opt.size || 1);
      this._drawShape(mctx, opt.shape, opt.color, 0, 0, s);
      mctx.restore();

      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = '#f97316';
        btn.style.transform = 'scale(1.08)';
      });
      btn.addEventListener('mouseleave', () => {
        if (!this._answered) {
          btn.style.borderColor = 'rgba(255,255,255,0.1)';
          btn.style.transform = 'scale(1)';
        }
      });
      btn.addEventListener('click', () => this._selectOption(i));
      row.appendChild(btn);
      this._optionBtns.push(btn);
    });
    wrap.appendChild(row);
    this.overlay.appendChild(wrap);
  }

  _selectOption(idx) {
    if (this._answered) return;
    this._answered = true;
    this._attempts++;
    const correct = idx === this.data.correctIdx;

    this._optionBtns.forEach((b, i) => {
      b.disabled = true;
      b.style.transform = 'scale(1)';
      if (i === this.data.correctIdx) {
        b.style.borderColor = '#10b981';
        b.style.background  = 'rgba(16,185,129,0.2)';
        b.style.boxShadow   = '0 0 20px rgba(16,185,129,0.4)';
      } else if (i === idx && !correct) {
        b.style.borderColor = '#ef4444';
        b.style.background  = 'rgba(239,68,68,0.2)';
      }
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

  // ── Shape drawing helpers ──────────────────────
  _drawShape(ctx, shape, color, cx, cy, size) {
    ctx.fillStyle   = color;
    ctx.strokeStyle = color + 'cc';
    ctx.lineWidth   = 2;
    switch (shape) {
      case 'circle':
        ctx.beginPath(); ctx.arc(cx, cy, size, 0, Math.PI * 2); ctx.fill(); break;
      case 'square':
        ctx.beginPath(); ctx.rect(cx - size, cy - size, size * 2, size * 2); ctx.fill(); break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy + size);
        ctx.lineTo(cx - size, cy + size);
        ctx.closePath(); ctx.fill(); break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(cx, cy - size); ctx.lineTo(cx + size, cy);
        ctx.lineTo(cx, cy + size); ctx.lineTo(cx - size, cy);
        ctx.closePath(); ctx.fill(); break;
      case 'star':
        this._star(ctx, cx, cy, 5, size, size * 0.45); ctx.fill(); break;
      case 'hexagon':
        this._hex(ctx, cx, cy, size); ctx.fill(); break;
      default:
        ctx.beginPath(); ctx.arc(cx, cy, size, 0, Math.PI * 2); ctx.fill();
    }
  }

  _star(ctx, cx, cy, spikes, outer, inner) {
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
              : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
  }

  _hex(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
              : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  _drawBackground() {
    const { width: W, height: H } = this.canvas;
    const bg = this.ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
    bg.addColorStop(0, 'rgba(249,115,22,0.06)');
    bg.addColorStop(1, '#06060f');
    this.ctx.fillStyle = bg; this.ctx.fillRect(0, 0, W, H);
  }
}
