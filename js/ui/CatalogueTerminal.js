/* ═══════════════════════════════════════════════════════════════
   CatalogueTerminal.js — Game catalogue grid overlay (Tab key)
   Shows all 30 games as cards with animated thumbnails, skill
   tags, star progress, lock icons, and filtering.
   ═══════════════════════════════════════════════════════════════ */

import { EventBus } from '../core/EventBus.js';
import { SFXLib }   from '../audio/SFXLib.js';

export class CatalogueTerminal {
  /**
   * @param {Object} opts
   * @param {Object} opts.gamesData - parsed games.json
   * @param {Function} opts.getProgress - (gameId) => { stars, cleared, unlocked }
   */
  constructor(opts = {}) {
    this._games       = opts.gamesData?.games || [];
    this._wings       = opts.gamesData?.wings || {};
    this._skillLabels = opts.gamesData?.skillLabels || {};
    this._getProgress = opts.getProgress || (() => ({ stars: 0, cleared: 0, unlocked: false }));
    this._container   = null;
    this._visible     = false;
    this._built       = false;
    this._filter      = 'all';
  }

  build() {
    if (this._built) return;
    this._built = true;

    const el = document.createElement('div');
    el.id = 'catalogue-terminal';
    el.className = 'catalogue-overlay';
    el.innerHTML = `
      <div class="catalogue-header">
        <button class="btn-back cat-back-btn" id="cat-back">← Back to Hub</button>
        <h2 class="catalogue-title">🧠 Game Catalogue</h2>
        <div class="catalogue-filters" id="cat-filters">
          <button class="cat-filter active" data-filter="all">All Games</button>
          ${Object.entries(this._wings).map(([key, wing]) =>
            `<button class="cat-filter" data-filter="${key}">${wing.icon} ${wing.label}</button>`
          ).join('')}
        </div>
        <button class="catalogue-close" id="cat-close" title="Close (Tab)">✕</button>
      </div>
      <div class="catalogue-grid" id="cat-grid"></div>
      <div class="catalogue-footer">
        <span id="cat-count">0 / ${this._games.length} Games Available</span>
        <span class="catalogue-hint">Press Tab to close</span>
      </div>
    `;
    document.body.appendChild(el);
    this._container = el;
    this._renderGrid();
    this._bindEvents();
  }

  _renderGrid() {
    const grid = document.getElementById('cat-grid');
    if (!grid) return;

    const filtered = this._filter === 'all'
      ? this._games
      : this._games.filter(g => g.wing === this._filter);

    grid.innerHTML = filtered.map(game => {
      const progress = this._getProgress(game.id);
      const status = game.status || (game.built ? 'playable' : 'card-only');
      const isCardOnly = status === 'card-only';
      const isPartial = status === 'partial';
      const starsHtml = this._renderStars(progress.stars);
      const tagsHtml = game.tags.slice(0, 3).map(t =>
        `<span class="cat-tag">${t}</span>`
      ).join('');
      const wingInfo = this._wings[game.wing] || {};

      let statusBadge = '';
      if (isCardOnly) {
        statusBadge = '<span class="cat-lock-badge">🔒 Coming soon</span>';
      } else if (isPartial) {
        statusBadge = '<span class="cat-beta-badge">⚠️ Beta</span>';
      } else {
        statusBadge = '<span class="cat-playable-badge">▶ Playable (1-30)</span>';
      }

      return `
        <div class="cat-card ${isCardOnly ? 'cat-locked' : 'cat-playable'}" data-game="${game.id}" data-status="${status}">
          <div class="cat-card-thumb" style="background:linear-gradient(135deg, ${game.palette.primary}40, ${game.palette.secondary}80)">
            <span class="cat-card-icon">${game.icon}</span>
            ${statusBadge}
            ${game.video ? '<span class="cat-video-badge">📹 Video</span>' : ''}
            <span class="cat-type-badge">${game.type}</span>
          </div>
          <div class="cat-card-body">
            <h3 class="cat-card-name">${game.name}</h3>
            <span class="cat-card-skill" style="color:${wingInfo.color || '#fff'}">${wingInfo.icon || ''} ${this._skillLabels[game.skill] || game.skill}</span>
            <p class="cat-card-desc">${game.description}</p>
            <div class="cat-card-tags">${tagsHtml}</div>
            <div class="cat-card-footer">
              <div class="cat-stars">${starsHtml}</div>
              <span class="cat-card-progress">${progress.cleared}/30</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Update count
    const available = this._games.filter(g => (g.status === 'playable' || g.built)).length;
    const countEl = document.getElementById('cat-count');
    if (countEl) countEl.textContent = `${available} / ${this._games.length} Games Playable`;
  }

  _renderStars(count) {
    let html = '';
    for (let i = 0; i < 3; i++) {
      html += `<span class="cat-star ${i < count ? 'cat-star-filled' : ''}">★</span>`;
    }
    return html;
  }

  _bindEvents() {
    // Back and Close buttons
    document.getElementById('cat-back')?.addEventListener('click', () => {
      SFXLib.click?.() || SFXLib.playClick?.();
      EventBus.emit('catalogue:back');
    });
    document.getElementById('cat-close')?.addEventListener('click', () => {
      SFXLib.click?.() || SFXLib.playClick?.();
      EventBus.emit('catalogue:back');
    });

    // Filter buttons
    const filters = this._container.querySelectorAll('.cat-filter');
    filters.forEach(btn => {
      btn.addEventListener('click', () => {
        filters.forEach(f => f.classList.remove('active'));
        btn.classList.add('active');
        this._filter = btn.dataset.filter;
        SFXLib.click?.() || SFXLib.playClick?.();
        this._renderGrid();
        this._bindCardClicks();
      });
    });

    // Card clicks
    this._bindCardClicks();

    // Tab key toggle
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.toggle();
      }
    });

    // EventBus toggle
    EventBus.on('catalogue:toggle', () => this.toggle());
  }

  _bindCardClicks() {
    const cards = this._container?.querySelectorAll('.cat-card');
    cards?.forEach(card => {
      card.addEventListener('click', () => {
        const gameId = card.dataset.game;
        const status = card.dataset.status;
        if (status === 'card-only') {
          SFXLib.incorrect?.() || SFXLib.playError?.();
          return;
        }
        SFXLib.click?.() || SFXLib.playClick?.();
        this.hide();
        EventBus.emit('catalogue:select', { gameId });
      });
    });
  }

  show() {
    if (!this._built) this.build();
    this._renderGrid();
    this._bindCardClicks();
    this._container.classList.add('visible');
    this._visible = true;
    SFXLib.whoosh();
  }

  hide() {
    this._container?.classList.remove('visible');
    this._visible = false;
  }

  toggle() {
    if (this._visible) this.hide();
    else this.show();
  }

  get isVisible() { return this._visible; }

  updateProgress() {
    if (this._visible) this._renderGrid();
  }

  dispose() {
    if (this._container?.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._built = false;
  }
}
