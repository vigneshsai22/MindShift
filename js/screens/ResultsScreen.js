/* ═══════════════════════════════════════════════
   MindShift — ResultsScreen
   Per-challenge result feedback
   ═══════════════════════════════════════════════ */
export class ResultsScreen {
  constructor(engine) {
    this.engine = engine;
    this.el     = document.getElementById('results-screen');
    this._data  = null;
  }

  show(data) {
    this._data = data;
    this.el.classList.add('active');
    this._render(data);
    this._bindNext(data);
  }

  hide() {
    this.el.classList.remove('active');
    this.el.classList.add('exiting');
    setTimeout(() => this.el.classList.remove('exiting'), 400);
  }

  _render({ metrics, challengeIdx, total, adaptiveMsg, streak, isLast }) {
    const correct = metrics.correct;

    // Icon
    const icon = document.getElementById('result-icon');
    if (icon) {
      icon.textContent = correct ? '✅' : '❌';
      icon.style.animation = 'correctBounce 0.5s ease both';
    }

    // Title
    const title = document.getElementById('result-title');
    if (title) {
      title.textContent = correct ? this._successMsg() : this._failMsg();
      title.style.color = correct ? 'var(--accent-success)' : 'var(--accent-danger)';
    }

    // Sub
    const sub = document.getElementById('result-sub');
    if (sub) {
      sub.textContent = `Challenge ${challengeIdx} of ${total} — ${this._catLabel(metrics.category)}`;
    }

    // Stats
    this._setText('result-points',   correct ? `+${metrics.score}` : '+0');
    this._setText('result-time',     `${metrics.responseTime}s`);
    this._setText('result-accuracy', `${metrics.attempts === 1 && correct ? 100 : (correct ? Math.round(100/metrics.attempts) : 0)}%`);

    // Score chip colour
    const scoreChip = document.getElementById('result-score-chip');
    if (scoreChip) {
      scoreChip.style.borderColor = correct ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.3)';
    }

    // Streak message
    const streakEl = document.getElementById('streak-message');
    if (streakEl) {
      if (streak >= 3) streakEl.textContent = `🔥 ${streak}× Streak!`;
      else if (!correct && streak === 0) streakEl.textContent = '';
      else streakEl.textContent = '';
    }

    // Adaptive message
    const adMsg = document.getElementById('adaptive-message');
    if (adMsg) adMsg.textContent = adaptiveMsg || '';

    // Next button text
    const nextBtn = document.getElementById('btn-next-challenge');
    if (nextBtn) {
      nextBtn.textContent = isLast ? '📊 View Results →' : 'Next Challenge →';
    }
  }

  _bindNext({ isLast }) {
    const btn = document.getElementById('btn-next-challenge');
    if (!btn) return;
    btn.onclick = null;
    btn.onclick = () => {
      this.engine.audio.playClick();
      if (isLast) {
        this.hide();
        const summary = this.engine.session.getSummary();
        this.engine.profiles.saveSession(this.engine.currentPlayer.id, summary);
        this.engine.navigate('analytics', { summary });
      } else {
        this.hide();
        this.engine.screens.game.continueGame();
      }
    };
  }

  _setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  _successMsg() {
    const msgs = ['Excellent!','Correct!','Well done!','Nailed it!','Brilliant!','Perfect!','Outstanding!'];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  _failMsg() {
    const msgs = ['Not quite!','Keep trying!','Almost!','Close one!','Not this time!'];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }
  _catLabel(cat) {
    return {logical:'Logical Reasoning',pattern:'Pattern Recognition',memory:'Memory',visual:'Visual Observation',reaction:'Reaction Time',audio:'Audio Challenge'}[cat]||cat;
  }
}
