/* ═══════════════════════════════════════════════════════════════
   RuleEngine.js — Rule switching system for adaptive games
   Manages rules that can change mid-level (e.g., Factory Sorter,
   Signal Console). Supports rule stacks, switch intervals,
   and cue notifications.
   ═══════════════════════════════════════════════════════════════ */

import { EventBus } from '../core/EventBus.js';

export class RuleEngine {
  constructor() {
    this._rules      = [];     // Array of { id, label, predicate, cue }
    this._activeRule  = null;
    this._activeIndex = 0;
    this._switchTimer = 0;
    this._switchInterval = 0;  // seconds between switches (0 = no auto-switch)
    this._switchCount = 0;
    this._onSwitch    = null;  // callback(newRule, oldRule)
  }

  /**
   * Define available rules.
   * @param {Array<{ id: string, label: string, predicate: Function, cue: string }>} rules
   */
  setRules(rules) {
    this._rules = rules;
    if (rules.length > 0 && !this._activeRule) {
      this._activeRule = rules[0];
      this._activeIndex = 0;
    }
    return this;
  }

  /** Set auto-switch interval in seconds (0 = manual only) */
  setSwitchInterval(seconds) {
    this._switchInterval = seconds;
    this._switchTimer = 0;
    return this;
  }

  /** Callback when rule switches */
  onSwitch(fn) {
    this._onSwitch = fn;
    return this;
  }

  /** Activate a specific rule by index */
  activateRule(index) {
    if (index < 0 || index >= this._rules.length) return;
    const old = this._activeRule;
    this._activeRule = this._rules[index];
    this._activeIndex = index;
    this._switchCount++;
    if (this._onSwitch) this._onSwitch(this._activeRule, old);
    EventBus.emit('rule:switch', { rule: this._activeRule, previous: old, count: this._switchCount });
  }

  /** Switch to the next rule (wraps around) */
  switchNext() {
    const nextIdx = (this._activeIndex + 1) % this._rules.length;
    this.activateRule(nextIdx);
  }

  /** Switch to a random different rule */
  switchRandom() {
    if (this._rules.length <= 1) return;
    let idx;
    do { idx = Math.floor(Math.random() * this._rules.length); }
    while (idx === this._activeIndex);
    this.activateRule(idx);
  }

  /**
   * Test a value against the active rule.
   * @param {*} value - the item to test
   * @returns {boolean}
   */
  test(value) {
    if (!this._activeRule) return false;
    return this._activeRule.predicate(value);
  }

  /** Get the active rule */
  get activeRule() { return this._activeRule; }
  get activeLabel() { return this._activeRule?.label || ''; }
  get activeCue() { return this._activeRule?.cue || ''; }

  /**
   * Update timer. Call with dt in seconds.
   * Auto-switches if interval is set.
   */
  update(dt) {
    if (this._switchInterval <= 0) return;
    this._switchTimer += dt;
    if (this._switchTimer >= this._switchInterval) {
      this._switchTimer = 0;
      this.switchNext();
    }
  }

  /** Reset */
  reset() {
    this._switchTimer = 0;
    this._switchCount = 0;
    if (this._rules.length > 0) {
      this._activeRule = this._rules[0];
      this._activeIndex = 0;
    }
  }
}
