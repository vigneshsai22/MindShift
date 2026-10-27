/* ═══════════════════════════════════════════════════════════════
   LevelMap.js — Standard Level Selection Screen (Levels 1 to 30)
   Clean, unified 30-level grid with star ratings, difficulty tiers,
   and direct level launching for all cognitive challenges.
   ═══════════════════════════════════════════════════════════════ */

import { EventBus } from '../core/EventBus.js';
import { SFXLib }   from '../audio/SFXLib.js';

export class LevelMap {
  /**
   * @param {Object} opts
   * @param {string} opts.gameId
   * @param {string} opts.gameName
   * @param {Function} opts.getStars - (level) => 0|1|2|3
   * @param {Function} opts.isUnlocked - (level) => boolean
   */
  constructor(opts = {}) {
    this._gameId     = opts.gameId || 'lumen-pond';
    this._gameName   = opts.gameName || 'Cognitive Challenge';
    this._getStars   = opts.getStars || (() => 0);
    this._isUnlocked = opts.isUnlocked || (() => true);
    this._container  = null;
    this._built      = false;
    this._visible    = false;
  }

  rebuild() {
    const existing = document.getElementById('level-map');
    if (existing) existing.remove();
    this._built = false;
    this._container = null;
    this.build();
  }

  build() {
    if (this._built && this._container && document.body.contains(this._container)) return;
    const existing = document.getElementById('level-map');
    if (existing) existing.remove();
    this._built = true;

    // Clean up any stale duplicate level-map elements
    const stale = document.querySelectorAll('#level-map');
    stale.forEach(el => el.remove());

    const el = document.createElement('div');
    el.id = 'level-map';
    el.className = 'level-map-overlay';

    let nodesHtml = '';
    for (let level = 1; level <= 30; level++) {
      const stars = this._getStars(level, this._gameId);
      const unlocked = this._isUnlocked(level, this._gameId);
      const starsHtml = [0, 1, 2].map(i =>
        `<span class="lm-star ${i < stars ? 'lm-star-filled' : ''}">★</span>`
      ).join('');

      let tierColor = '#10b981';
      if (level > 25) {
        tierColor = '#ef4444'; // Peak
      } else if (level > 15) {
        tierColor = '#a855f7'; // Advanced
      } else if (level > 5) {
        tierColor = '#00f2fe'; // Intermediate
      }

      nodesHtml += `
        <button class="lm-node ${unlocked ? '' : 'lm-locked'} ${stars > 0 ? 'lm-cleared' : ''}"
                data-level="${level}" ${unlocked ? '' : 'disabled'}
                title="${unlocked ? `Level ${level} · Difficulty Elo ${600 + 30 * (level - 1)}` : `Level ${level} · 🔒 Complete Level ${level - 1} to Unlock`}">
          <span class="lm-node-tier" style="color:${unlocked ? tierColor : '#64748b'};font-size:0.65rem;font-weight:700;">
            ${unlocked ? `D-${600 + 30 * (level - 1)}` : '🔒 LOCKED'}
          </span>
          <span class="lm-node-num">${level}</span>
          <div class="lm-node-stars">${starsHtml}</div>
        </button>
      `;
    }

    el.innerHTML = `
      <div class="level-map-container">
        <div class="lm-header">
          <button class="lm-back" id="lm-back">← Back to Catalogue</button>
          <div class="lm-header-center">
            <h2 class="lm-title" id="lm-game-title">${this._gameName}</h2>
            <span class="lm-subtitle">Select Challenge Level (1 – 30) of Increasing Difficulty</span>
          </div>
          <div class="lm-stats" id="lm-stats">0 / 30 Cleared</div>
        </div>

        <div class="lm-difficulty-guide">
          <span class="lm-guide-pill" style="color:#10b981;border-color:rgba(16,185,129,0.3)">🟢 Calibration (Lv 1–5)</span>
          <span class="lm-guide-pill" style="color:#00f2fe;border-color:rgba(0,242,254,0.3)">🔵 Intermediate (Lv 6–15)</span>
          <span class="lm-guide-pill" style="color:#a855f7;border-color:rgba(168,85,247,0.3)">🟣 Advanced (Lv 16–25)</span>
          <span class="lm-guide-pill" style="color:#ef4444;border-color:rgba(239,68,68,0.3)">🔴 Neural Peak (Lv 26–30)</span>
        </div>

        <div class="lm-practice-banner" style="display:flex;justify-content:center;margin:10px 0 14px 0;">
          <button class="lm-btn-practice" id="lm-practice" style="background:rgba(16,185,129,0.15);border:1px solid #10b981;color:#10b981;padding:8px 22px;border-radius:12px;font-weight:700;font-size:0.9rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all 0.2s;">
            <span>🛡️</span>
            <span>Launch Level 0 — Interactive Practice Calibration</span>
          </button>
        </div>

        <div class="lm-grid" id="lm-grid">
          ${nodesHtml}
        </div>
      </div>
    `;

    document.body.appendChild(el);
    this._container = el;
    this._bindEvents();
    this._refresh();
  }

  _bindEvents() {
    // Back button
    this._container.querySelector('#lm-back')?.addEventListener('click', () => {
      try { SFXLib.click?.() || SFXLib.playClick?.(); } catch (e) {}
      this.hide();
      EventBus.emit('levelmap:back');
    });

    // Level 0 Practice button
    this._container.querySelector('#lm-practice')?.addEventListener('click', () => {
      try { SFXLib.levelStart?.() || SFXLib.click?.(); } catch (e) {}
      this.hide();
      EventBus.emit('levelmap:select', { gameId: this._gameId, level: 0 });
    });

    // Level nodes
    const nodes = this._container.querySelectorAll('.lm-node');
    nodes.forEach(node => {
      node.addEventListener('click', () => {
        const level = parseInt(node.dataset.level, 10);
        const unlocked = this._isUnlocked(level, this._gameId);
        if (!unlocked) {
          try { SFXLib.incorrect?.() || SFXLib.playError?.(); } catch (e) {}
          this._flashLockedNotice(level);
          return;
        }
        try { SFXLib.levelStart?.() || SFXLib.click?.(); } catch (e) {}
        this.hide();
        EventBus.emit('levelmap:select', { gameId: this._gameId, level });
      });
    });
  }

  _flashLockedNotice(level) {
    let notice = document.getElementById('lm-lock-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'lm-lock-notice';
      notice.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(220, 38, 38, 0.95);
        color: #fff;
        padding: 12px 24px;
        border-radius: 12px;
        font-family: var(--font-display, 'Outfit', sans-serif);
        font-size: 0.95rem;
        font-weight: 700;
        z-index: 9999;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
        border: 1px solid #f87171;
        transition: opacity 0.3s ease;
        text-align: center;
        pointer-events: none;
      `;
      document.body.appendChild(notice);
    }
    notice.textContent = `🔒 Level ${level} is locked! Complete Level ${level - 1} first to unlock.`;
    notice.style.opacity = '1';
    clearTimeout(this._noticeTimer);
    this._noticeTimer = setTimeout(() => {
      if (notice) notice.style.opacity = '0';
    }, 2800);
  }

  setGame(gameId, gameName) {
    this._gameId = gameId;
    this._gameName = gameName;
    if (!this._built) this.build();
    const titleEl = this._container?.querySelector('#lm-game-title') || this._container?.querySelector('.lm-title');
    if (titleEl) titleEl.textContent = gameName;
    this._refresh();
  }

  show() {
    if (!this._built) this.build();
    this._refresh();
    this._container?.classList.add('visible');
    this._visible = true;
    try { SFXLib.whoosh?.(); } catch (e) {}
  }

  hide() {
    this._container?.classList.remove('visible');
    this._visible = false;
  }

  toggle() {
    if (this._visible) this.hide();
    else this.show();
  }

  _refresh() {
    const titleEl = this._container?.querySelector('#lm-game-title') || this._container?.querySelector('.lm-title');
    if (titleEl && this._gameName) titleEl.textContent = this._gameName;

    let clearedCount = 0;
    let totalStars = 0;

    // Update stars and lock states
    const nodes = this._container?.querySelectorAll('.lm-node');
    nodes?.forEach(node => {
      const level = parseInt(node.dataset.level, 10);
      const stars = this._getStars(level, this._gameId);
      const unlocked = this._isUnlocked(level, this._gameId);

      if (stars > 0) clearedCount++;
      totalStars += stars;

      let tierColor = '#10b981';
      if (level > 25) tierColor = '#ef4444';
      else if (level > 15) tierColor = '#a855f7';
      else if (level > 5) tierColor = '#00f2fe';

      node.disabled = !unlocked;
      node.classList.toggle('lm-locked', !unlocked);
      node.classList.toggle('lm-cleared', stars > 0);
      node.title = unlocked
        ? `Level ${level} · Difficulty Elo ${600 + 30 * (level - 1)}`
        : `Level ${level} · 🔒 Complete Level ${level - 1} to Unlock`;

      const tierEl = node.querySelector('.lm-node-tier');
      if (tierEl) {
        tierEl.textContent = unlocked ? `D-${600 + 30 * (level - 1)}` : '🔒 LOCKED';
        tierEl.style.color = unlocked ? tierColor : '#64748b';
      }

      const starEls = node.querySelectorAll('.lm-star');
      starEls.forEach((s, i) => {
        s.classList.toggle('lm-star-filled', i < stars);
      });
    });

    const statsEl = this._container?.querySelector('#lm-stats');
    if (statsEl) {
      statsEl.textContent = `${clearedCount} / 30 Cleared · ★ ${totalStars}`;
    }
  }

  get isVisible() { return this._visible; }

  dispose() {
    if (this._container?.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._built = false;
  }
}
