// ═══════════════════════════════════════════════════════════════
// MindShift 3D — ScoringSystem
// Unified score formula for all challenge types.
// Mirrors calcScore() from challengePool.js — ported to C#.
// ═══════════════════════════════════════════════════════════════
using UnityEngine;
using MindShift.Challenges;
using MindShift.Core;

namespace MindShift.Scoring
{
    public class ScoringSystem : Singleton<ScoringSystem>
    {
        // ── Base Score per challenge ───────────────────────────────
        private const int BASE_SCORE = 1000;

        // ── Difficulty Multipliers ─────────────────────────────────
        private static float DiffMultiplier(DifficultyLevel d)
        {
            switch (d)
            {
                case DifficultyLevel.Easy:   return 0.6f;
                case DifficultyLevel.Medium: return 0.8f;
                case DifficultyLevel.Hard:   return 1.0f;
                default: return 0.8f;
            }
        }

        // ── Main Formula ──────────────────────────────────────────
        // Score = BASE × DiffMult × Accuracy × SpeedBonus × AttemptPenalty × HintPenalty
        // Mirrors: calcScore() in challengePool.js
        public int CalculateScore(ChallengeResult result)
        {
            if (!result.correct && result.correctCount == 0)
            {
                // Complete failure — still give partial based on accuracy if applicable
                if (result.totalRequired <= 1) return 0;
            }

            float accuracy = result.Accuracy;

            float normalizedSpeed = result.timeLimit > 0f
                ? Mathf.Clamp01((result.timeLimit - result.timeTaken) / result.timeLimit)
                : 0f;

            // Speed bonus: 1.0 (no speed bonus) to 1.5 (fastest possible)
            float speedBonus = 1.0f + 0.5f * normalizedSpeed;

            // Attempt penalty: max(0.5, 1 - wrongAttempts * 0.10)
            float attemptPenalty = Mathf.Max(0.5f, 1f - result.wrongAttempts * 0.10f);

            // Hint penalty: 1.0 - (hintsUsed * 0.10), min 0.70
            float hintPenalty = Mathf.Max(0.70f, 1f - result.hintsUsed * 0.10f);

            float raw = BASE_SCORE
                      * DiffMultiplier(result.difficulty)
                      * accuracy
                      * speedBonus
                      * attemptPenalty
                      * hintPenalty;

            return Mathf.Max(0, Mathf.RoundToInt(raw));
        }

        /// <summary>Compute session percentage: totalScore / maxPossible * 100.</summary>
        public float SessionPercentage(int totalScore, int challengeCount, DifficultyLevel avgDiff)
        {
            float maxScore = BASE_SCORE * DiffMultiplier(avgDiff) * 1.5f * challengeCount;
            return maxScore > 0f ? Mathf.Clamp(totalScore / maxScore * 100f, 0f, 100f) : 0f;
        }
    }

    // ── SFX Type enum (used by AudioManager) ─────────────────────
    public enum SFXType
    {
        Correct,
        Wrong,
        Tick,
        Hint,
        Achievement,
        DoorOpen,
        DoorClose,
        PanelHit,
        ShapeSnap,
        SwitchFlip,
        ObservationStart,
        RecallStart,
        ScanTag
    }
}
