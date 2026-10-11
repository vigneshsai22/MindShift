/* ═══════════════════════════════════════════════
   MindShift — Pattern Recognition Challenge
   Visual shape/color grid — pick the missing cell
   ═══════════════════════════════════════════════ */
import { ChallengeBase } from './ChallengeBase.js';
import { calcScore, SHAPES, COLORS } from '../data/challengePool.js';

export class PatternRecognition extends ChallengeBase {
  constructor(data, engine) {
    super(data, engine);
    window._MS_SCORE_MODULE = { calcScore };
    this._grid = [];           // 3×3 array of {shape, color, size}
    this._answer = null;       // correct descriptor for missing cell
    this._options = [];        // 4 option descriptors
    this._answered = false;
    this._optionBtns = [];
    this._hoverIdx = -1;
  }

  setup() {
    this._generatePattern();
    this._drawScene();
  }

  start() {
    super.start();
    this._renderOptions();
    this.startTimer(
      this.data.timeLimitSec,
      (t) => this.engine.hud.setTimer(t, this.data.timeLimitSec),
      () => { if (!this._answered) this._timeUp(); }
    );
  }

  teardown() {
    super.teardown();
    this._stopAnim();
  }

  // ── Pattern Generation ─────────────────────────
  _generatePattern() {
    const d = this.data.difficulty;
    const rule = this.data.rule || 'color-rotate';
    const shapePool = SHAPES.slice(0, 3 + d);
    const colorPool = COLORS.slice(0, 3 + Math.floor(d/2));

    // Base shape for this puzzle
    const baseShape = shapePool[Math.floor(Math.random() * shapePool.length)];
    const shapes3   = [baseShape, shapePool[(shapePool.indexOf(baseShape)+1)%shapePool.length], shapePool[(shapePool.indexOf(baseShape)+2)%shapePool.length]];
    const colors3   = [colorPool[0], colorPool[1], colorPool[2] || colorPool[0]];

    // Build 3×3 grid based on rule
    this._grid = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        let shapeIdx, colorIdx;
        switch (rule) {
          case 'color-rotate':
            shapeIdx = 0;              // same shape throughout
            colorIdx = (row + col) % 3;
            break;
          case 'shape-sequence':
            shapeIdx = col;
            colorIdx = row % 3;
            break;
          case 'color-gradient':
            shapeIdx = row % 2 === 0 ? 0 : 1;
            colorIdx = col;
            break;
          case 'alternating':
            shapeIdx = (row + col) % 2;
            colorIdx = row % 2;
            break;
          case 'diagonal':
            shapeIdx = (row === col) ? 0 : 1;
            colorIdx = (row + col) % 3;
            break;
          default:
            shapeIdx = col % shapes3.length;
            colorIdx = row % colors3.length;
        }
        this._grid.push({
          shape: shapes3[shapeIdx % shapes3.length],
          color: colors3[colorIdx % colors3.length],
          size:  28 + (d > 3 ? 0 : 4)
        });
      }
    }

    // The last cell (index 8) is the missing one
    this._answer = { ...this._grid[8] };

    // Generate 3 wrong options (plausible but incorrect)
    const wrongs = [];
    const usedColors = new Set([this._answer.color]);
    while (wrongs.length < 3) {
      const s = shapePool[Math.floor(Math.random() * shapePool.length)];
      const c = colorPool[Math.floor(Math.random() * colorPool.length)];
      if (s === this._answer.shape && c === this._answer.color) continue;
      const key = s + c;
      if (wrongs.some(w => w.shape+w.color === key)) continue;
      wrongs.push({ shape: s, color: c, size: this._answer.size });
    }
    // Shuffle all 4 options
    this._options = [this._answer, ...wrongs].sort(() => Math.random() - 0.5);
    this._correctOptionIdx = this._options.findIndex(o => o.shape === this._answer.shape && o.color === this._answer.color);
  }

  // ── Canvas Drawing ─────────────────────────────
  _drawScene(selectedIdx = -1, revealCorrect = false) {
    const { width: W, height: H } = this.canvas;
    const ctx = this.ctx;

    // Background
    const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.6);
    bg.addColorStop(0, 'rgba(6,182,212,0.07)');
    bg.addColorStop(1, '#06060f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid area — centred horizontally, upper 60% of canvas
    const cellSize = Math.min(80, (W * 0.4) / 3);
    const gap      = 10;
    const gridW    = cellSize * 3 + gap * 2;
    const gridH    = gridW;
    const gx       = W / 2 - gridW / 2;
    const gy       = H * 0.08;

    // Draw cells
    for (let i = 0; i < 9; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const cx  = gx + col * (cellSize + gap);
      const cy  = gy + row * (cellSize + gap);
      const cell= this._grid[i];
      const isBlank = (i === 8);

      // Cell background
      ctx.fillStyle = isBlank
        ? 'rgba(124,58,237,0.15)'
        : 'rgba(255,255,255,0.04)';
      ctx.strokeStyle = isBlank
        ? 'rgba(124,58,237,0.7)'
        : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = isBlank ? 2 : 1;
      this._roundRect(ctx, cx, cy, cellSize, cellSize, 8);
      ctx.fill();
      ctx.stroke();

      if (!isBlank) {
        this._drawShape(ctx, cell.shape, cell.color, cx + cellSize/2, cy + cellSize/2, cell.size);
      } else {
        // Question mark
        ctx.fillStyle = 'rgba(124,58,237,0.6)';
        ctx.font = `bold ${cellSize*0.4}px Outfit,sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', cx + cellSize/2, cy + cellSize/2);
      }
    }

    // "Choose the missing piece" label on canvas
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.font = '13px Inter,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▼  Choose the missing piece  ▼', W/2, gy + gridH + 20);
  }

  _drawShape(ctx, shape, color, cx, cy, size) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color + 'cc';
    ctx.lineWidth = 2;

    switch (shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'square':
        ctx.beginPath();
        ctx.rect(cx - size, cy - size, size*2, size*2);
        ctx.fill();
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy + size);
        ctx.lineTo(cx - size, cy + size);
        ctx.closePath();
        ctx.fill();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy);
        ctx.lineTo(cx, cy + size);
        ctx.lineTo(cx - size, cy);
        ctx.closePath();
        ctx.fill();
        break;
      case 'star':
        this._drawStar(ctx, cx, cy, 5, size, size * 0.45);
        ctx.fill();
        break;
      case 'hexagon':
        this._drawHex(ctx, cx, cy, size);
        ctx.fill();
        break;
      default:
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI*2);
        ctx.fill();
    }
  }

  _drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      i === 0 ? ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle))
               : ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    }
    ctx.closePath();
  }

  _drawHex(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      i === 0 ? ctx.moveTo(cx + r*Math.cos(a), cy + r*Math.sin(a))
               : ctx.lineTo(cx + r*Math.cos(a), cy + r*Math.sin(a));
    }
    ctx.closePath();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Options (canvas buttons overlay) ──────────
  _renderOptions() {
    this.clearOverlay();
    this.setOverlayInteractive(true);

    const wrap = document.createElement('div');
    wrap.style.cssText = `
      position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
      display:flex;gap:10px;
    `;

    this._optionBtns = [];
    this._options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.id = `pattern-opt-${i}`;
      btn.style.cssText = `
        width:80px;height:80px;border-radius:12px;cursor:pointer;
        background:rgba(255,255,255,0.05);
        border:2px solid rgba(255,255,255,0.12);
        transition:all 0.15s ease;display:flex;
        align-items:center;justify-content:center;
        animation:scaleIn 0.3s ease ${i*0.07}s both;
      `;
      // Mini canvas inside button for shape preview
      const mini = document.createElement('canvas');
      mini.width = 60; mini.height = 60;
      btn.appendChild(mini);
      const mctx = mini.getContext('2d');
      mctx.clearRect(0,0,60,60);
      this._drawShape(mctx, opt.shape, opt.color, 30, 30, 18);

      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = 'rgba(124,58,237,0.7)';
        btn.style.background  = 'rgba(124,58,237,0.1)';
        btn.style.transform   = 'scale(1.08)';
      });
      btn.addEventListener('mouseleave', () => {
        if (!this._answered) {
          btn.style.borderColor = 'rgba(255,255,255,0.12)';
          btn.style.background  = 'rgba(255,255,255,0.05)';
          btn.style.transform   = 'scale(1)';
        }
      });
      btn.addEventListener('click', () => this._selectOption(i, btn));
      wrap.appendChild(btn);
      this._optionBtns.push(btn);
    });

    this.overlay.appendChild(wrap);
    this.startAnim(() => this._drawScene());
  }

  _selectOption(idx, btn) {
    if (this._answered) return;
    this._answered = true;
    this._attempts++;
    this._stopTimer();

    const correct = idx === this._correctOptionIdx;

    this._optionBtns.forEach((b, i) => {
      b.disabled = true;
      b.style.transform = 'scale(1)';
      if (i === this._correctOptionIdx) {
        b.style.borderColor = '#10b981';
        b.style.background  = 'rgba(16,185,129,0.2)';
        b.style.boxShadow   = '0 0 20px rgba(16,185,129,0.4)';
      } else if (i === idx && !correct) {
        b.style.borderColor = '#ef4444';
        b.style.background  = 'rgba(239,68,68,0.2)';
      }
    });

    if (correct) this.audio?.playCorrect();
    else this.audio?.playWrong();

    setTimeout(() => this.resolve(correct), 900);
  }

  _timeUp() {
    this._answered = true;
    this._optionBtns.forEach((b, i) => {
      b.disabled = true;
      if (i === this._correctOptionIdx) {
        b.style.borderColor = '#10b981';
        b.style.background  = 'rgba(16,185,129,0.2)';
      }
    });
    this.audio?.playWrong();
    setTimeout(() => this.resolve(false), 800);
  }
}
