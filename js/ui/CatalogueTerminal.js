/* ═══════════════════════════════════════════════════════════════
   CatalogueTerminal.js — Game Catalogue & Mind Lab Domain Selector
   Shows all 30 games across 6 cognitive wings.
   Active 3D games are fully unlocked with 30 progressive levels.
   Unimplemented games are strictly locked with visual indicators.
   ═══════════════════════════════════════════════════════════════ */

import { EventBus } from '../core/EventBus.js';
import { SFXLib }   from '../audio/SFXLib.js';

// The 6 active, fully implemented 3D cognitive games
export const PLAYABLE_GAMES = new Set([
  'lumen-pond',      // Memory Vault
  'terminal-hack',   // Logic Terminal
  'anomaly-rooms',   // Observation Deck
  'hologram-matrix', // Pattern Gallery
  'reflex-arena',    // Reaction Arena
  'rotation-core'    // Spatial Workshop
]);

const DEFAULT_WINGS = {
  memory:      { label: 'Memory Vault',      icon: '🧠', color: '#00bcd4', order: 0 },
  logic:       { label: 'Logic Terminal',    icon: '💻', color: '#00e676', order: 1 },
  observation: { label: 'Observation Deck',  icon: '🔍', color: '#ff5722', order: 2 },
  pattern:     { label: 'Pattern Gallery',   icon: '🔷', color: '#2196f3', order: 3 },
  reaction:    { label: 'Reaction Arena',    icon: '🎯', color: '#f44336', order: 4 },
  spatial:     { label: 'Spatial Workshop',  icon: '🔄', color: '#00acc1', order: 5 }
};

const DEFAULT_SKILL_LABELS = {
  memory:      'Working Memory',
  logic:       'Logical Deduction',
  observation: 'Visual Observation',
  pattern:     'Pattern Induction',
  reaction:    'Psychomotor Speed',
  spatial:     'Spatial Rotation'
};

export class CatalogueTerminal {
  /**
   * @param {Object} opts
   * @param {Object} opts.gamesData - parsed games.json
   * @param {Function} opts.getProgress - (gameId) => { stars, cleared, unlocked }
   */
  constructor(opts = {}) {
    this._games       = opts.gamesData?.games || [];
    this._wings       = opts.gamesData?.wings || DEFAULT_WINGS;
    this._skillLabels = opts.gamesData?.skillLabels || DEFAULT_SKILL_LABELS;
    this._getProgress = opts.getProgress || (() => ({ stars: 0, cleared: 0, unlocked: true }));
    this._container   = null;
    this._visible     = false;
    this._built       = false;
    this._filter      = 'all';
    this._title       = '🧠 Cognitive Game Catalogue';
    this._subtitle    = 'Choose an active research challenge to play across 30 progressive difficulty levels.';
  }

  setGamesData(data) {
    if (!data) return;
    if (Array.isArray(data.games) && data.games.length > 0) {
      this._games = data.games;
    }
    if (data.wings && Object.keys(data.wings).length > 0) {
      this._wings = data.wings;
    }
    if (data.skillLabels) {
      this._skillLabels = data.skillLabels;
    }
    if (this._built) {
      this._updateFilters();
      this._renderGrid();
      this._bindCardClicks();
    }
  }

  async ensureData() {
    if (!this._games || this._games.length === 0) {
      if (window.__app__?.gamesData?.games?.length) {
        this.setGamesData(window.__app__.gamesData);
        return;
      }
      try {
        const res = await fetch('js/data/games.json');
        if (res.ok) {
          const data = await res.json();
          this.setGamesData(data);
          return;
        }
      } catch (e) {
        console.warn('[CatalogueTerminal] fetch games.json fallback:', e);
      }
      this._useFallbackRegistry();
    }
  }

  _useFallbackRegistry() {
    const wings = ['memory', 'logic', 'observation', 'pattern', 'reaction', 'spatial'];
    const wingCoreNames = {
      memory: 'lumen-pond',
      logic: 'terminal-hack',
      observation: 'anomaly-rooms',
      pattern: 'hologram-matrix',
      reaction: 'reflex-arena',
      spatial: 'rotation-core'
    };
    const wingNames = {
      memory: ['Lumen Pond', 'Witness Room', 'Echo Shelves', 'Tone Tower', 'Twin Crystals'],
      logic: ['Terminal Hack', 'Gate Circuit', 'Evidence Board', 'Balance Lab', 'Number Forge'],
      observation: ['Anomaly Rooms', 'Surveillance Wall', 'Hidden Archive', 'Swarm Count', 'Flicker Lab'],
      pattern: ['Hologram Matrix', 'Pattern Wall', 'Cipher Dials', 'Factory Sorter', 'Tile Cascade'],
      reaction: ['Reflex Arena', 'Laser Corridor', 'Lane Shift', 'Signal Console', 'Reactor Control'],
      spatial: ['Rotation Core', 'Net Folder', 'Mind Map Maze', 'Frost Route', 'Drop Lab']
    };
    const games = [];
    wings.forEach(w => {
      const names = wingNames[w] || [];
      names.forEach((name, idx) => {
        const id = idx === 0 ? wingCoreNames[w] : `${w}-module-${idx + 1}`;
        const isCore = (idx === 0);
        games.push({
          id,
          name,
          skill: w,
          wing: w,
          icon: DEFAULT_WINGS[w]?.icon || '🧠',
          description: isCore
            ? `Active 3D simulation for the ${DEFAULT_WINGS[w]?.label}.`
            : `Facility module in development for ${DEFAULT_WINGS[w]?.label}.`,
          tags: [w, isCore ? 'playable' : 'locked'],
          built: isCore,
          status: isCore ? 'playable' : 'card-only',
          palette: { primary: DEFAULT_WINGS[w]?.color || '#00f2fe', secondary: '#0a192f' }
        });
      });
    });
    this.setGamesData({ games, wings: DEFAULT_WINGS, skillLabels: DEFAULT_SKILL_LABELS });
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
        <div class="cat-header-titles">
          <h2 class="catalogue-title" id="cat-title-text">${this._title}</h2>
          <p class="cat-subtitle" id="cat-subtitle-text">${this._subtitle}</p>
        </div>
        <div class="catalogue-filters" id="cat-filters"></div>
        <button class="catalogue-close" id="cat-close" title="Close (Tab)">✕</button>
      </div>
      <div class="catalogue-grid" id="cat-grid"></div>
      <div class="catalogue-footer">
        <span id="cat-count">Loading Games...</span>
        <span class="catalogue-hint">Click an active game to select Levels 1–30 · Press Tab to close</span>
      </div>
    `;
    document.body.appendChild(el);
    this._container = el;

    this._updateFilters();
    this._renderGrid();
    this._bindEvents();
  }

  _updateFilters() {
    const container = document.getElementById('cat-filters');
    if (!container) return;

    const wingEntries = Object.entries(this._wings || DEFAULT_WINGS);
    const playableCount = this._games.filter(g => PLAYABLE_GAMES.has(g.id) || g.status === 'playable').length;

    container.innerHTML = `
      <button class="cat-filter ${this._filter === 'playable' ? 'active' : ''}" data-filter="playable" style="border: 1px solid #00f2fe; color: #00f2fe;">
        ✨ Playable Only (${playableCount})
      </button>
      <button class="cat-filter ${this._filter === 'all' ? 'active' : ''}" data-filter="all">
        All Games (${this._games.length})
      </button>
      ${wingEntries.map(([key, wing]) => {
        const wingGames = this._games.filter(g => g.wing === key);
        const wingPlayable = wingGames.filter(g => PLAYABLE_GAMES.has(g.id) || g.status === 'playable').length;
        return `<button class="cat-filter ${this._filter === key ? 'active' : ''}" data-filter="${key}" style="border-left: 3px solid ${wing.color || '#00f2fe'}">
          ${wing.icon || ''} ${wing.label} (${wingPlayable} active)
        </button>`;
      }).join('')}
    `;

    // Re-bind filter clicks
    container.querySelectorAll('.cat-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.cat-filter').forEach(f => f.classList.remove('active'));
        btn.classList.add('active');
        this._filter = btn.dataset.filter;
        try { SFXLib.click?.() || SFXLib.playClick?.(); } catch (e) {}
        this._renderGrid();
        this._bindCardClicks();
      });
    });
  }

  _renderGrid() {
    const grid = document.getElementById('cat-grid');
    if (!grid) return;

    if (!this._games || this._games.length === 0) {
      this._useFallbackRegistry();
    }

    let filtered = [];
    if (this._filter === 'playable') {
      filtered = this._games.filter(g => PLAYABLE_GAMES.has(g.id) || g.status === 'playable');
    } else if (this._filter === 'all') {
      filtered = this._games;
    } else {
      filtered = this._games.filter(g => g.wing === this._filter);
    }

    grid.innerHTML = filtered.map(game => {
      const isPlayable = PLAYABLE_GAMES.has(game.id) || (game.status === 'playable' && game.built === true);
      const progress = (this._getProgress && this._getProgress(game.id)) || { stars: 0, cleared: 0, unlocked: true };
      const wingInfo = (this._wings && this._wings[game.wing]) || DEFAULT_WINGS[game.wing] || {};
      const skillName = (this._skillLabels && this._skillLabels[game.skill]) || game.skill || game.wing || 'Cognitive';
      const wingColor = wingInfo.color || game.palette?.primary || '#00f2fe';
      const starsHtml = this._renderStars(progress.stars || 0);
      const tags = Array.isArray(game.tags) ? game.tags : [];
      const tagsHtml = tags.slice(0, 3).map(t => `<span class="cat-tag">${t}</span>`).join('');

      let badgeHtml = '';
      let buttonHtml = '';

      if (isPlayable) {
        badgeHtml = `<span class="cat-playable-badge">▶ Playable (1–30)</span>`;
        buttonHtml = `
          <button class="cat-btn-play" type="button" data-game="${game.id}" data-name="${game.name}">
            Select Level (1–30) ▶
          </button>
        `;
      } else {
        badgeHtml = `<span class="cat-lock-badge">🔒 Locked</span>`;
        buttonHtml = `
          <button class="cat-btn-play cat-btn-locked" type="button" disabled>
            🔒 Locked (In Dev)
          </button>
        `;
      }

      return `
        <div class="cat-card ${isPlayable ? 'built cat-playable' : 'cat-card-locked'}"
             data-game="${game.id}"
             data-name="${game.name}"
             data-locked="${!isPlayable}"
             style="border-top: 3px solid ${isPlayable ? wingColor : '#334155'}">
          <div class="cat-card-header">
            <span class="cat-card-icon">${game.icon || wingInfo.icon || '🧠'}</span>
            <div style="flex:1;min-width:0;">
              <h3 class="cat-card-title">${game.name}</h3>
              <span class="cat-card-skill" style="color:${isPlayable ? wingColor : '#64748b'}">
                ${wingInfo.icon || ''} ${skillName}
              </span>
            </div>
            ${badgeHtml}
          </div>
          <p class="cat-card-desc">${game.description || 'Cognitive challenge module.'}</p>
          <div class="cat-card-tags">${tagsHtml}</div>
          <div class="cat-card-footer">
            <div class="cat-stars">
              ${starsHtml}
              <span style="font-size:0.75rem;color:#94a3b8;margin-left:6px">${isPlayable ? `${progress.cleared || 0}/30 Cleared` : 'Locked'}</span>
            </div>
            ${buttonHtml}
          </div>
        </div>
      `;
    }).join('');

    // Update count in footer
    const countEl = document.getElementById('cat-count');
    if (countEl) {
      const playableTotal = this._games.filter(g => PLAYABLE_GAMES.has(g.id) || g.status === 'playable').length;
      const lockedTotal = this._games.length - playableTotal;
      countEl.textContent = `${playableTotal} Playable Games (Levels 1–30) · ${lockedTotal} Locked Modules`;
    }
  }

  _renderStars(count) {
    let html = '';
    for (let i = 0; i < 3; i++) {
      html += `<span class="cat-star ${i < count ? 'cat-star-filled' : ''}">★</span>`;
    }
    return html;
  }

  _bindEvents() {
    // Back to Hub
    document.getElementById('cat-back')?.addEventListener('click', () => {
      try { SFXLib.click?.() || SFXLib.playClick?.(); } catch (e) {}
      EventBus.emit('catalogue:back');
    });

    // Close button
    document.getElementById('cat-close')?.addEventListener('click', () => {
      try { SFXLib.click?.() || SFXLib.playClick?.(); } catch (e) {}
      EventBus.emit('catalogue:back');
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
      card.addEventListener('click', (e) => {
        const isLocked = card.dataset.locked === 'true';
        const gameId = card.dataset.game;
        const gameName = card.dataset.name || 'Cognitive Challenge';

        // STRICT LOCK: Do not allow launching locked modules!
        if (isLocked) {
          try { SFXLib.incorrect?.() || SFXLib.playError?.(); } catch (err) {}
          this._flashLockedNotice(gameName);
          return;
        }

        try { SFXLib.click?.() || SFXLib.playClick?.(); } catch (err) {}
        this.hide();
        EventBus.emit('catalogue:select', {
          gameId,
          name: gameName
        });
      });
    });
  }

  _flashLockedNotice(gameName) {
    let notice = document.getElementById('cat-lock-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'cat-lock-notice';
      notice.style.cssText = `
        position: fixed;
        bottom: 70px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(220, 38, 38, 0.95);
        color: #fff;
        padding: 12px 24px;
        border-radius: 10px;
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
    notice.textContent = `🔒 "${gameName}" is currently locked and under facility development. Please select an active research chamber.`;
    notice.style.opacity = '1';
    clearTimeout(this._noticeTimer);
    this._noticeTimer = setTimeout(() => {
      if (notice) notice.style.opacity = '0';
    }, 2800);
  }

  async show(opts = {}) {
    await this.ensureData();
    if (!this._built) {
      this.build();
    }

    if (opts.title) {
      this._title = opts.title;
      const t = document.getElementById('cat-title-text');
      if (t) t.textContent = opts.title;
    }
    if (opts.subtitle) {
      this._subtitle = opts.subtitle;
      const s = document.getElementById('cat-subtitle-text');
      if (s) s.textContent = opts.subtitle;
    }
    if (opts.filter) {
      this._filter = opts.filter;
    }

    this._updateFilters();
    this._renderGrid();
    this._bindCardClicks();

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
