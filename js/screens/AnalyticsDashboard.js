/* ═══════════════════════════════════════════════
   MindShift — AnalyticsDashboard Screen
   Post-session performance report with Chart.js
   ═══════════════════════════════════════════════ */
import { ACHIEVEMENTS, getAchievement, evaluateAchievements } from '../data/achievements.js';

const CAT_LABELS = ['Logical','Pattern','Memory','Visual','Reaction','Audio'];
const CAT_KEYS   = ['logical','pattern','memory','visual','reaction','audio'];
const CAT_COLORS = ['#7c3aed','#06b6d4','#10b981','#f59e0b','#ef4444','#a855f7'];

const IQ_KEYS   = ['iq-number','iq-pattern','iq-matrix','iq-odd','iq-spatial','iq-logic','iq-memory'];
const IQ_LABELS = ['Number Seq','Visual Pat','Matrix','Odd-One-Out','Spatial','Logic','Memory+R'];
const IQ_COLORS = ['#eab308','#f97316','#fb923c','#fbbf24','#a3e635','#34d399','#22d3ee'];


export class AnalyticsDashboard {
  constructor(engine) {
    this.engine  = engine;
    this.el      = document.getElementById('analytics-dashboard');
    this._charts = [];
  }

  show({ summary } = {}) {
    this.el.classList.add('active');
    this._destroyCharts();

    const profile = this.engine.currentPlayer;
    const catScores = summary.categoryScores || {};

    // Header
    this._setText('analytics-player-name', `${profile?.name || 'Player'} · Session Report`);
    this._setText('analytics-total-score',  summary.totalScore);
    this._setText('an-accuracy',  summary.overallAccuracy + '%');
    this._setText('an-avg-time',  summary.avgResponseTime + 's');
    this._setText('an-streak',    summary.bestStreak);
    this._setText('an-challenges',summary.challengesCompleted);

    // Evaluate and unlock achievements
    const newlyUnlocked = evaluateAchievements(summary, profile, this.engine.sessionMeta || {});
    newlyUnlocked.forEach(id => {
      this.engine.profiles.unlockAchievement(profile.id, id);
    });
    // Refresh currentPlayer
    this.engine.currentPlayer = this.engine.profiles.getProfile(profile.id);

    // Show achievements section
    this._renderAchievementChips(newlyUnlocked);

    // Show achievement popups for newly unlocked
    newlyUnlocked.forEach((id, i) => {
      setTimeout(() => this.engine.showAchievement(id), 1000 + i * 1200);
    });

    // Strengths / Weaknesses
    const catArr = CAT_KEYS.map(k => ({ key: k, score: catScores[k] || 0 }));
    const sorted = [...catArr].sort((a,b) => b.score - a.score);
    const strongest = sorted[0];
    const weakest   = sorted[sorted.length - 1];
    this._setText('an-strength', `${this._catName(strongest.key)} (${strongest.score}%)`);
    this._setText('an-weakness', `${this._catName(weakest.key)} (${weakest.score}%)`);
    this._setText('an-adaptive', this._adaptiveSummary(summary));

    // Charts — wait a frame for DOM to paint
    requestAnimationFrame(() => {
      this._buildRadar(catScores);
      this._buildBar(catScores);
      this._buildLine(summary.difficultyHistory || []);
    });

    // IQ Analytics
    const mode = this.engine.currentMode || 'classic';
    const iqSection = document.getElementById('iq-analytics-section');
    if (iqSection && (mode === 'iq' || mode === 'mixed')) {
      iqSection.style.display = '';
      const iqScore = this.engine.adaptive.iqCompositeScore();
      const iqPerf  = this.engine.adaptive.categoryPerformance();
      this._setText('iq-score-val', iqScore !== null ? iqScore : '—');
      this._renderIQCats(iqPerf);
      requestAnimationFrame(() => this._buildIQBar(iqPerf));
    } else if (iqSection) {
      iqSection.style.display = 'none';
    }

    // Actions
    const playAgain = document.getElementById('btn-play-again');
    const backMenu  = document.getElementById('btn-back-menu');
    const anBack    = document.getElementById('analytics-back');
    if (playAgain) playAgain.onclick = () => { this.hide(); this.engine.navigate('game-mode-select'); };
    if (backMenu)  backMenu.onclick  = () => { this.hide(); this.engine.navigate('main-menu'); };
    if (anBack)    anBack.onclick    = () => { this.hide(); this.engine.navigate('main-menu'); };
  }

  hide() {
    this._destroyCharts();
    this.el.classList.remove('active');
    this.el.classList.add('exiting');
    setTimeout(() => this.el.classList.remove('exiting'), 400);
  }

  // ── Charts ─────────────────────────────────────
  _buildRadar(catScores) {
    const canvas = document.getElementById('radar-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: CAT_LABELS,
        datasets: [{
          label: 'Performance',
          data:  CAT_KEYS.map(k => catScores[k] || 0),
          fill:  true,
          backgroundColor: 'rgba(124,58,237,0.15)',
          borderColor:     '#7c3aed',
          borderWidth:     2,
          pointBackgroundColor: CAT_COLORS,
          pointBorderColor:     '#fff',
          pointRadius:     5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0, max: 100,
            ticks: { stepSize: 25, color: '#475569', font:{size:10} },
            grid:  { color: 'rgba(255,255,255,0.06)' },
            angleLines: { color: 'rgba(255,255,255,0.06)' },
            pointLabels: { color: '#94a3b8', font:{size:11, family:'Outfit'} }
          }
        },
        plugins: { legend: { display: false } }
      }
    });
    this._charts.push(chart);
  }

  _buildBar(catScores) {
    const canvas = document.getElementById('bar-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: CAT_LABELS,
        datasets: [{
          label: 'Score %',
          data:  CAT_KEYS.map(k => catScores[k] || 0),
          backgroundColor: CAT_COLORS.map(c => c + 'bb'),
          borderColor:     CAT_COLORS,
          borderWidth:     1,
          borderRadius:    6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0, max: 100,
            ticks: { color:'#475569', stepSize:25 },
            grid:  { color:'rgba(255,255,255,0.05)' },
            border:{ color:'rgba(255,255,255,0.1)' }
          },
          x: {
            ticks: { color:'#94a3b8', font:{family:'Outfit'} },
            grid:  { display:false },
            border:{ color:'rgba(255,255,255,0.1)' }
          }
        },
        plugins: { legend:{ display:false } }
      }
    });
    this._charts.push(chart);
  }

  _buildLine(diffHistory) {
    const canvas = document.getElementById('line-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    const labels = diffHistory.map((_, i) => `C${i+1}`);
    const diffLabels = ['','Beginner','Easy','Medium','Hard','Expert'];
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Difficulty',
          data:  diffHistory,
          borderColor:  '#06b6d4',
          backgroundColor: 'rgba(6,182,212,0.08)',
          borderWidth:  2,
          fill:         true,
          tension:      0.4,
          pointBackgroundColor: '#06b6d4',
          pointRadius:  4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 1, max: 5,
            ticks: { color:'#475569', stepSize:1,
              callback: v => diffLabels[v] || v },
            grid: { color:'rgba(255,255,255,0.05)' },
            border:{ color:'rgba(255,255,255,0.1)' }
          },
          x: {
            ticks: { color:'#94a3b8', font:{family:'Outfit'} },
            grid:  { display:false },
            border:{ color:'rgba(255,255,255,0.1)' }
          }
        },
        plugins: { legend:{ display:false } }
      }
    });
    this._charts.push(chart);
  }

  // ── IQ Analytics Helpers ─────────────────────
  _renderIQCats(perf) {
    const grid = document.getElementById('iq-cats-grid');
    if (!grid) return;
    grid.innerHTML = '';
    IQ_KEYS.forEach((k, i) => {
      const score = perf[k];
      if (score === null || score === undefined) return;
      const item = document.createElement('div');
      item.className = 'iq-cat-item';
      item.innerHTML = `
        <div class="iq-cat-name">${IQ_LABELS[i]}</div>
        <div class="iq-cat-bar-wrap">
          <div class="iq-cat-bar" style="width:0%;background:${IQ_COLORS[i]}"></div>
        </div>
        <div class="iq-cat-score">${score}%</div>
      `;
      grid.appendChild(item);
      // Animate bar
      setTimeout(() => {
        const bar = item.querySelector('.iq-cat-bar');
        if (bar) bar.style.width = `${score}%`;
      }, 100 + i * 80);
    });
  }

  _buildIQBar(perf) {
    const canvas = document.getElementById('iq-bar-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    const playedKeys   = IQ_KEYS.filter(k => perf[k] !== null && perf[k] !== undefined);
    const playedLabels = playedKeys.map(k => IQ_LABELS[IQ_KEYS.indexOf(k)]);
    const playedColors = playedKeys.map(k => IQ_COLORS[IQ_KEYS.indexOf(k)]);
    const playedData   = playedKeys.map(k => perf[k]);
    if (!playedKeys.length) return;
    const chart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: playedLabels,
        datasets: [{ label:'IQ Score %', data:playedData,
          backgroundColor: playedColors.map(c => c + 'bb'),
          borderColor: playedColors, borderWidth:1, borderRadius:6 }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        scales: {
          y: { min:0, max:100, ticks:{color:'#475569',stepSize:25}, grid:{color:'rgba(255,255,255,0.05)'}, border:{color:'rgba(245,158,11,0.2)'} },
          x: { ticks:{color:'#94a3b8',font:{family:'Outfit',size:10}}, grid:{display:false}, border:{color:'rgba(245,158,11,0.2)'} }
        },
        plugins:{ legend:{display:false} }
      }
    });
    this._charts.push(chart);
  }

  // ── Achievement chips ─────────────────────────
  _renderAchievementChips(ids) {
    const section = document.getElementById('analytics-achievements-section');
    const chips   = document.getElementById('analytics-achievement-chips');
    if (!section || !chips) return;
    chips.innerHTML = '';
    if (!ids || ids.length === 0) {
      chips.innerHTML = '<p class="no-achievements-msg">No new achievements this session.</p>';
      return;
    }
    ids.forEach((id, i) => {
      const ach = getAchievement(id);
      if (!ach) return;
      const chip = document.createElement('div');
      chip.className = 'achievement-chip';
      chip.style.animationDelay = `${i*0.12}s`;
      chip.innerHTML = `<span>${ach.icon}</span><span>${ach.name}</span>`;
      chips.appendChild(chip);
    });
  }

  // ── Helpers ───────────────────────────────────
  _setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

  _catName(key) {
    const names = {
      logical:'Logical', pattern:'Pattern', memory:'Memory', visual:'Visual', reaction:'Reaction', audio:'Audio',
      'iq-number':'Number Seq', 'iq-pattern':'Visual Pat', 'iq-matrix':'Matrix',
      'iq-odd':'Odd-One-Out', 'iq-spatial':'Spatial', 'iq-logic':'Logic', 'iq-memory':'Memory+R'
    };
    return names[key] || key;
  }

  _adaptiveSummary(summary) {
    const acc = summary.overallAccuracy;
    const avg = summary.avgResponseTime;
    if (acc >= 80) return `Excellent session! Difficulty reached ${summary.difficultyHistory?.at(-1) || 3}/5.`;
    if (acc >= 60) return `Good performance. Average response: ${avg}s. Keep practicing!`;
    return `Challenging session. Focus on accuracy and you'll improve fast!`;
  }

  _destroyCharts() {
    this._charts.forEach(c => { try { c.destroy(); } catch(e){} });
    this._charts = [];
  }
}
