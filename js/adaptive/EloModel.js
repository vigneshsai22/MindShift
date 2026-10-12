/* ═══════════════════════════════════════════════════════════════
   EloModel.js — Glicko-style Adaptive Elo Rating System
   Scientific centrepiece for cognitive skill quantification.
   ═══════════════════════════════════════════════════════════════
   Formulas:
   - Expected score: p = 1 / (1 + 10^((D - R) / 400))
   - Continuous score: S = correct ? (0.6 + 0.4 * speedFactor) : 0.0
   - Dynamic K-factor: K(RD) = K_min + (K_max - K_min) * min(1, RD / RD_0)
   - Rating update: R' = R + K(RD) * (S - p)
   - Uncertainty update: RD' = sqrt(1 / (1 / RD^2 + 1 / v))
   - Flow zone target D: D = R - 400 * log10(1/p_target - 1)
   ═══════════════════════════════════════════════════════════════ */

import { CONFIG } from '../core/Config.js';
import { EventBus } from '../core/EventBus.js';

export const SKILLS = [
  'memory',
  'audio',
  'pattern',
  'observation',
  'reaction',
  'spatial',
  'logical'
];

export class EloModel {
  constructor(initialRatings = {}) {
    const eloCfg = CONFIG.ADAPTIVE.ELO;
    this.defaultRating = eloCfg.INITIAL_RATING;      // 1200
    this.defaultRD     = eloCfg.INITIAL_RD;          // 350
    this.minRD         = eloCfg.MIN_RD;              // 50
    this.maxRD         = eloCfg.MAX_RD;              // 350
    this.kMin          = eloCfg.K_MIN;               // 16
    this.kMax          = eloCfg.K_MAX;               // 48
    this.flowTarget    = CONFIG.ADAPTIVE.FLOW_TARGET_P; // 0.70

    // Rating and Uncertainty state per cognitive skill
    this.skills = {};
    for (const skill of SKILLS) {
      this.skills[skill] = {
        rating: initialRatings[skill]?.rating ?? this.defaultRating,
        rd:     initialRatings[skill]?.rd     ?? this.defaultRD,
        trialsCount: initialRatings[skill]?.trialsCount ?? 0,
        history: []
      };
    }

    this.trialLog = []; // Full run telemetry
  }

  /**
   * Calculates expected probability of success p in [0, 1]
   * p = 1 / (1 + 10^((D - R) / 400))
   */
  expectedScore(playerRating, trialDifficulty) {
    return 1 / (1 + Math.pow(10, (trialDifficulty - playerRating) / 400));
  }

  /**
   * Suggests next trial difficulty D to maintain the flow zone (p ~ 0.70)
   * Inverts the Elo logistic formula:
   * 1/p - 1 = 10^((D - R)/400) ==> D = R + 400 * log10(1/p - 1)
   * Note: For p = 0.70, (1/0.7 - 1) = 0.42857; log10(0.42857) = -0.36798;
   * D = R - 147.2 Elo points below player skill.
   */
  suggestDifficulty(skill, targetP = this.flowTarget) {
    const s = this.getSkill(skill);
    const clampedP = Math.max(0.1, Math.min(0.9, targetP));
    const delta = 400 * Math.log10((1 / clampedP) - 1);
    const targetD = s.rating + delta;
    return Math.max(600, Math.min(2400, Math.round(targetD)));
  }

  /**
   * Computes continuous performance score S in [0, 1]
   * Blends binary correctness with response time against par
   */
  calculateScore(correct, responseTime, parTime = 15.0, hintsUsed = 0, perksUsed = 0) {
    if (!correct) return 0.0;

    // Response time ratio
    const speedRatio = Math.max(0, Math.min(1, (parTime - responseTime) / parTime));
    let s = 0.60 + 0.40 * speedRatio;

    // Apply documented penalties
    const hintPenalty = hintsUsed * CONFIG.ADAPTIVE.HINT_PENALTY_S;
    const perkPenalty = perksUsed * CONFIG.ADAPTIVE.PERK_PENALTY_S;
    s = Math.max(0.05, s - hintPenalty - perkPenalty);

    return Math.min(1.0, s);
  }

  /**
   * Calculates dynamic K-factor based on uncertainty RD
   */
  getKFactor(rd) {
    const ratio = Math.max(0, Math.min(1, rd / this.defaultRD));
    return this.kMin + (this.kMax - this.kMin) * ratio;
  }

  /**
   * Updates player skill rating and uncertainty after trial completion
   */
  recordTrial({
    skill,
    difficulty,
    correct,
    responseTime,
    parTime = 15.0,
    hintsUsed = 0,
    perksUsed = 0,
    directorState = 'BUILD'
  }) {
    if (!this.skills[skill]) {
      this.skills[skill] = {
        rating: this.defaultRating,
        rd: this.defaultRD,
        trialsCount: 0,
        history: []
      };
    }

    const s = this.skills[skill];
    const rBefore = s.rating;
    const rdBefore = s.rd;

    // 1. Calculate metrics
    const p = this.expectedScore(rBefore, difficulty);
    const S = this.calculateScore(correct, responseTime, parTime, hintsUsed, perksUsed);
    const K = this.getKFactor(rdBefore);

    // 2. Rating update: delta = K * (S - p)
    const deltaR = K * (S - p);
    const rAfter = Math.max(500, Math.min(2500, Math.round(rBefore + deltaR)));

    // 3. Uncertainty shrinkage (Glicko-style Bayesian update)
    // Variance factor v inversely proportional to information gained
    const v = 300.0;
    const newVariance = 1 / ( (1 / (rdBefore * rdBefore)) + (1 / (v * v)) );
    const rdAfter = Math.max(this.minRD, Math.min(this.maxRD, Math.round(Math.sqrt(newVariance))));

    // 4. Update state
    s.rating = rAfter;
    s.rd = rdAfter;
    s.trialsCount++;

    const trialRecord = {
      timestamp: Date.now(),
      skill,
      difficulty,
      rBefore,
      rAfter,
      rdBefore,
      rdAfter,
      deltaR,
      p: parseFloat(p.toFixed(3)),
      S: parseFloat(S.toFixed(3)),
      correct: !!correct,
      responseTime: parseFloat(responseTime.toFixed(2)),
      parTime,
      hintsUsed,
      perksUsed,
      directorState
    };

    s.history.push(trialRecord);
    this.trialLog.push(trialRecord);

    // Emit live telemetry for HUD and AI Director
    EventBus.emit('telemetry:update', {
      skill,
      eloR: rAfter,
      eloRD: rdAfter,
      trialD: difficulty,
      flowP: p,
      kFactor: K,
      deltaR
    });

    return trialRecord;
  }

  getSkill(skill) {
    return this.skills[skill] || {
      rating: this.defaultRating,
      rd: this.defaultRD,
      trialsCount: 0,
      history: []
    };
  }

  getRating(skill) {
    return this.getSkill(skill)?.rating ?? this.defaultRating;
  }

  updateRating(skill, difficulty, correct, responseTime, parTime = 15.0, hintsUsed = 0, perksUsed = 0) {
    return this.recordTrial({
      skill,
      difficulty,
      correct,
      responseTime,
      parTime,
      hintsUsed,
      perksUsed
    });
  }

  getAllRatings() {
    const summary = {};
    for (const [skill, data] of Object.entries(this.skills)) {
      summary[skill] = {
        rating: data.rating,
        rd: data.rd,
        trialsCount: data.trialsCount
      };
    }
    return summary;
  }

  getLog() {
    return this.trialLog;
  }

  exportCSV() {
    const headers = [
      'timestamp', 'skill', 'difficulty', 'rBefore', 'rAfter', 'rdBefore', 'rdAfter',
      'deltaR', 'p', 'S', 'correct', 'responseTime', 'parTime', 'hintsUsed', 'perksUsed', 'directorState'
    ];
    const rows = this.trialLog.map(row => headers.map(h => row[h]).join(','));
    return [headers.join(','), ...rows].join('\n');
  }
}
