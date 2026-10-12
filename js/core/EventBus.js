/* ═══════════════════════════════════════════════════════════════
   EventBus.js — Global publish/subscribe event engine
   Singleton decoupled message bus for MindShift: Neural Breach.
   Supports: on, once, off, emit, wildcard '*', debug logging.
   ═══════════════════════════════════════════════════════════════ */

class _EventBus {
  constructor() {
    /** @type {Map<string, Set<{fn:Function, once:boolean}>>} */
    this._listeners = new Map();
    this._debug = false;
    this._log = [];         // last 200 events for debug overlay
    this._maxLog = 200;
  }

  /**
   * Subscribe to an event.
   * @param {string} event  Event name (e.g. 'trial:complete')
   * @param {Function} fn   Handler receiving (payload)
   * @returns {Function} Unsubscribe function
   */
  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    const entry = { fn, once: false };
    this._listeners.get(event).add(entry);
    return () => this._listeners.get(event)?.delete(entry);
  }

  /**
   * Subscribe to an event, auto-remove after first fire.
   */
  once(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    const entry = { fn, once: true };
    this._listeners.get(event).add(entry);
    return () => this._listeners.get(event)?.delete(entry);
  }

  /**
   * Remove a specific handler from an event.
   */
  off(event, fn) {
    const set = this._listeners.get(event);
    if (!set) return;
    for (const entry of set) {
      if (entry.fn === fn) { set.delete(entry); break; }
    }
  }

  /**
   * Emit an event with optional payload.
   * @param {string} event
   * @param {*} payload
   */
  emit(event, payload) {
    if (this._debug) {
      const entry = { t: performance.now(), event, payload };
      this._log.push(entry);
      if (this._log.length > this._maxLog) this._log.shift();
      console.log(`%c[EventBus] ${event}`, 'color:#0ff;font-weight:bold', payload);
    }

    // Fire specific listeners
    const set = this._listeners.get(event);
    if (set) {
      for (const entry of set) {
        try { entry.fn(payload); } catch (err) {
          console.error(`[EventBus] Error in handler for "${event}":`, err);
        }
        if (entry.once) set.delete(entry);
      }
    }

    // Fire wildcard listeners
    if (event !== '*') {
      const wild = this._listeners.get('*');
      if (wild) {
        for (const entry of wild) {
          try { entry.fn({ event, payload }); } catch (err) {
            console.error(`[EventBus] Error in wildcard handler:`, err);
          }
          if (entry.once) wild.delete(entry);
        }
      }
    }
  }

  /** Toggle debug mode (logs all events to console) */
  setDebug(enabled) {
    this._debug = !!enabled;
  }

  /** Get recent event log (for F3 debug overlay) */
  getLog() {
    return this._log;
  }

  /** Remove all listeners (teardown) */
  clear() {
    this._listeners.clear();
    this._log = [];
  }
}

/** Singleton instance */
export const EventBus = new _EventBus();
