/* ═══════════════════════════════════════════════
   MindShift IQ — Number Sequence Puzzle
   Animated number sequences with missing value
   ═══════════════════════════════════════════════ */
import { ChallengeBase } from '../ChallengeBase.js';
import { calcScore } from '../../data/challengePool.js';

export class NumberSequence extends ChallengeBase {
  constructor(data, engine) {
    super(data, engine);
    window._MS_SCORE_MODULE = { calcScore };
    this._answered  = false;
    this._optionEls = [];
    this._particles = [];
    this._revealIdx = 0;
  }

  setup() { this._drawBackground(); }

  start() {
    super.start();
    this._buildUI();
    this._animateReveal();
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

  // ── UI ─────────────────────────────────────────
  _buildUI() {
    this.clearOverlay();
    this.setOverlayInteractive(true);

    const wrap = document.createElement('div');
    wrap.className = 'challenge-prompt';
    wrap.style.animation = 'fadeInUp 0.4s ease both';
    wrap.style.maxWidth = '740px';

    // Badge
    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--iq-accent);margin-bottom:10px;';
    badge.textContent = '🔢 Number Sequence';
    wrap.appendChild(badge);

    // Instruction
    const inst = document.createElement('p');
    inst.className = 'challenge-instruction';
    inst.textContent = 'What number completes the sequence?';
    wrap.appendChild(inst);

    // Sequence tiles
    const seqWrap = document.createElement('div');
    seqWrap.className = 'iq-seq-wrap';
    seqWrap.id = 'iq-seq-wrap';
    this.data.sequence.forEach((val, i) => {
      const isBlank = val === '?';
      const tile = document.createElement('div');
      tile.className = `iq-seq-tile${isBlank ? ' blank' : ''}`;
      tile.id = `seq-tile-${i}`;
      tile.style.opacity = '0';
      tile.style.transform = 'scale(0.6)';
      tile.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      tile.textContent = isBlank ? '?' : val;
      seqWrap.appendChild(tile);

      if (i < this.data.sequence.length - 1 && !isBlank) {
        const arrow = document.createElement('span');
        arrow.className = 'iq-arrow';
        arrow.textContent = '→';
        seqWrap.appendChild(arrow);
      }
    });
    wrap.appendChild(seqWrap);

    // Rule hint (shown after delay at higher difficulty)
    const ruleEl = document.createElement('div');
    ruleEl.id = 'seq-rule';
    ruleEl.style.cssText = 'font-size:0.75rem;color:rgba(245,158,11,0.5);font-style:italic;min-height:1.2em;margin-bottom:8px;';
    if (this.data.difficulty <= 2) ruleEl.textContent = `Pattern: ${this.data.rule}`;
    wrap.appendChild(ruleEl);

    // Options grid
    const grid = document.createElement('div');
    grid.className = 'options-grid grid-4';
    this._optionEls = [];
    this.data.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.id = `iq-num-opt-${i}`;
      btn.style.cssText = 'font-family:var(--font-mono);font-size:1.15rem;font-weight:700;opacity:0;transform:translateY(8px);transition:opacity 0.25s ease,transform 0.25s ease;';
      btn.textContent = opt;
      btn.addEventListener('click', () => this._select(opt, btn));
      grid.appendChild(btn);
      this._optionEls.push(btn);
    });
    wrap.appendChild(grid);
    this.overlay.appendChild(wrap);

    // Start canvas particle anim
    this.startAnim(() => this._drawBackground());
  }

  // ── Staggered tile reveal ─────────────────────
  _animateReveal() {
    const tiles = document.querySelectorAll('.iq-seq-tile');
    tiles.forEach((tile, i) => {
      setTimeout(() => {
        tile.style.opacity = '1';
        tile.style.transform = 'scale(1)';
      }, i * 120);
    });
    // Show options after sequence appears
    setTimeout(() => {
      this._optionEls.forEach((btn, i) => {
        setTimeout(() => {
          btn.style.opacity = '1';
          btn.style.transform = 'translateY(0)';
        }, i * 70);
      });
    }, tiles.length * 120 + 200);
  }

  // ── Selection ────────────────────────────────
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

    // Fill blank tile
    const blankTile = document.getElementById(`seq-tile-${this.data.sequence.indexOf('?')}`);
    if (blankTile) {
      blankTile.textContent = this.data.answer;
      blankTile.style.borderColor = correct ? '#10b981' : '#ef4444';
      blankTile.style.background  = correct ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)';
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

  // ── Canvas BG ─────────────────────────────────
  _drawBackground() {
    const { width: W, height: H } = this.canvas;
    const ctx = this.ctx;
    const t = Date.now() / 1000;

    // Deep amber-tinted background
    const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.7);
    bg.addColorStop(0, 'rgba(245,158,11,0.06)');
    bg.addColorStop(1, '#06060f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Floating numbers
    const nums = ['∑','π','∞','√','Δ','Ω','φ','λ'];
    nums.forEach((n, i) => {
      const x = 60 + i * (W - 120) / 7 + Math.sin(t * 0.3 + i) * 20;
      const y = H * 0.12 + Math.cos(t * 0.25 + i * 1.1) * 18;
      ctx.fillStyle = `rgba(245,158,11,${0.05 + Math.sin(t + i) * 0.025})`;
      ctx.font = `${20 + (i % 3) * 5}px JetBrains Mono`;
      ctx.textAlign = 'center';
      ctx.fillText(n, x, y);
    });

    // Particle trail
    if (!this._particles.length) {
      for (let i = 0; i < 25; i++) {
        this._particles.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -Math.random() * 0.6 - 0.1,
          r: Math.random() * 1.8 + 0.5,
          alpha: Math.random() * 0.35 + 0.08
        });
      }
    }
    this._particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
      if (p.x < 0 || p.x > W) p.vx *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,158,11,${p.alpha})`;
      ctx.fill();
    });
  }
}
