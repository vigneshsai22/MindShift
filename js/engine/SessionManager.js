/* ═══════════════════════════════════════════════
   MindShift — SessionManager
   Tracks an active game session in memory
   ═══════════════════════════════════════════════ */

export class SessionManager {
  constructor() {
    this.reset();
  }

  reset() {
    this._startTime      = null;
    this._challenges     = [];     // Array of challenge metric records
    this._currentStreak  = 0;
    this._bestStreak     = 0;
    this._totalScore     = 0;
    this._hintsUsed      = 0;
    this._diffHistory    = [];     // difficulty level at each challenge
    this._categoryTotals = {       // sum of scores per category
      logical: 0, pattern: 0, memory: 0,
      visual: 0, reaction: 0, audio: 0
    };
    this._categoryCounts = {
      logical: 0, pattern: 0, memory: 0,
      visual: 0, reaction: 0, audio: 0
    };
  }

  start(initialDifficulty) {
    this.reset();
    this._startTime = Date.now();
    this._diffHistory.push(initialDifficulty);
  }

  /**
   * Record one completed challenge.
   * @param {object} metrics
   *   { category, difficulty, score, correct, attempts,
   *     responseTime, hintUsed, totalTime }
   */
  record(metrics) {
    const entry = {
      ...metrics,
      timestamp: Date.now()
    };
    this._challenges.push(entry);

    // Score
    this._totalScore += metrics.score || 0;

    // Streak
    if (metrics.correct) {
      this._currentStreak++;
      if (this._currentStreak > this._bestStreak) this._bestStreak = this._currentStreak;
    } else {
      this._currentStreak = 0;
    }

    // Category accumulation
    if (this._categoryTotals.hasOwnProperty(metrics.category)) {
      // Category score = accuracy % * base, clipped 0-100
      const accuracy = metrics.attempts > 0
        ? Math.max(0, (1 - (metrics.attempts - 1) / metrics.attempts)) * (metrics.correct ? 1 : 0)
        : 0;
      this._categoryTotals[metrics.category]  += accuracy * 100;
      this._categoryCounts[metrics.category]  += 1;
    }

    // Hints
    if (metrics.hintUsed) this._hintsUsed++;

    // Difficulty history
    this._diffHistory.push(metrics.difficulty);
  }

  get currentStreak() { return this._currentStreak; }
  get bestStreak()    { return this._bestStreak; }
  get totalScore()    { return this._totalScore; }
  get challengesDone(){ return this._challenges.length; }

  /** Rolling accuracy over last N challenges */
  rollingAccuracy(n = 5) {
    const recent = this._challenges.slice(-n);
    if (!recent.length) return 0;
    return recent.filter(c => c.correct).length / recent.length;
  }

  /** Rolling average response time over last N challenges */
  rollingAvgTime(n = 5) {
    const recent = this._challenges.slice(-n).filter(c => c.responseTime > 0);
    if (!recent.length) return 0;
    return recent.reduce((s, c) => s + c.responseTime, 0) / recent.length;
  }

  /** Overall accuracy across all challenges */
  overallAccuracy() {
    if (!this._challenges.length) return 0;
    return (this._challenges.filter(c => c.correct).length / this._challenges.length) * 100;
  }

  /** Average response time across all challenges */
  avgResponseTime() {
    const valid = this._challenges.filter(c => c.responseTime > 0);
    if (!valid.length) return 0;
    return valid.reduce((s, c) => s + c.responseTime, 0) / valid.length;
  }

  /** Category scores as percentages 0–100 */
  categoryScores() {
    const scores = {};
    Object.keys(this._categoryTotals).forEach(cat => {
      const count = this._categoryCounts[cat];
      scores[cat] = count > 0
        ? Math.round(this._categoryTotals[cat] / count)
        : 0;
    });
    // For categories with actual challenge results, use correct/total approach
    const catResults = {};
    Object.keys(this._categoryTotals).forEach(cat => { catResults[cat] = { correct:0, total:0 }; });
    this._challenges.forEach(c => {
      if (catResults[c.category]) {
        catResults[c.category].total++;
        if (c.correct) catResults[c.category].correct++;
      }
    });
    Object.keys(catResults).forEach(cat => {
      if (catResults[cat].total > 0) {
        scores[cat] = Math.round((catResults[cat].correct / catResults[cat].total) * 100);
      }
    });
    return scores;
  }

  /**
   * Build the full session summary object (persisted to profile).
   */
  getSummary() {
    const totalTime = Date.now() - (this._startTime || Date.now());
    return {
      date:               Date.now(),
      duration:           Math.round(totalTime / 1000),
      totalScore:         this._totalScore,
      challengesCompleted: this._challenges.length,
      overallAccuracy:    Math.round(this.overallAccuracy()),
      avgResponseTime:    Math.round(this.avgResponseTime() * 10) / 10,
      bestStreak:         this._bestStreak,
      hintsUsed:          this._hintsUsed,
      categoryScores:     this.categoryScores(),
      difficultyHistory:  [...this._diffHistory],
      challenges:         this._challenges.map(c => ({
        category:     c.category,
        difficulty:   c.difficulty,
        score:        c.score,
        correct:      c.correct,
        responseTime: c.responseTime
      }))
    };
  }
}
