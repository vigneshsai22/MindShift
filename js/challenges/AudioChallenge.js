/* ═══════════════════════════════════════════════
   MindShift — Audio Challenge
   Listen to tone sequence → reproduce it
   ═══════════════════════════════════════════════ */
import { ChallengeBase } from './ChallengeBase.js';
import { calcScore, NOTE_NAMES } from '../data/challengePool.js';

const NOTE_LABELS = { C4:'C', D4:'D', E4:'E', F4:'F', G4:'G', A4:'A', B4:'B', C5:'C♪' };
const NOTE_COLORS = {
  C4:'#7c3aed', D4:'#06b6d4', E4:'#10b981', F4:'#f59e0b',
  G4:'#ef4444', A4:'#a855f7', B4:'#ec4899', C5:'#3b82f6'
};

export class AudioChallenge extends ChallengeBase {
  constructor(data, engine) {
    super(data, engine);
    window._MS_SCORE_MODULE = { calcScore };
    this._phase = 'listen';  // listen | recall
    this._userSeq = [];
    this._keyEls = {};
    this._playbackIdx = 0;
    this._playTimeout = null;
    this._attempts = 0;
  }

  setup() { this._drawBackground(); }

  start() {
    super.start();
    this._renderUI();
    // Auto-play sequence after a short delay
    setTimeout(() => this._playSequence(), 800);

    this.startTimer(
      this.data.timeLimitSec,
      (t) => this.engine.hud.setTimer(t, this.data.timeLimitSec),
      () => { if (!this._resolved) this._evaluate(); }
    );
  }

  teardown() {
    super.teardown();
    if (this._playTimeout) clearTimeout(this._playTimeout);
    this.audio?.stopSpeak();
  }

  // ── UI ────────────────────────────────────────
  _renderUI() {
    this.clearOverlay();
    this.setOverlayInteractive(true);

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:20px;width:100%;max-width:680px;';

    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#c084fc;';
    badge.textContent = '🎵 Audio Challenge — Listen, Then Reproduce!';
    wrap.appendChild(badge);

    // Status line
    const status = document.createElement('div');
    status.id = 'audio-status';
    status.style.cssText = 'font-size:0.95rem;color:#94a3b8;text-align:center;min-height:1.4em;';
    status.textContent = '🔊 Playing sequence…';
    wrap.appendChild(status);

    // Visualizer bars (one per note in sequence)
    const vizWrap = document.createElement('div');
    vizWrap.style.cssText = 'display:flex;gap:6px;align-items:flex-end;height:48px;';
    vizWrap.id = 'audio-viz';
    this.data.seq.forEach((note, i) => {
      const bar = document.createElement('div');
      bar.id = `viz-bar-${i}`;
      bar.style.cssText = `
        width:22px;border-radius:4px 4px 0 0;
        background:${NOTE_COLORS[note]}44;
        border:1px solid ${NOTE_COLORS[note]}66;
        height:6px;transition:height 0.15s ease,background 0.15s ease;
      `;
      vizWrap.appendChild(bar);
    });
    wrap.appendChild(vizWrap);

    // User progress display
    const progress = document.createElement('div');
    progress.id = 'audio-progress';
    progress.style.cssText = 'display:flex;gap:6px;align-items:center;min-height:24px;';
    wrap.appendChild(progress);

    // Piano keys
    const piano = document.createElement('div');
    piano.className = 'audio-piano';
    NOTE_NAMES.forEach(note => {
      const key = document.createElement('button');
      key.className = 'piano-key';
      key.id = `piano-key-${note}`;
      key.dataset.note = note;
      key.textContent = NOTE_LABELS[note] || note;
      key.disabled = true; // enabled after sequence plays
      key.addEventListener('click', () => this._onKeyPress(note, key));
      piano.appendChild(key);
      this._keyEls[note] = key;
    });
    wrap.appendChild(piano);

    // Replay + submit row
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;justify-content:center;';

    const replayBtn = document.createElement('button');
    replayBtn.className = 'btn-secondary';
    replayBtn.id = 'audio-replay';
    replayBtn.textContent = '🔁 Replay Sequence';
    replayBtn.disabled = true;
    replayBtn.addEventListener('click', () => {
      this._userSeq = [];
      this._updateProgress();
      this._playSequence();
    });
    btnRow.appendChild(replayBtn);

    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn-primary';
    submitBtn.id = 'audio-submit';
    submitBtn.textContent = 'Check Answer';
    submitBtn.disabled = true;
    submitBtn.addEventListener('click', () => this._evaluate());
    btnRow.appendChild(submitBtn);

    wrap.appendChild(btnRow);
    this.overlay.appendChild(wrap);
    this.startAnim(() => this._drawBackground());
  }

  // ── Sequence Playback ─────────────────────────
  _playSequence() {
    const status = document.getElementById('audio-status');
    if (status) status.textContent = '🔊 Listen carefully…';

    // Disable keys during playback
    Object.values(this._keyEls).forEach(k => k.disabled = true);
    const replayBtn = document.getElementById('audio-replay');
    if (replayBtn) replayBtn.disabled = true;

    const noteDur = this.data.noteDur || 0.5;
    const gap = 0.12;
    const total = this.data.seq.length * (noteDur + gap) * 1000;

    // Play all notes
    this.data.seq.forEach((note, i) => {
      const delay = i * (noteDur + gap) * 1000;
      setTimeout(() => {
        if (this._resolved) return;
        this.audio?.playNote(note, noteDur);
        this._lightKey(note, noteDur);
        this._lightVizBar(i, noteDur);
      }, delay);
    });

    // Enable after playback
    setTimeout(() => {
      if (this._resolved) return;
      if (status) status.textContent = '🎹 Now reproduce the sequence!';
      this._phase = 'recall';
      Object.values(this._keyEls).forEach(k => k.disabled = false);
      if (replayBtn) replayBtn.disabled = false;
    }, total + 400);
  }

  _lightKey(note, dur) {
    const key = this._keyEls[note];
    if (!key) return;
    key.classList.add('playing');
    setTimeout(() => key.classList.remove('playing'), dur * 800);
  }

  _lightVizBar(idx, dur) {
    const bar = document.getElementById(`viz-bar-${idx}`);
    if (!bar) return;
    const note = this.data.seq[idx];
    bar.style.height = '42px';
    bar.style.background = NOTE_COLORS[note];
    setTimeout(() => {
      bar.style.height = '6px';
      bar.style.background = NOTE_COLORS[note] + '44';
    }, dur * 800);
  }

  // ── Input ─────────────────────────────────────
  _onKeyPress(note, keyEl) {
    if (this._phase !== 'recall' || this._resolved) return;
    if (this._userSeq.length >= this.data.seq.length) return;

    this._userSeq.push(note);
    this.audio?.playNote(note, 0.4);
    keyEl.classList.add('active');
    setTimeout(() => keyEl.classList.remove('active'), 300);

    this._updateProgress();

    // Auto-submit when full
    const submitBtn = document.getElementById('audio-submit');
    if (this._userSeq.length === this.data.seq.length) {
      if (submitBtn) submitBtn.disabled = false;
      setTimeout(() => { if (!this._resolved) this._evaluate(); }, 400);
    }
  }

  _updateProgress() {
    const prog = document.getElementById('audio-progress');
    if (!prog) return;
    prog.innerHTML = '';
    this.data.seq.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.style.cssText = `
        width:10px;height:10px;border-radius:50%;
        border:2px solid rgba(255,255,255,0.2);
        background:${i < this._userSeq.length ? NOTE_COLORS[this._userSeq[i]] : 'transparent'};
        transition:background 0.15s ease;
      `;
      prog.appendChild(dot);
    });
  }

  // ── Evaluation ────────────────────────────────
  _evaluate() {
    if (this._resolved) return;
    this._attempts++;

    const correct = JSON.stringify(this._userSeq) === JSON.stringify(this.data.seq);

    // Color the keys
    this.data.seq.forEach((note, i) => {
      const key = this._keyEls[note];
      if (!key) return;
      if (this._userSeq[i] === note) {
        key.classList.add('correct-key');
      } else if (this._userSeq[i]) {
        const wrongKey = this._keyEls[this._userSeq[i]];
        if (wrongKey) wrongKey.classList.add('wrong-key');
      }
    });

    if (correct) {
      this.audio?.playCorrect();
      this.engine.sessionMeta = this.engine.sessionMeta || {};
      this.engine.sessionMeta.audioPerfect = true;
    } else {
      this.audio?.playWrong();
      // Show correct answer
      const status = document.getElementById('audio-status');
      if (status) {
        status.textContent = `Correct: ${this.data.seq.join(' → ')}`;
        status.style.color = '#fca5a5';
      }
    }

    setTimeout(() => this.resolve(correct), 1200);
  }

  _drawBackground() {
    const { width: W, height: H } = this.canvas;
    const t = Date.now() / 1000;
    const bg = this.ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.6);
    bg.addColorStop(0,'rgba(168,85,247,0.07)');
    bg.addColorStop(1,'#06060f');
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0,0,W,H);

    // Floating musical note symbols
    const notes = ['♩','♪','♫','♬'];
    for (let i=0;i<8;i++) {
      const x = 60 + i*(W-120)/7 + Math.sin(t*0.5+i)*15;
      const y = H*0.1 + Math.cos(t*0.4+i*1.3)*20;
      this.ctx.fillStyle=`rgba(168,85,247,${0.06+Math.sin(t+i)*0.03})`;
      this.ctx.font=`${18+i%3*4}px serif`;
      this.ctx.fillText(notes[i%4], x, y);
    }
  }
}
