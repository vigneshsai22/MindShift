/* ═══════════════════════════════════════════════
   MindShift IQ — Odd One Out
   Click the item that doesn't belong
   Types: shape, color, size, rotation, number
   ═══════════════════════════════════════════════ */
import { ChallengeBase } from '../ChallengeBase.js';
import { calcScore } from '../../data/challengePool.js';

export class OddOneOut extends ChallengeBase {
  constructor(data, engine) {
    super(data, engine);
    window._MS_SCORE_MODULE = { calcScore };
    this._answered  = false;
    this._itemBtns  = [];
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
    wrap.style.cssText = 'animation:fadeInUp 0.4s ease both;max-width:760px;';

    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--cat-iq-odd);margin-bottom:10px;';
    badge.textContent = `🔍 Odd One Out — ${this._subtypeLabel()}`;
    wrap.appendChild(badge);

    const inst = document.createElement('p');
    inst.className = 'challenge-instruction';
    inst.textContent = 'Which item does NOT belong with the others?';
    wrap.appendChild(inst);

    // Items row
    const grid = document.createElement('div');
    grid.className = 'odd-grid';
    this._itemBtns = [];

    this.data.items.forEach((item, i) => {
      const btn = document.createElement('button');
      btn.className = 'odd-item';
      btn.id = `odd-item-${i}`;
      btn.style.animationDelay = `${i * 0.07}s`;

      const c = document.createElement('canvas');
      c.width = 70; c.height = 70;
      btn.appendChild(c);
      this._renderItem(c.getContext('2d'), item, 35, 35, 70);

      btn.addEventListener('click', () => this._pick(i, btn));
      grid.appendChild(btn);
      this._itemBtns.push(btn);
    });
    wrap.appendChild(grid);

    // Number type: show the numbers as text tiles instead of canvas
    if (this.data.subtype === 'number') {
      grid.querySelectorAll('canvas').forEach((c, i) => {
        c.parentElement.innerHTML = '';
        const span = document.createElement('span');
        span.style.cssText = 'font-family:var(--font-mono);font-size:1.5rem;font-weight:800;color:var(--text-primary);';
        span.textContent = this.data.items[i].value;
        c.parentElement.appendChild(span);
      });
    }

    this.overlay.appendChild(wrap);
  }

  _renderItem(ctx, item, cx, cy, size) {
    ctx.clearRect(0, 0, size, size);
    if (this.data.subtype === 'number') return; // handled as text

    ctx.save();
    ctx.translate(cx, cy);
    if (item.rotation) ctx.rotate((item.rotation * Math.PI) / 180);
    ctx.fillStyle   = item.color || '#7c3aed';
    ctx.strokeStyle = (item.color || '#7c3aed') + 'cc';
    ctx.lineWidth   = 2;
    const s = (item.size || 1) * 20;
    this._drawShape(ctx, item.shape, item.color, 0, 0, s);
    ctx.restore();
  }

  _drawShape(ctx, shape, color, cx, cy, size) {
    ctx.fillStyle = color;
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
          const r = i % 2 === 0 ? size : size * 0.42;
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
                  : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
        }
        ctx.closePath(); ctx.fill(); break;
      case 'hexagon':
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
          i === 0 ? ctx.moveTo(cx + size * Math.cos(a), cy + size * Math.sin(a))
                  : ctx.lineTo(cx + size * Math.cos(a), cy + size * Math.sin(a));
        }
        ctx.closePath(); ctx.fill(); break;
      default:
        ctx.beginPath(); ctx.arc(cx, cy, size, 0, Math.PI * 2); ctx.fill();
    }
  }

  _pick(idx, btn) {
    if (this._answered) return;
    this._answered = true;
    this._attempts++;
    const correct = idx === this.data.oddIdx;

    this._itemBtns.forEach((b, i) => {
      b.style.cursor = 'default';
      if (i === this.data.oddIdx) b.classList.add('selected-correct', 'show-answer');
      else if (i === idx && !correct) b.classList.add('selected-wrong');
      else { b.style.opacity = '0.4'; b.style.transform = 'scale(0.92)'; }
    });

    if (correct) this.audio?.playCorrect();
    else         this.audio?.playWrong();
    setTimeout(() => this.resolve(correct), 1000);
  }

  _timeUp() {
    this._answered = true;
    this._itemBtns[this.data.oddIdx]?.classList.add('show-answer');
    this.audio?.playWrong();
    setTimeout(() => this.resolve(false), 800);
  }

  _subtypeLabel() {
    return { shape:'Shape-Based', color:'Color-Based', size:'Size-Based', rotation:'Rotation-Based', number:'Number-Based' }[this.data.subtype] || 'Pattern-Based';
  }

  _drawBackground() {
    const { width: W, height: H } = this.canvas;
    const bg = this.ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
    bg.addColorStop(0, 'rgba(251,191,36,0.06)'); bg.addColorStop(1, '#06060f');
    this.ctx.fillStyle = bg; this.ctx.fillRect(0, 0, W, H);

    const t = Date.now() / 1000;
    for (let i = 0; i < 6; i++) {
      const x = W * (0.1 + i * 0.15) + Math.sin(t * 0.4 + i) * 20;
      const y = H * 0.08 + Math.cos(t * 0.3 + i) * 12;
      this.ctx.beginPath(); this.ctx.arc(x, y, 2, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(251,191,36,${0.05 + Math.sin(t + i) * 0.025})`;
      this.ctx.fill();
    }
  }
}
