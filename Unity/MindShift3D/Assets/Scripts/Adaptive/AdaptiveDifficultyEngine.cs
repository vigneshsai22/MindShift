// ═══════════════════════════════════════════════════════════════
// MindShift 3D — AdaptiveDifficultyEngine
// Per-category Performance Score (PS) system.
// Ported from AdaptiveEngine.js — rolling window, accuracy, speed,
// attempt and hint penalties.
// Upgrades: per-category independent tracking (not in the 2D version).
// ═══════════════════════════════════════════════════════════════
using System.Collections.Generic;
using UnityEngine;
using MindShift.Challenges;
using MindShift.Core;

namespace MindShift.Adaptive
{
    public class AdaptiveDifficultyEngine : Singleton<AdaptiveDifficultyEngine>
    {
        // ── Weights (matches 2D AdaptiveEngine scoring philosophy) ─
        private const float ACCURACY_W  = 0.50f;
        private const float SPEED_W     = 0.30f;
        private const float ATTEMPT_W   = 0.20f;
        private const float HISTORY_W   = 0.60f;   // rolling average old weight
        private const float RECENT_W    = 0.40f;   // rolling average new weight
        private const float HINT_PENALTY = 0.05f;  // per hint used

        // ── Thresholds (mirrors TIME_THRESHOLDS concept from JS) ──
        private const float HIGH_PS_THRESHOLD = 0.80f;   // → HARD
        private const float MID_PS_THRESHOLD  = 0.55f;   // → MEDIUM

        // ── Per-category Performance Scores (0.0 – 1.0) ──────────
        private Dictionary<CognitiveCategory, float> _performanceScores;

        // ── History (for analytics) ────────────────────────────────
        private Dictionary<CognitiveCategory, List<float>> _history;

        // ─────────────────────────────────────────────────────────
        protected override void Awake()
        {
            base.Awake();
            ResetAll();
        }

        // ── Public API ────────────────────────────────────────────

        /// <summary>Update the engine with the result of a completed challenge.</summary>
        public void UpdatePerformance(ChallengeResult result)
        {
            float accuracy = result.Accuracy;
            float normalizedSpeed = Mathf.Clamp01(
                result.timeLimit > 0
                    ? (result.timeLimit - result.timeTaken) / result.timeLimit
                    : 0f
            );
            float attemptScore = Mathf.Max(0f, 1f - result.wrongAttempts * 0.10f);
            float hintPenalty  = result.hintsUsed * HINT_PENALTY;

            float challengePS = (accuracy      * ACCURACY_W)
                              + (normalizedSpeed * SPEED_W)
                              + (attemptScore   * ATTEMPT_W)
                              - hintPenalty;

            challengePS = Mathf.Clamp01(challengePS);

            // Rolling average — mirrors AdaptiveEngine.js update() rolling window
            float oldPS = _performanceScores[result.category];
            float newPS = Mathf.Clamp01((oldPS * HISTORY_W) + (challengePS * RECENT_W));
            _performanceScores[result.category] = newPS;

            // Record history
            _history[result.category].Add(newPS);

            Debug.Log($"[Adaptive] {result.category}: PS {oldPS:F2} → {newPS:F2} " +
                      $"(acc:{accuracy:F2} spd:{normalizedSpeed:F2} att:{attemptScore:F2} hnts:{result.hintsUsed})");
        }

        /// <summary>Returns the current difficulty for a given cognitive category.</summary>
        public DifficultyLevel GetDifficulty(CognitiveCategory category)
        {
            float ps = _performanceScores[category];
            if (ps >= HIGH_PS_THRESHOLD) return DifficultyLevel.Hard;
            if (ps >= MID_PS_THRESHOLD)  return DifficultyLevel.Medium;
            return DifficultyLevel.Easy;
        }

        /// <summary>Raw performance score (0–1) for a category.</summary>
        public float GetPS(CognitiveCategory category) => _performanceScores[category];

        /// <summary>All per-category PS values as a snapshot.</summary>
        public Dictionary<CognitiveCategory, float> GetAllScores() =>
            new Dictionary<CognitiveCategory, float>(_performanceScores);

        /// <summary>
        /// Overall performance 0–100 — mirrors overallPerformance() from AdaptiveEngine.js.
        /// </summary>
        public int OverallPerformance()
        {
            float total = 0f; int count = 0;
            foreach (var kvp in _performanceScores)
            {
                total += kvp.Value;
                count++;
            }
            return count > 0 ? Mathf.RoundToInt((total / count) * 100f) : 0;
        }

        /// <summary>
        /// ARIA motivational message — mirrors getAdaptiveMessage() from AdaptiveEngine.js.
        /// </summary>
        public string GetAdaptiveMessage(CognitiveCategory cat, bool correct)
        {
            DifficultyLevel d = GetDifficulty(cat);
            if (!correct && d == DifficultyLevel.Easy)
                return "Keep going — you'll get it!";
            if (!correct)
                return $"Adjusting to {d} mode for {cat}…";
            if (correct && d == DifficultyLevel.Hard)
                return $"Incredible! Hard {cat} mastered!";
            return $"Well done! {cat} challenge level: {d}";
        }

        public void ResetAll()
        {
            _performanceScores = new Dictionary<CognitiveCategory, float>();
            _history           = new Dictionary<CognitiveCategory, List<float>>();

            foreach (CognitiveCategory cat in System.Enum.GetValues(typeof(CognitiveCategory)))
            {
                _performanceScores[cat] = 0.55f;  // Start at MEDIUM (matches JS DIFFICULTY.MEDIUM=3)
                _history[cat]           = new List<float>();
            }
        }
    }
}
