// ═══════════════════════════════════════════════════════════════
// MindShift 3D — ChallengeResult
// Data class returned by every challenge upon completion.
// Directly ported from the 2D JS metrics object in ChallengeBase.js
// ═══════════════════════════════════════════════════════════════
using System;

namespace MindShift.Challenges
{
    [Serializable]
    public class ChallengeResult
    {
        // ── Identification ────────────────────────────────────────
        public ChallengeType      type;
        public CognitiveCategory  category;
        public DifficultyLevel    difficulty;

        // ── Outcome ───────────────────────────────────────────────
        public bool  correct;
        public int   correctCount;       // items correct out of totalRequired
        public int   totalRequired;      // total items to get right

        // ── Timing ────────────────────────────────────────────────
        public float timeTaken;          // seconds elapsed (recall / reaction phase)
        public float timeLimit;          // configured time limit for this challenge

        // ── Errors & Help ─────────────────────────────────────────
        public int wrongAttempts;        // wrong clicks / false inputs
        public int hintsUsed;            // 0, 1, 2, or 3

        // ── Score (calculated by ScoringSystem) ───────────────────
        public int   rawScore;
        public float accuracyPercent;    // 0–100
        public float speedPercent;       // 0–100

        // ── Convenience ───────────────────────────────────────────
        public float Accuracy => totalRequired > 0
            ? (float)correctCount / totalRequired
            : (correct ? 1f : 0f);
    }
}
