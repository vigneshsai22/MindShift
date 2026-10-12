/* ═══════════════════════════════════════════════════════════════
   NeuralMap.js — Branching Sector Route Navigation
   Slay-the-Spire style branching map of Mind Lab research sectors.
   Allows player to chart their own route through the facility.
   ═══════════════════════════════════════════════════════════════ */

import { EventBus } from '../core/EventBus.js';

export const SECTOR_TIERS = [
  {
    tier: 1,
    nodes: [
      { id: 'memory', name: 'Memory Vault', icon: '💾', skill: 'memory', desc: 'Neural recall & blackout trials' }
    ]
  },
  {
    tier: 2,
    nodes: [
      { id: 'audio', name: 'Resonance Tunnel', icon: '🎵', skill: 'audio', desc: 'Rhythm lanes & pitch recall' },
      { id: 'pattern', name: 'Hologram Assembly', icon: '🧩', skill: 'pattern', desc: '3D pattern completion & magnetic snap' }
    ]
  },
  {
    tier: 3,
    nodes: [
      { id: 'observation', name: 'Anomaly Chamber', icon: '👁️', skill: 'observation', desc: 'Twin chamber anomaly detection' },
      { id: 'reaction', name: 'Reflex Arena', icon: '⚡', skill: 'reaction', desc: 'Spatial target elimination' }
    ]
  },
  {
    tier: 4,
    nodes: [
      { id: 'spatial', name: 'Rotation Core', icon: '🔄', skill: 'spatial', desc: '3D object alignment & net folding' }
    ]
  },
  {
    tier: 5,
    nodes: [
      { id: 'logic', name: 'Final Core Terminal', icon: '🧠', skill: 'logical', desc: 'Final multi-skill logic deduction' }
    ]
  }
];

export class NeuralMap {
  constructor() {
    this._el = null;
    this._currentTier = 1;
    this._completedSectors = [];
  }

  show(currentTier = 1, completed = [], onSelect) {
    this._currentTier = currentTier;
    this._completedSectors = completed;
    this._createDOM(onSelect);
  }

  _createDOM(onSelect) {
    this.close();

    this._el = document.createElement('div');
    this._el.className = 'neural-map-overlay';
    this._el.style.cssText = `
      position: fixed; inset: 0; background: rgba(3, 7, 18, 0.94);
      backdrop-filter: blur(18px); z-index: 540; display: flex;
      flex-direction: column; align-items: center; justify-content: center;
      font-family: 'JetBrains Mono', monospace; user-select: none;
      animation: fadeIn 0.3s ease;
    `;

    this._el.innerHTML = `
      <div style="text-align:center;margin-bottom:32px">
        <span style="color:#00e5ff;font-size:0.75rem;letter-spacing:0.2em;font-weight:700">FACILITY TOPOLOGY</span>
        <h2 style="font-family:'Outfit',sans-serif;font-size:2.2rem;font-weight:900;color:#fff;margin:6px 0">
          NEURAL MAP ROUTE
        </h2>
        <p style="color:#94a3b8;font-size:0.85rem">Select your next destination sector to advance the facility breach.</p>
      </div>

      <!-- Tiers container -->
      <div style="display:flex;align-items:center;gap:36px;max-width:1100px;width:95%;justify-content:center">
        ${SECTOR_TIERS.map((tierGroup, tIdx) => `
          <div style="display:flex;flex-direction:column;gap:20px;align-items:center">
            <span style="font-size:0.7rem;color:#64748b;font-weight:700;letter-spacing:0.1em">TIER ${tierGroup.tier}</span>
            <div style="display:flex;flex-direction:column;gap:20px">
              ${tierGroup.nodes.map(node => {
                const isDone = this._completedSectors.includes(node.id);
                const isSelectable = (tierGroup.tier === this._currentTier);
                const isLocked = (tierGroup.tier > this._currentTier);

                let borderColor = isDone ? '#10b981' : isSelectable ? '#00e5ff' : 'rgba(255,255,255,0.1)';
                let bg = isDone ? 'rgba(16,185,129,0.1)' : isSelectable ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)';

                return `
                  <div class="map-node ${isSelectable ? 'selectable' : ''}" data-id="${node.id}" style="
                    width:170px;background:${bg};border:1.5px solid ${borderColor};
                    border-radius:12px;padding:16px 12px;display:flex;flex-direction:column;
                    align-items:center;cursor:${isSelectable ? 'pointer' : 'default'};
                    opacity:${isLocked ? 0.38 : 1};transition:all 0.25s ease;
                    box-shadow:${isSelectable ? '0 0 20px rgba(0,229,255,0.2)' : 'none'}">
                    <span style="font-size:2.2rem;margin-bottom:8px">${node.icon}</span>
                    <h4 style="font-family:'Outfit',sans-serif;font-size:0.95rem;font-weight:800;color:${isDone ? '#10b981' : isSelectable ? '#00e5ff' : '#94a3b8'};text-align:center;margin-bottom:6px">
                      ${node.name}
                    </h4>
                    <p style="font-size:0.68rem;color:#64748b;text-align:center;line-height:1.3;margin:0">
                      ${node.desc}
                    </p>
                    ${isDone ? '<span style="color:#10b981;font-size:0.65rem;font-weight:800;margin-top:8px">● CLEARED</span>' : ''}
                    ${isSelectable ? '<span style="color:#00e5ff;font-size:0.65rem;font-weight:800;margin-top:8px">▶ ENGAGE</span>' : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          ${tIdx < SECTOR_TIERS.length - 1 ? '<div style="color:rgba(0,229,255,0.3);font-size:1.5rem">➔</div>' : ''}
        `).join('')}
      </div>
    `;

    document.body.appendChild(this._el);

    // Bind selectable nodes
    this._el.querySelectorAll('.map-node.selectable').forEach(nodeEl => {
      nodeEl.addEventListener('mouseenter', () => {
        nodeEl.style.transform = 'scale(1.06)';
        nodeEl.style.borderColor = '#00ffcc';
        nodeEl.style.boxShadow = '0 0 28px rgba(0,255,204,0.4)';
      });
      nodeEl.addEventListener('mouseleave', () => {
        nodeEl.style.transform = '';
        nodeEl.style.borderColor = '#00e5ff';
        nodeEl.style.boxShadow = '0 0 20px rgba(0,229,255,0.2)';
      });

      nodeEl.addEventListener('click', () => {
        const id = nodeEl.dataset.id;
        EventBus.emit('sector:select', { sectorId: id });
        this.close();
        if (onSelect) onSelect(id);
      });
    });
  }

  close() {
    if (this._el) {
      this._el.remove();
      this._el = null;
    }
  }
}
