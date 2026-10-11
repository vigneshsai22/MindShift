/* ═══════════════════════════════════════════════
   MindShift — AchievementsScreen
   ═══════════════════════════════════════════════ */
import { ACHIEVEMENTS } from '../data/achievements.js';

export class AchievementsScreen {
  constructor(engine) {
    this.engine = engine;
    this.el     = document.getElementById('achievements-screen');
  }

  show() {
    this.el.classList.add('active');
    this._render();
    const back = document.getElementById('ach-back');
    if (back) back.onclick = () => this.engine.navigate('main-menu');
  }

  hide() {
    this.el.classList.remove('active');
    this.el.classList.add('exiting');
    setTimeout(() => this.el.classList.remove('exiting'), 400);
  }

  _render() {
    const profile = this.engine.currentPlayer;
    const unlocked = new Set((profile?.achievements || []).map(a => a.id));
    const count  = document.getElementById('ach-count');
    const grid   = document.getElementById('achievements-grid');
    if (!grid) return;

    const unlockedCount = ACHIEVEMENTS.filter(a => unlocked.has(a.id)).length;
    if (count) count.textContent = `${unlockedCount} / ${ACHIEVEMENTS.length} Unlocked`;

    grid.innerHTML = '';
    ACHIEVEMENTS.forEach((ach, i) => {
      const isUnlocked = unlocked.has(ach.id);
      const card = document.createElement('div');
      card.className = `ach-card ${isUnlocked ? 'unlocked' : 'locked'}`;
      card.style.animationDelay = `${i * 0.05}s`;

      const dateEntry = profile?.achievements?.find(a => a.id === ach.id);
      const dateStr   = dateEntry ? new Date(dateEntry.date).toLocaleDateString() : '';

      card.innerHTML = `
        ${isUnlocked ? '<span class="ach-unlocked-banner">✓ Unlocked</span>' : ''}
        <div class="ach-card-icon">${isUnlocked ? ach.icon : '🔒'}</div>
        <div class="ach-card-name">${ach.name}</div>
        <div class="ach-card-desc">${ach.desc}</div>
        ${dateStr ? `<div class="ach-card-date">${dateStr}</div>` : ''}
      `;
      grid.appendChild(card);
    });
  }
}

/* ═══════════════════════════════════════════════
   MindShift — HistoryScreen
   ═══════════════════════════════════════════════ */
export class HistoryScreen {
  constructor(engine) {
    this.engine = engine;
    this.el     = document.getElementById('history-screen');
  }

  show() {
    this.el.classList.add('active');
    this._render();
    const back = document.getElementById('hist-back');
    if (back) back.onclick = () => this.engine.navigate('main-menu');
  }

  hide() {
    this.el.classList.remove('active');
    this.el.classList.add('exiting');
    setTimeout(() => this.el.classList.remove('exiting'), 400);
  }

  _render() {
    const profile  = this.engine.currentPlayer;
    const sessions = this.engine.profiles.getRecentSessions(profile?.id, 10);
    const list     = document.getElementById('history-list');
    if (!list) return;
    list.innerHTML = '';

    if (!sessions.length) {
      list.innerHTML = '<div class="no-history-msg">No sessions yet. Play your first game!</div>';
      return;
    }

    sessions.forEach((s, i) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.style.animationDelay = `${i * 0.05}s`;
      const date = new Date(s.date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
      item.innerHTML = `
        <div class="history-date">${date}</div>
        <div class="history-stats">
          <div class="history-stat">
            <span>Accuracy</span><span>${s.overallAccuracy}%</span>
          </div>
          <div class="history-stat">
            <span>Avg Time</span><span>${s.avgResponseTime}s</span>
          </div>
          <div class="history-stat">
            <span>Challenges</span><span>${s.challengesCompleted}</span>
          </div>
        </div>
        <div class="history-score">${s.totalScore}</div>
      `;
      list.appendChild(item);
    });
  }
}
