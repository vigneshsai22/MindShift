/* ═══════════════════════════════════════════════════════════════
   PRNG.js — Seeded pseudo-random number generator (Mulberry32)
   Used for daily seed challenges and reproducible run generation.
   Same seed → same sequence of random numbers → same map & trials.
   ═══════════════════════════════════════════════════════════════ */

export class PRNG {
  /**
   * @param {number} seed  Integer seed value
   */
  constructor(seed) {
    this._seed = seed >>> 0;  // ensure unsigned 32-bit
    this._initial = this._seed;
  }

  /** Returns a float in [0, 1) — deterministic from seed */
  next() {
    let t = (this._seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive */
  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Float in [min, max) */
  float(min, max) {
    return this.next() * (max - min) + min;
  }

  /** Pick a random element from an array */
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Shuffle an array in place (Fisher-Yates with seeded RNG) */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Reset to initial seed */
  reset() {
    this._seed = this._initial;
  }

  /** Get current seed state (for save/restore) */
  get seed() { return this._seed; }
}
