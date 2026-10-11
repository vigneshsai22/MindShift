/* ═══════════════════════════════════════════════
   MindShift — AdaptiveEngine
   Rule-based difficulty adaptation
   ═══════════════════════════════════════════════ */

export const DIFFICULTY = { BEGINNER:1, EASY:2, MEDIUM:3, HARD:4, EXPERT:5 };
export const DIFF_LABELS = { 1:'Beginner', 2:'Easy', 3:'Medium', 4:'Hard', 5:'Expert' };

export const CATEGORIES     = ['logical','pattern','memory','visual','reaction','audio'];
export const IQ_CATEGORIES  = ['iq-number','iq-pattern','iq-matrix','iq-odd','iq-spatial','iq-logic','iq-memory'];
export const ALL_CATEGORIES = [...CATEGORIES, ...IQ_CATEGORIES];

const TIME_THRESHOLDS = { 1:22, 2:18, 3:14, 4:11, 5:9 };
const WINDOW = 5;

export class AdaptiveEngine {
  constructor() {
    this.currentDifficulty = DIFFICULTY.MEDIUM;
    this._history          = [];
    this._categoryIndex    = 0;
    this._iqCategoryIndex  = 0;
    this._mixedIndex       = 0;
    this._queue            = this._buildQueue(CATEGORIES);
    this._iqQueue          = this._buildQueue(IQ_CATEGORIES);
    this._mixedQueue       = this._buildQueue(ALL_CATEGORIES);
  }

  setDifficulty(level) {
    this.currentDifficulty = Math.min(5, Math.max(1, Math.round(level)));
  }

  _buildQueue(cats) { return [...cats].sort(() => Math.random() - 0.5); }

  nextCategory() {
    if (this._categoryIndex >= this._queue.length) { this._queue = this._buildQueue(CATEGORIES); this._categoryIndex = 0; }
    return this._queue[this._categoryIndex++];
  }

  nextIQCategory() {
    if (this._iqCategoryIndex >= this._iqQueue.length) { this._iqQueue = this._buildQueue(IQ_CATEGORIES); this._iqCategoryIndex = 0; }
    return this._iqQueue[this._iqCategoryIndex++];
  }

  nextMixedCategory() {
    if (this._mixedIndex >= this._mixedQueue.length) { this._mixedQueue = this._buildQueue(ALL_CATEGORIES); this._mixedIndex = 0; }
    return this._mixedQueue[this._mixedIndex++];
  }

  update(metrics) {
    this._history.push({ ...metrics, difficulty: this.currentDifficulty });
    const win = this._history.slice(-WINDOW);
    const acc  = win.filter(h => h.correct).length / win.length;
    const avg  = win.reduce((s, h) => s + h.responseTime, 0) / win.length;
    this._applyRules(acc, avg, TIME_THRESHOLDS[this.currentDifficulty], win.length);
  }

  _applyRules(acc, avgTime, threshold, n) {
    if (n < 2) return;
    let d = 0;
    if (acc >= 0.85 && this.currentDifficulty < 5) d++;
    else if (acc < 0.45 && this.currentDifficulty > 1) d--;
    if (avgTime < threshold * 0.5 && acc >= 0.7 && this.currentDifficulty < 5) d++;
    else if (avgTime > threshold * 1.8 && this.currentDifficulty > 1) d--;
    d = Math.max(-1, Math.min(1, d));
    this.currentDifficulty = Math.min(5, Math.max(1, this.currentDifficulty + d));
  }

  getAdaptiveMessage(correct) {
    const d = this.currentDifficulty;
    if (!correct && d === 1) return '💪 Keep practicing, you\'ll get it!';
    if (!correct) return `📉 Adjusting to ${DIFF_LABELS[d]}`;
    if (correct && d === 5) return '🌟 Incredible! Expert level mastered!';
    return `📈 Great work! Next: ${DIFF_LABELS[d]}`;
  }

  getDifficultyLabel() { return DIFF_LABELS[this.currentDifficulty] || 'Medium'; }
  getDifficulty()      { return this.currentDifficulty; }

  overallPerformance() {
    if (!this._history.length) return 0;
    const acc = this._history.filter(h => h.correct).length / this._history.length;
    const avgD = this._history.reduce((s, h) => s + h.difficulty, 0) / this._history.length;
    return Math.round(acc * 60 + (avgD / 5) * 40);
  }

  categoryPerformance() {
    const result = {};
    ALL_CATEGORIES.forEach(cat => {
      const e = this._history.filter(h => h.category === cat);
      result[cat] = e.length ? Math.round(e.filter(h => h.correct).length / e.length * 100) : null;
    });
    return result;
  }

  iqCompositeScore() {
    const e = this._history.filter(h => h.category.startsWith('iq-'));
    if (!e.length) return null;
    const acc = e.filter(h => h.correct).length / e.length;
    const avgD = e.reduce((s, h) => s + h.difficulty, 0) / e.length;
    return Math.round(acc * 65 + (avgD / 5) * 35);
  }

  reset() {
    this._history         = [];
    this._categoryIndex   = 0;
    this._iqCategoryIndex = 0;
    this._mixedIndex      = 0;
    this._queue           = this._buildQueue(CATEGORIES);
    this._iqQueue         = this._buildQueue(IQ_CATEGORIES);
    this._mixedQueue      = this._buildQueue(ALL_CATEGORIES);
  }
}
