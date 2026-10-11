/* ═══════════════════════════════════════════════
   MindShift IQ — Spatial Reasoning
   Identify the correctly rotated/mirrored shape
   ═══════════════════════════════════════════════ */
import { ChallengeBase } from '../ChallengeBase.js';
import { calcScore } from '../../data/challengePool.js';

export class SpatialReasoning extends ChallengeBase {
  constructor(data, engine) {
    super(data, engine);
    window._MS_SCORE_MODULE = { calcScore };
    this._answered   = false;
    this._optionBtns = [];
    this._hoverIdx   = -1;
    this._targetAngle = 0;
    this._previewAngle = 0;
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
    this.startAnim(() => this._drawScene());
  }

  teardown() { super.teardown(); }

  // ── Canvas Scene ──────────────────────────────
  _drawScene() {
    const { width: W, height: H } = this.canvas;
    const ctx = this.ctx;
    this._drawBackground();

    // "Target orientation" label
    ctx.fillStyle = 'rgba(163,230,53,0.6)';
    ctx.font = '12px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('TARGET SHAPE', W / 2, H * 0.09);

    // Draw target shape (rotating slowly to draw attention)
    const t = Date.now() / 1000;
    const wobble = Math.sin(t * 1.5) * 3; // gentle wobble
    const tSize = Math.min(W, H) * 0.14;
    ctx.save();
    ctx.translate(W / 2, H * 0.26);
    ctx.rotate(((this.data.targetAngle + wobble) * Math.PI) / 180);
    this._drawComplexShape(ctx, this.data.shapeType, '#a3e635', 0, 0, tSize);
    ctx.restore();

    // Instruction text
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.font = '12px Inter'; ctx.textAlign = 'center';
    ctx.fillText('↓  Pick the option that matches the rotation below  ↓', W / 2, H * 0.45);
  }

  // ── Overlay options ───────────────────────────
  _buildUI() {
    this.clearOverlay();
    this.setOverlayInteractive(true);

    const wrap = document.createElement('div');
    wrap.style.cssText = `
      position:absolute;bottom:14px;left:50%;transform:translateX(-50%);
      display:flex;flex-direction:column;align-items:center;gap:10px;
    `;

    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--cat-iq-spatial);';
    badge.textContent = `🔄 Spatial Reasoning — ${this._modeLabel()}`;
    wrap.appendChild(badge);

    const grid = document.createElement('div');
    grid.className = 'spatial-options-grid';
    this._optionBtns = [];

    this.data.options.forEach((angle, i) => {
      const btn = document.createElement('button');
      btn.className = 'spatial-option-btn';
      btn.id = `spatial-opt-${i}`;
      btn.style.animation = `scaleIn 0.3s ease ${i * 0.08}s both`;

      const c = document.createElement('canvas');
      c.width = 120; c.height = 120;
      btn.appendChild(c);

      const ctx2d = c.getContext('2d');
      this._drawOptionShape(ctx2d, angle, 60, 60, 28);

      const label = document.createElement('span');
      label.className = 'spatial-option-label';
      label.textContent = ['A', 'B', 'C', 'D'][i];
      btn.appendChild(label);

      btn.addEventListener('mouseenter', () => {
        if (!this._answered) { btn.style.borderColor = '#a3e635'; btn.style.transform = 'scale(1.04)'; }
      });
      btn.addEventListener('mouseleave', () => {
        if (!this._answered) { btn.style.borderColor = 'rgba(255,255,255,0.1)'; btn.style.transform = 'scale(1)'; }
      });
      btn.addEventListener('click', () => this._select(i));
      grid.appendChild(btn);
      this._optionBtns.push(btn);
    });

    wrap.appendChild(grid);
    this.overlay.appendChild(wrap);
  }

  _drawOptionShape(ctx, angle, cx, cy, size) {
    ctx.clearRect(0, 0, cx * 2, cy * 2);
    // Background
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, 0, cx * 2, cy * 2);
    ctx.save();
    ctx.translate(cx, cy);
    const rad = (angle * Math.PI) / 180;
    if (this.data.subtype === 'mirror') {
      // Mirror on X
      if (angle === 1) ctx.scale(-1, 1);
    } else {
      ctx.rotate(rad);
    }
    this._drawComplexShape(ctx, this.data.shapeType, '#a3e635', 0, 0, size);
    ctx.restore();
  }

  _select(idx) {
    if (this._answered) return;
    this._answered = true;
    this._attempts++;
    const correct = idx === this.data.correctIdx;

    this._optionBtns.forEach((b, i) => {
      b.disabled = true; b.style.transform = 'scale(1)';
      if (i === this.data.correctIdx) b.classList.add('correct-spatial');
      else if (i === idx && !correct) b.classList.add('wrong-spatial');
    });

    if (correct) this.audio?.playCorrect();
    else         this.audio?.playWrong();
    setTimeout(() => this.resolve(correct), 950);
  }

  _timeUp() {
    this._answered = true;
    this._optionBtns[this.data.correctIdx]?.classList.add('correct-spatial');
    this.audio?.playWrong();
    setTimeout(() => this.resolve(false), 800);
  }

  // ── Shape library ─────────────────────────────
  _drawComplexShape(ctx, type, color, cx, cy, size) {
    ctx.fillStyle   = color;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;

    switch (type) {
      case 'L':
        // L-shape
        ctx.fillStyle = color;
        ctx.fillRect(cx - size * 0.5, cy - size, size * 0.5, size * 1.5);
        ctx.fillRect(cx - size * 0.5, cy + size * 0.2, size, size * 0.5);
        break;
      case 'T':
        ctx.fillRect(cx - size, cy - size * 0.8, size * 2, size * 0.5);
        ctx.fillRect(cx - size * 0.3, cy - size * 0.3, size * 0.6, size * 1.3);
        break;
      case 'arrow':
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size * 0.7, cy);
        ctx.lineTo(cx + size * 0.3, cy);
        ctx.lineTo(cx + size * 0.3, cy + size);
        ctx.lineTo(cx - size * 0.3, cy + size);
        ctx.lineTo(cx - size * 0.3, cy);
        ctx.lineTo(cx - size * 0.7, cy);
        ctx.closePath();
        ctx.fill();
        break;
      case 'Z':
        ctx.fillRect(cx - size, cy - size * 0.8, size * 2, size * 0.45);
        ctx.fillRect(cx - size * 0.3, cy - size * 0.35, size * 0.6, size * 1.1);
        ctx.fillRect(cx - size, cy + size * 0.35, size * 2, size * 0.45);
        break;
      case 'check':
        ctx.beginPath(); ctx.lineWidth = size * 0.35;
        ctx.strokeStyle = color;
        ctx.moveTo(cx - size, cy);
        ctx.lineTo(cx - size * 0.2, cy + size * 0.8);
        ctx.lineTo(cx + size, cy - size * 0.8);
        ctx.stroke();
        break;
      default:
        ctx.beginPath(); ctx.arc(cx, cy, size, 0, Math.PI * 2); ctx.fill();
    }
  }

  _modeLabel() {
    return { rotation:'Rotation Match', mirror:'Mirror Image', position:'Position Match' }[this.data.subtype] || 'Rotation Match';
  }

  _drawBackground() {
    const { width: W, height: H } = this.canvas;
    const bg = this.ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
    bg.addColorStop(0, 'rgba(163,230,53,0.06)'); bg.addColorStop(1, '#06060f');
    this.ctx.fillStyle = bg; this.ctx.fillRect(0, 0, W, H);

    // Grid dots
    this.ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let x = 40; x < W; x += 40) {
      for (let y = 40; y < H; y += 40) {
        this.ctx.beginPath(); this.ctx.arc(x, y, 1, 0, Math.PI * 2); this.ctx.fill();
      }
    }
  }
}
