/* ═══════════════════════════════════════════════
   MindShift — HUDOverlay
   Manages all top-bar HUD elements during gameplay
   ═══════════════════════════════════════════════ */

export class HUDOverlay {
  constructor() {
    this._timerEl    = document.getElementById('hud-timer');
    this._scoreEl    = document.getElementById('hud-score');
    this._streakEl   = document.getElementById('hud-streak');
    this._hintEl     = document.getElementById('hud-hints');
    this._catEl      = document.getElementById('hud-category-badge');
    this._numEl      = document.getElementById('hud-challenge-num');
    this._totalEl    = document.getElementById('hud-challenge-total');
    this._dotsEl     = document.getElementById('progress-dots');
    this._timerWrap  = document.getElementById('hud-timer-wrap');
    this._score      = 0;
    this._hints      = 3;
    this._streak     = 0;
    this._total      = 10;
    this._dotsState  = []; // 'current'|'done'|'wrong'|'pending'
  }

  reset(totalChallenges = 10, hints = 3) {
    this._score   = 0;
    this._streak  = 0;
    this._hints   = hints;
    this._total   = totalChallenges;
    this._dotsState = Array(totalChallenges).fill('pending');
    this._update();
    this._buildDots();
    if (this._totalEl) this._totalEl.textContent = totalChallenges;
  }

  // ── Setters ───────────────────────────────────
  setScore(score) {
    const old = this._score;
    this._score = score;
    if (this._scoreEl) {
      this._scoreEl.textContent = score;
      if (score > old) this._animatePop(this._scoreEl);
    }
  }

  addScore(delta) { this.setScore(this._score + delta); }

  setStreak(streak) {
    this._streak = streak;
    if (this._streakEl) {
      this._streakEl.textContent = `${streak}🔥`;
      if (streak > 0) this._animatePop(this._streakEl);
    }
  }

  setTimer(seconds, total) {
    if (!this._timerEl) return;
    this._timerEl.textContent = seconds;
    // Colour urgency
    if (seconds <= 5) {
      this._timerEl.style.color = '#ef4444';
      this._timerWrap?.classList.add('urgent');
    } else if (seconds <= 10) {
      this._timerEl.style.color = '#f59e0b';
      this._timerWrap?.classList.remove('urgent');
    } else {
      this._timerEl.style.color = 'var(--accent-secondary)';
      this._timerWrap?.classList.remove('urgent');
    }
  }

  setHints(n) {
    this._hints = n;
    if (this._hintEl) this._hintEl.textContent = `${n}💡`;
  }

  consumeHint() {
    if (this._hints <= 0) return false;
    this._hints--;
    this.setHints(this._hints);
    return true;
  }

  get hintsRemaining() { return this._hints; }

  setCategory(category) {
    const labels = {
      logical:  '🧠 Logical',
      pattern:  '🔮 Pattern',
      memory:   '💾 Memory',
      visual:   '👁️ Visual',
      reaction: '⚡ Reaction',
      audio:    '🎵 Audio'
    };
    const colors = {
      logical:'#7c3aed', pattern:'#06b6d4', memory:'#10b981',
      visual:'#f59e0b', reaction:'#ef4444', audio:'#a855f7'
    };
    if (this._catEl) {
      this._catEl.textContent = labels[category] || category;
      this._catEl.style.borderColor = (colors[category] || '#7c3aed') + '66';
      this._catEl.style.color = colors[category] || '#a78bfa';
    }
  }

  setChallengeNumber(num, total) {
    if (this._numEl)   this._numEl.textContent  = num;
    if (this._totalEl) this._totalEl.textContent = total;
    this._activateDot(num - 1);
  }

  markDot(idx, result) {
    if (idx >= 0 && idx < this._dotsState.length) {
      this._dotsState[idx] = result ? 'done' : 'wrong';
      this._buildDots();
    }
  }

  // ── Private ───────────────────────────────────
  _update() {
    if (this._scoreEl)  this._scoreEl.textContent  = this._score;
    if (this._streakEl) this._streakEl.textContent  = `${this._streak}🔥`;
    if (this._hintEl)   this._hintEl.textContent    = `${this._hints}💡`;
    if (this._timerEl)  this._timerEl.textContent   = '—';
  }

  _buildDots() {
    if (!this._dotsEl) return;
    this._dotsEl.innerHTML = '';
    this._dotsState.forEach((state, i) => {
      const dot = document.createElement('div');
      dot.className = `progress-dot ${state}`;
      this._dotsEl.appendChild(dot);
    });
  }

  _activateDot(idx) {
    // Reset all 'current' to pending, set idx to current
    this._dotsState = this._dotsState.map((s, i) => {
      if (s === 'current') return 'pending';
      return s;
    });
    if (idx >= 0 && idx < this._dotsState.length) {
      if (this._dotsState[idx] === 'pending') this._dotsState[idx] = 'current';
    }
    this._buildDots();
  }

  _animatePop(el) {
    el.style.transform = 'scale(1.4)';
    el.style.transition = 'transform 0.15s ease';
    setTimeout(() => {
      el.style.transform = 'scale(1)';
    }, 150);
  }

  // ── Toast notifications ───────────────────────
  toast(msg, type = '') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(-10px)';
      t.style.transition = 'all 0.3s ease';
      setTimeout(() => t.remove(), 300);
    }, 2500);
  }
}
