/* ═══════════════════════════════════════════════════════════════
   PerkPicker.js — Neural Upgrade Selection Modal
   Presented between cleared sectors.
   Allows player to pick 1 of 3 procedural Neural Upgrades.
   ═══════════════════════════════════════════════════════════════ */

import { getRandomPerks } from '../data/perks.js';
import { EventBus } from '../core/EventBus.js';

export class PerkPicker {
  constructor() {
    this._el = null;
    this._activePerks = [];
  }

  show(onPicked) {
    this._createDOM(onPicked);
  }

  _createDOM(onPicked) {
    this.close();

    const perks = getRandomPerks(3, this._activePerks);
    this._el = document.createElement('div');
    this._el.className = 'perk-picker-overlay';
    this._el.style.cssText = `
      position: fixed; inset: 0; background: rgba(3, 7, 18, 0.92);
      backdrop-filter: blur(16px); z-index: 550; display: flex;
      flex-direction: column; align-items: center; justify-content: center;
      font-family: 'JetBrains Mono', monospace; user-select: none;
      animation: fadeIn 0.3s ease;
    `;

    this._el.innerHTML = `
      <div style="text-align:center;margin-bottom:32px">
        <span style="color:#00e5ff;font-size:0.75rem;letter-spacing:0.2em;font-weight:700">SECTOR BENCHMARK CLEARED</span>
        <h2 style="font-family:'Outfit',sans-serif;font-size:2.2rem;font-weight:900;color:#fff;margin:6px 0">
          SELECT NEURAL UPGRADE
        </h2>
        <p style="color:#94a3b8;font-size:0.85rem">Upgrades offer mechanical aid but penalize overall score multiplier.</p>
      </div>

      <div style="display:flex;gap:24px;max-width:960px;width:90%">
        ${perks.map((p, idx) => `
          <div class="perk-card" data-idx="${idx}" style="
            flex:1;background:rgba(255,255,255,0.03);border:1px solid rgba(0,229,255,0.3);
            border-radius:14px;padding:26px 20px;display:flex;flex-direction:column;
            align-items:center;cursor:pointer;transition:all 0.25s ease;
            box-shadow:0 8px 30px rgba(0,0,0,0.5)">
            <span style="font-size:3rem;margin-bottom:14px">${p.icon}</span>
            <h3 style="font-family:'Outfit',sans-serif;font-size:1.25rem;font-weight:800;color:#00e5ff;margin-bottom:10px;text-align:center">
              ${p.name}
            </h3>
            <p style="font-size:0.82rem;color:#cbd5e1;line-height:1.45;text-align:center;flex:1;margin-bottom:16px">
              ${p.description}
            </p>
            <div style="font-size:0.75rem;color:#f43f5e;font-weight:700;background:rgba(244,63,94,0.1);padding:4px 10px;border-radius:4px;border:1px solid rgba(244,63,94,0.3)">
              ⚠️ ${p.penaltyDesc}
            </div>
            <button class="perk-select-btn" style="
              margin-top:20px;width:100%;background:linear-gradient(135deg,#00e5ff,#0284c7);
              border:none;border-radius:8px;padding:10px;font-family:'JetBrains Mono',monospace;
              font-weight:800;color:#000;font-size:0.85rem;cursor:pointer">
              EQUIP UPGRADE
            </button>
          </div>
        `).join('')}
      </div>

      <button id="perk-skip-btn" style="
        margin-top:28px;background:transparent;border:1px solid #475569;color:#94a3b8;
        padding:8px 20px;border-radius:6px;font-family:'JetBrains Mono',monospace;
        cursor:pointer;font-size:0.8rem;transition:all 0.2s">
        SKIP (PRESERVE 100% SCORE MULTIPLIER)
      </button>
    `;

    document.body.appendChild(this._el);

    // Bind cards
    this._el.querySelectorAll('.perk-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-6px)';
        card.style.borderColor = '#00e5ff';
        card.style.boxShadow = '0 12px 36px rgba(0,229,255,0.25)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.borderColor = 'rgba(0,229,255,0.3)';
        card.style.boxShadow = '0 8px 30px rgba(0,0,0,0.5)';
      });

      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.idx, 10);
        const selected = perks[idx];
        this._activePerks.push(selected.id);
        EventBus.emit('perk:picked', selected);
        this.close();
        if (onPicked) onPicked(selected);
      });
    });

    document.getElementById('perk-skip-btn')?.addEventListener('click', () => {
      this.close();
      if (onPicked) onPicked(null);
    });
  }

  close() {
    if (this._el) {
      this._el.remove();
      this._el = null;
    }
  }
}
