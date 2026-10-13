/* ═══════════════════════════════════════════════════════════════
   CatalogueTerminal.js — Game Catalogue & Mind Lab Domain Selector
   Shows all 30 games across 6 cognitive wings with full filtering,
   star progress, 3D Core badges, and direct Level Map selection (1–30).
   ═══════════════════════════════════════════════════════════════ */

import { EventBus } from '../core/EventBus.js';
import { SFXLib }   from '../audio/SFXLib.js';

// Core 3D game engines available in each cognitive wing
const WING_CORE_GAMES = {
  memory:      'lumen-pond',
  logic:       'terminal-hack',
  observation: 'anomaly-rooms',
  pattern:     'hologram-matrix',
  reaction:    'reflex-arena',
  spatial:     'rotation-core'
};

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
    this._subtitle    = 'Explore all 30 cognitive challenges across 6 wings — select any challenge & level (1–30)';
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
      // If fetch fails, populate minimal 30 games registry
      this._useFallbackRegistry();
    }
  }

  _useFallbackRegistry() {
    const wings = ['memory', 'logic', 'observation', 'pattern', 'reaction', 'spatial'];
    const wingNames = {
      memory: ['Lumen Pond', 'Witness Room', 'Echo Shelves', 'Tone Tower', 'Memory Maze'],
      logic: ['Terminal Hack', 'Circuit Sorter', 'Syllogism Chamber', 'Binary Beam', 'Rule Forge'],
      observation: ['Anomaly Rooms', 'Shadow Shift', 'Microscopic Match', 'Optical Drift', 'Camouflage Lab'],
      pattern: ['Hologram Matrix', 'Fractal Sequence', 'Symbol Synthesizer', 'Prism Lattice', 'Code Weaver'],
      reaction: ['Reflex Arena', 'Laser Gate', 'Velocity Sphere', 'Impulse Core', 'Photon Dash'],
      spatial: ['Rotation Core', 'Origami Fold', 'Isometric Builder', 'Mirror Maze', 'Tesseract Drift']
    };
    const games = [];
    wings.forEach(w => {
      const names = wingNames[w] || [];
      names.forEach((name, idx) => {
        const id = idx === 0 ? WING_CORE_GAMES[w] : `${w}-game-${idx + 1}`;
        games.push({
          id,
          name,
          skill: w,
          wing: w,
          icon: DEFAULT_WINGS[w]?.icon || '🧠',
          description: idx === 0
            ? `Flagship 3D simulation for the ${DEFAULT_WINGS[w]?.label}.`
            : `Advanced cognitive research trial within the ${DEFAULT_WINGS[w]?.label}.`,
          tags: [w, `tier-${idx === 0 ? 1 : 2}`, 'adaptive'],
          built: idx === 0,
          status: idx === 0 ? 'playable' : 'simulation',
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
        <span class="catalogue-hint">Click any game to choose Level (1 – 30) · Press Tab or Back to return</span>
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
    container.innerHTML = `
      <button class="cat-filter ${this._filter === 'all' ? 'active' : ''}" data-filter="all">All Games (${this._games.length})</button>
      ${wingEntries.map(([key, wing]) => {
        const count = this._games.filter(g => g.wing === key).length;
        return `<button class="cat-filter ${this._filter === key ? 'active' : ''}" data-filter="${key}" style="border-left: 3px solid ${wing.color || '#00f2fe'}">
          ${wing.icon || ''} ${wing.label} ${count > 0 ? `(${count})` : ''}
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

    const filtered = this._filter === 'all'
      ? this._games
      : this._games.filter(g => g.wing === this._filter);

    grid.innerHTML = filtered.map(game => {
      const progress = (this._getProgress && this._getProgress(game.id)) || { stars: 0, cleared: 0, unlocked: true };
      const wingInfo = (this._wings && this._wings[game.wing]) || DEFAULT_WINGS[game.wing] || {};
      const skillName = (this._skillLabels && this._skillLabels[game.skill]) || game.skill || game.wing || 'Cognitive';
      const wingColor = wingInfo.color || game.palette?.primary || '#00f2fe';
      const isCore3D = Boolean(WING_CORE_GAMES[game.wing] === game.id);
      const targetGameId = isCore3D ? game.id : (WING_CORE_GAMES[game.wing] || 'lumen-pond');
      const starsHtml = this._renderStars(progress.stars || 0);
      const tags = Array.isArray(game.tags) ? game.tags : [];
      const tagsHtml = tags.slice(0, 3).map(t => `<span class="cat-tag">${t}</span>`).join('');

      const badgeHtml = isCore3D
        ? `<span class="cat-playable-badge">✨ 3D Simulation</span>`
        : `<span class="cat-wing-badge" style="border-color:${wingColor}60;color:${wingColor}">${wingInfo.icon || '🔬'} ${wingInfo.label || 'Wing'}</span>`;

      return `
        <div class="cat-card ${isCore3D ? 'built cat-playable' : 'cat-wing-sim'}"
             data-game="${game.id}"
             data-target-game="${targetGameId}"
             data-name="${game.name}"
             style="border-top: 3px solid ${wingColor}">
          <div class="cat-card-header">
            <span class="cat-card-icon">${game.icon || wingInfo.icon || '🧠'}</span>
            <div style="flex:1;min-width:0;">
              <h3 class="cat-card-title">${game.name}</h3>
              <span class="cat-card-skill" style="color:${wingColor}">
                ${wingInfo.icon || ''} ${skillName}
              </span>
            </div>
            ${badgeHtml}
          </div>
          <p class="cat-card-desc">${game.description || 'Cognitive challenge across 30 adaptive levels.'}</p>
          <div class="cat-card-tags">${tagsHtml}</div>
          <div class="cat-card-footer">
            <div class="cat-stars">
              ${starsHtml}
              <span style="font-size:0.75rem;color:#94a3b8;margin-left:6px">${progress.cleared || 0}/30 Cleared</span>
            </div>
            <button class="cat-btn-play" type="button" data-game="${game.id}" data-target-game="${targetGameId}" data-name="${game.name}">
              Select Level (1–30) ▶
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Update count in footer
    const countEl = document.getElementById('cat-count');
    if (countEl) {
      countEl.textContent = `${filtered.length} / ${this._games.length} Cognitive Challenges Ready (Levels 1–30)`;
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
        // Prevent double triggers if clicking child button
        const targetGame = card.dataset.targetGame || card.dataset.game;
        const originalId = card.dataset.game;
        const gameName   = card.dataset.name || 'Cognitive Challenge';

        try { SFXLib.click?.() || SFXLib.playClick?.(); } catch (err) {}
        this.hide();
        EventBus.emit('catalogue:select', {
          gameId: targetGame,
          originalId,
          name: gameName
        });
      });
    });
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
