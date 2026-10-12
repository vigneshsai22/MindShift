/* ═══════════════════════════════════════════════════════════════
   HintSystem.js — Three hint types with cost tracking
   - Slow Time:  Extends timer by 50%, costs score & lowers S
   - Reveal:     Shows partial answer, costs score & lowers S
   - ARIA Clue:  AI gives a contextual text hint, costs score & lowers S
   Each hint can only be used once per level.
   ═══════════════════════════════════════════════════════════════ */

import { EventBus } from '../core/EventBus.js';

export const HINT_TYPES = {
  SLOW_TIME: 'slow_time',
  REVEAL:    'reveal',
  ARIA_CLUE: 'aria_clue',
};

export const HINT_COSTS = {
  slow_time: { scorePenalty: 200, sFactor: 0.10 },
  reveal:    { scorePenalty: 350, sFactor: 0.15 },
  aria_clue: { scorePenalty: 150, sFactor: 0.10 },
};

export class HintSystem {
  constructor() {
    this._used = new Set();
    this._available = new Set([HINT_TYPES.SLOW_TIME, HINT_TYPES.REVEAL, HINT_TYPES.ARIA_CLUE]);
    this._totalUsed = 0;
    this._onUseHint = null;
  }

  /** Register callback for hint usage */
  onUseHint(fn) { this._onUseHint = fn; return this; }

  /**
   * Use a hint.
   * @param {string} type - one of HINT_TYPES
   * @returns {{ success: boolean, cost: Object, totalUsed: number }}
   */
  use(type) {
    if (!this._available.has(type) || this._used.has(type)) {
      return { success: false, cost: null, totalUsed: this._totalUsed };
    }

    this._used.add(type);
    this._totalUsed++;
    const cost = HINT_COSTS[type] || { scorePenalty: 100, sFactor: 0.10 };

    EventBus.emit('hint:used', { type, cost, totalUsed: this._totalUsed });

    if (this._onUseHint) this._onUseHint(type, cost);

    return { success: true, cost, totalUsed: this._totalUsed };
  }

  /** Check if a hint type is still available */
  isAvailable(type) {
    return this._available.has(type) && !this._used.has(type);
  }

  /** Get number of hints used */
  get totalUsed() { return this._totalUsed; }

  /** Get set of used hint types */
  get usedTypes() { return new Set(this._used); }

  /** Reset for a new level */
  reset() {
    this._used.clear();
    this._totalUsed = 0;
  }

  /** Get remaining hints count */
  get remaining() {
    return this._available.size - this._used.size;
  }

  /** Get all hint info for UI display */
  getHintInfo() {
    return [
      {
        type: HINT_TYPES.SLOW_TIME,
        label: '⏳ Slow Time',
        desc: 'Extends timer by 50%',
        available: this.isAvailable(HINT_TYPES.SLOW_TIME),
        cost: HINT_COSTS.slow_time,
      },
      {
        type: HINT_TYPES.REVEAL,
        label: '👁️ Reveal',
        desc: 'Shows part of the answer',
        available: this.isAvailable(HINT_TYPES.REVEAL),
        cost: HINT_COSTS.reveal,
      },
      {
        type: HINT_TYPES.ARIA_CLUE,
        label: '🤖 ARIA Clue',
        desc: 'AI guide gives a contextual hint',
        available: this.isAvailable(HINT_TYPES.ARIA_CLUE),
        cost: HINT_COSTS.aria_clue,
      },
    ];
  }
}
