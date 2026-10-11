/* ═══════════════════════════════════════════════
   MindShift — Logical Reasoning Challenge
   Number sequences & pattern completion
   ═══════════════════════════════════════════════ */
import { ChallengeBase } from './ChallengeBase.js';
import { calcScore } from '../data/challengePool.js';

export class LogicalReasoning extends ChallengeBase {
  constructor(data, engine) {
    super(data, engine);
    window._MS_SCORE_MODULE = { calcScore };
    this._selectedOption = null;
    this._answered = false;
    this._optionEls = [];
    this._particles = [];
  }

  setup() {
    this.clearCanvas();
    this._drawBackground();
  }

  start() {
    super.start();
    this._renderChallenge();
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

  // ── Rendering ─────────────────────────────────

  _drawBackground() {
    const { width: W, height: H } = this.canvas;
    // Deep gradient background
    const bg = this.ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.7);
    bg.addColorStop(0, 'rgba(124,58,237,0.08)');
    bg.addColorStop(1, '#06060f');
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, W, H);

    // Grid lines
    this.ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 50) {
      this.ctx.beginPath(); this.ctx.moveTo(x,0); this.ctx.lineTo(x,H); this.ctx.stroke();
    }
    for (let y = 0; y < H; y += 50) {
      this.ctx.beginPath(); this.ctx.moveTo(0,y); this.ctx.lineTo(W,y); this.ctx.stroke();
    }
  }

  _renderChallenge() {
    const { width: W, height: H } = this.canvas;
    this.clearOverlay();
    this.setOverlayInteractive(true);

    // Question wrapper
    const wrap = document.createElement('div');
    wrap.className = 'challenge-prompt';
    wrap.style.animation = 'fadeInUp 0.4s ease both';

    // Category badge
    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#a78bfa;margin-bottom:12px;';
    badge.textContent = '🧠 Logical Reasoning';
    wrap.appendChild(badge);

    // Question text (sequence)
    const [label, ...seqParts] = this.data.question.split('\n');
    const seq = seqParts.join('\n');

    const qLabel = document.createElement('p');
    qLabel.className = 'challenge-instruction';
    qLabel.textContent = label;
    wrap.appendChild(qLabel);

    // Sequence tiles
    const seqWrap = document.createElement('div');
    seqWrap.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:10px;margin:16px 0 24px;flex-wrap:wrap;';
    const parts = seq.split(', ');
    parts.forEach((part, i) => {
      const tile = document.createElement('div');
      const isBlank = part === '?';
      tile.style.cssText = `
        display:flex;align-items:center;justify-content:center;
        min-width:64px;height:64px;padding:0 12px;
        border-radius:12px;font-family:'Outfit',sans-serif;
        font-size:1.4rem;font-weight:800;
        border:2px solid ${isBlank ? '#7c3aed' : 'rgba(255,255,255,0.12)'};
        background:${isBlank ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)'};
        color:${isBlank ? '#c4b5fd' : '#f1f5f9'};
        box-shadow:${isBlank ? '0 0 20px rgba(124,58,237,0.3)' : 'none'};
        animation:fadeInUp 0.3s ease ${i*0.06}s both;
        transition:transform 0.15s ease;
      `;
      tile.textContent = isBlank ? '?' : part;
      if (isBlank) tile.style.animation += ',pulseGlow 2s ease-in-out infinite';
      seqWrap.appendChild(tile);

      if (i < parts.length - 1) {
        const arrow = document.createElement('span');
        arrow.textContent = '→';
        arrow.style.cssText = 'color:rgba(255,255,255,0.2);font-size:1.1rem;';
        seqWrap.appendChild(arrow);
      }
    });
    wrap.appendChild(seqWrap);

    // Options grid
    const grid = document.createElement('div');
    grid.className = 'options-grid grid-4';
    this._optionEls = [];

    this.data.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.id = `logical-opt-${i}`;
      btn.style.animation = `fadeInUp 0.3s ease ${0.2 + i*0.06}s both`;
      btn.addEventListener('click', () => this._selectOption(opt, btn));
      grid.appendChild(btn);
      this._optionEls.push(btn);
    });
    wrap.appendChild(grid);

    this.overlay.appendChild(wrap);
    this._startParticleLoop();
  }

  _selectOption(value, btn) {
    if (this._answered) return;
    this._answered = true;
    this._attempts++;

    const correct = value === this.data.correctOption ||
                    String(value) === String(this.data.correctOption);

    // Visual feedback on all buttons
    this._optionEls.forEach(el => {
      el.disabled = true;
      const elVal = el.textContent;
      if (String(elVal) === String(this.data.correctOption)) {
        el.classList.add('correct-answer');
      } else if (el === btn && !correct) {
        el.classList.add('wrong-answer');
      }
    });

    if (correct) {
      this.audio?.playCorrect();
    } else {
      this.audio?.playWrong();
    }

    setTimeout(() => this.resolve(correct), 1000);
  }

  _timeUp() {
    this._answered = true;
    this._optionEls.forEach(el => {
      el.disabled = true;
      if (String(el.textContent) === String(this.data.correctOption)) {
        el.classList.add('correct-answer');
      }
    });
    this.audio?.playWrong();
    setTimeout(() => this.resolve(false), 800);
  }

  // ── Particles ─────────────────────────────────
  _startParticleLoop() {
    const { width: W, height: H } = this.canvas;
    for (let i = 0; i < 20; i++) {
      this._particles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random()-0.5)*0.4, vy: -Math.random()*0.6-0.2,
        r: Math.random()*2+1,
        alpha: Math.random()*0.4+0.1,
        color: Math.random()>0.5?'#7c3aed':'#06b6d4'
      });
    }
    this.startAnim(() => {
      this._drawBackground();
      const ctx = this.ctx;
      this._particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -5) { p.y = this.canvas.height + 5; p.x = Math.random() * this.canvas.width; }
        if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = p.color + Math.round(p.alpha*255).toString(16).padStart(2,'0');
        ctx.fill();
      });
    });
  }
}
