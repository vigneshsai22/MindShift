/* ═══════════════════════════════════════════════
   MindShift — Memory Challenge
   Show → hide → recall sequence
   ═══════════════════════════════════════════════ */
import { ChallengeBase } from './ChallengeBase.js';
import { calcScore } from '../data/challengePool.js';

const PHASES = { SHOW: 'show', HIDE: 'hide', RECALL: 'recall', DONE: 'done' };

export class MemoryChallenge extends ChallengeBase {
  constructor(data, engine) {
    super(data, engine);
    window._MS_SCORE_MODULE = { calcScore };
    this._phase = PHASES.SHOW;
    this._userSeq = [];
    this._tiles = [];
    this._tileBtns = [];
    this._countdown = null;
    this._showCountEl = null;
  }

  setup() { this._drawBackground(); }

  start() {
    super.start();
    this._phase = PHASES.SHOW;
    this._renderShow();
    // After showTime ms, hide and switch to recall
    setTimeout(() => {
      if (!this._resolved) this._startRecall();
    }, this.data.showTime);
  }

  teardown() {
    super.teardown();
    if (this._countdown) { clearInterval(this._countdown); this._countdown = null; }
  }

  // ── Show Phase ────────────────────────────────
  _renderShow() {
    this.clearOverlay();
    this.setOverlayInteractive(false);
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:20px;width:100%;';

    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#34d399;';
    badge.textContent = '🧠 Memory Challenge — Memorize This!';
    wrap.appendChild(badge);

    const info = document.createElement('p');
    info.className = 'challenge-instruction';
    info.textContent = `Remember the order of these ${this.data.seq.length} items`;
    wrap.appendChild(info);

    // Timer countdown
    let timeLeft = Math.ceil(this.data.showTime / 1000);
    const timerEl = document.createElement('div');
    timerEl.style.cssText = 'font-family:"Outfit",sans-serif;font-size:1.8rem;font-weight:800;color:#10b981;text-shadow:0 0 20px rgba(16,185,129,0.5);';
    timerEl.textContent = timeLeft + 's';
    wrap.appendChild(timerEl);
    this._countdown = setInterval(() => {
      timeLeft--;
      timerEl.textContent = timeLeft + 's';
      if (timeLeft <= 0) clearInterval(this._countdown);
    }, 1000);

    // Tiles
    const tilesDiv = document.createElement('div');
    tilesDiv.className = 'memory-tiles';

    this.data.seq.forEach((sym, i) => {
      const tile = document.createElement('div');
      tile.className = 'memory-tile revealed';
      tile.style.cssText = `
        width:80px;height:80px;border-radius:14px;
        background:rgba(16,185,129,0.15);
        border:2px solid rgba(16,185,129,0.5);
        display:flex;align-items:center;justify-content:center;
        font-size:1.8rem;
        animation:scaleIn 0.3s ease ${i*0.08}s both;
      `;
      tile.textContent = sym;
      tilesDiv.appendChild(tile);
    });
    wrap.appendChild(tilesDiv);
    this.overlay.appendChild(wrap);

    // Canvas animation
    this.startAnim(() => this._drawBackground());
  }

  // ── Recall Phase ──────────────────────────────
  _startRecall() {
    this._stopAnim();
    this._phase = PHASES.RECALL;
    this._userSeq = [];
    this.clearOverlay();
    this.setOverlayInteractive(true);

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:20px;width:100%;';

    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#a78bfa;';
    badge.textContent = '🧠 Memory Challenge — Recall the Order!';
    wrap.appendChild(badge);

    const prog = document.createElement('div');
    prog.style.cssText = 'font-size:0.9rem;color:#94a3b8;';
    prog.id = 'mem-progress';
    prog.textContent = `Click in order: 0 / ${this.data.seq.length}`;
    wrap.appendChild(prog);

    // Shuffled tiles
    const shuffled = [...this.data.seq].sort(() => Math.random() - 0.5);
    const tilesDiv = document.createElement('div');
    tilesDiv.className = 'memory-tiles';
    this._tileBtns = [];

    shuffled.forEach((sym, i) => {
      const tile = document.createElement('button');
      tile.className = 'memory-tile';
      tile.style.cssText = `
        width:80px;height:80px;border-radius:14px;
        background:rgba(124,58,237,0.1);
        border:2px solid rgba(124,58,237,0.3);
        display:flex;align-items:center;justify-content:center;
        font-size:1.8rem;cursor:pointer;
        animation:scaleIn 0.3s ease ${i*0.06}s both;
        transition:all 0.15s ease;
      `;
      tile.textContent = sym;
      tile.dataset.sym = sym;
      tile.dataset.originalSym = sym;

      tile.addEventListener('click', () => this._onTileClick(tile, sym));
      tilesDiv.appendChild(tile);
      this._tileBtns.push(tile);
    });
    wrap.appendChild(tilesDiv);

    // Submit button
    const submit = document.createElement('button');
    submit.className = 'btn-primary';
    submit.textContent = 'Submit Answer';
    submit.id = 'mem-submit';
    submit.style.marginTop = '8px';
    submit.disabled = true;
    submit.addEventListener('click', () => this._evaluate());
    wrap.appendChild(submit);

    this.overlay.appendChild(wrap);

    // Start game timer for recall phase
    this.startTimer(
      this.data.timeLimitSec,
      (t) => this.engine.hud.setTimer(t, this.data.timeLimitSec),
      () => { if (!this._resolved) this._evaluate(); }
    );

    // Restart canvas anim
    this.startAnim(() => this._drawBackground());
  }

  _onTileClick(tile, sym) {
    if (this._resolved) return;
    // Toggle: if already in sequence, remove; else add
    const existingIdx = this._userSeq.indexOf(sym + '_' + tile.dataset.idx);
    // Use a unique key per tile
    if (!tile.dataset.idx) tile.dataset.idx = Date.now() + Math.random();
    const key = tile.dataset.idx;
    const seqIdx = this._userSeq.findIndex(k => k === key);

    if (seqIdx >= 0) {
      // Deselect
      this._userSeq.splice(seqIdx, 1);
      tile.classList.remove('selected-order');
      tile.querySelector('.memory-order-badge')?.remove();
      this._audio?.playClick();
      this._rebuildBadges();
    } else {
      // Select
      this._userSeq.push(key);
      tile._sym = sym;
      tile.classList.add('selected-order');
      const badge = document.createElement('span');
      badge.className = 'memory-order-badge';
      badge.textContent = this._userSeq.length;
      tile.appendChild(badge);
      this.audio?.playClick();
    }

    const prog = document.getElementById('mem-progress');
    if (prog) prog.textContent = `Click in order: ${this._userSeq.length} / ${this.data.seq.length}`;

    const submit = document.getElementById('mem-submit');
    if (submit) submit.disabled = this._userSeq.length !== this.data.seq.length;
  }

  _rebuildBadges() {
    // Re-number badges after a deselect
    this._tileBtns.forEach(tile => {
      tile.querySelector('.memory-order-badge')?.remove();
      const key = tile.dataset.idx;
      const pos = this._userSeq.indexOf(key);
      if (pos >= 0) {
        const badge = document.createElement('span');
        badge.className = 'memory-order-badge';
        badge.textContent = pos + 1;
        tile.appendChild(badge);
      }
    });
  }

  _evaluate() {
    if (this._resolved) return;
    // Build user answer sequence of symbols
    const userAnswer = this._userSeq.map(key => {
      const tile = this._tileBtns.find(t => t.dataset.idx === key);
      return tile ? tile._sym : null;
    }).filter(Boolean);

    const correct = JSON.stringify(userAnswer) === JSON.stringify(this.data.seq);
    this._attempts++;

    // Color tiles
    userAnswer.forEach((sym, i) => {
      const correctSym = this.data.seq[i];
      const tile = this._tileBtns.find(t => t._sym === sym && t.dataset.idx === this._userSeq[i]);
      if (tile) {
        tile.classList.remove('selected-order');
        tile.classList.add(sym === correctSym ? 'correct-tile' : 'wrong-tile');
      }
    });

    // Show correct answer briefly
    if (!correct) {
      const info = document.createElement('div');
      info.style.cssText = 'margin-top:12px;color:#fca5a5;font-size:0.85rem;';
      info.textContent = `Correct order: ${this.data.seq.join(' → ')}`;
      this.overlay.querySelector('div')?.appendChild(info);
    }

    if (correct) this.audio?.playCorrect();
    else this.audio?.playWrong();

    // Tag as perfect for achievement check
    if (correct && this.data.difficulty >= 4) {
      this.engine.sessionMeta = this.engine.sessionMeta || {};
      this.engine.sessionMeta.memoryPerfect = true;
    }

    setTimeout(() => this.resolve(correct), 1200);
  }

  _drawBackground() {
    const { width: W, height: H } = this.canvas;
    const bg = this.ctx.createRadialGradient(W*0.5,H*0.5,0,W*0.5,H*0.5,W*0.6);
    bg.addColorStop(0,'rgba(16,185,129,0.06)');
    bg.addColorStop(1,'#06060f');
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0,0,W,H);

    // Floating dots
    const t = Date.now() / 1000;
    for (let i=0;i<8;i++) {
      const x = (W*0.1 + i*(W*0.11) + Math.sin(t*0.4+i)*30);
      const y = H/2 + Math.cos(t*0.3+i*1.2)*40;
      this.ctx.beginPath();
      this.ctx.arc(x,y,3,0,Math.PI*2);
      this.ctx.fillStyle=`rgba(16,185,129,${0.08+Math.sin(t+i)*0.04})`;
      this.ctx.fill();
    }
  }
}
