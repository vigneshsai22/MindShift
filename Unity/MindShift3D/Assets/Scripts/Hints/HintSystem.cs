// ═══════════════════════════════════════════════════════════════
// MindShift 3D — HintSystem
// Progressive 3-level hint system with score penalties.
// Integrates with ChallengeBase and UIManager.
// ═══════════════════════════════════════════════════════════════
using UnityEngine;
using MindShift.Challenges;
using MindShift.Core;
using MindShift.Audio;
using MindShift.Scoring;

namespace MindShift.Hints
{
    public class HintSystem : Singleton<HintSystem>
    {
        // ── Constants ─────────────────────────────────────────────
        public const int MAX_HINTS = 3;

        private static readonly int[] BASE_PENALTIES = { 50, 100, 150 };

        // ── State ─────────────────────────────────────────────────
        public  int    HintsUsedThisChallenge { get; private set; }
        private ChallengeConfig _currentConfig;
        private ChallengeBase   _currentChallenge;

        // ── Setup ─────────────────────────────────────────────────
        public void ResetForChallenge(ChallengeConfig config)
        {
            HintsUsedThisChallenge = 0;
            _currentConfig = config;
        }

        public void SetCurrentChallenge(ChallengeBase challenge)
        {
            _currentChallenge = challenge;
        }

        // ── Request Hint ──────────────────────────────────────────
        public bool RequestHint()
        {
            if (HintsUsedThisChallenge >= MAX_HINTS)
            {
                UI.UIManager.Instance?.ShowHintUnavailable("No more hints available.");
                return false;
            }

            int level = HintsUsedThisChallenge + 1;    // 1, 2, or 3
            int penalty = CalculatePenalty(level, _currentConfig?.difficulty ?? DifficultyLevel.Medium);

            HintsUsedThisChallenge++;
            AudioManager.Instance?.PlaySFX(SFXType.Hint);

            string hintText = GetHintText(level);
            UI.UIManager.Instance?.ShowHint(hintText, penalty, HintsUsedThisChallenge, MAX_HINTS);

            Debug.Log($"[HintSystem] Hint {level} used. Penalty: {penalty} pts.");
            return true;
        }

        // ── Hint Text Per Challenge Type ──────────────────────────
        // Maps to the 3-level hint descriptions from the design document
        private string GetHintText(int level)
        {
            if (_currentConfig == null) return "No hint available.";

            switch (_currentConfig.type)
            {
                case ChallengeType.MemoryObjectRecall:
                    return level switch
                    {
                        1 => "Hint: Focus on the left side of the table.",
                        2 => "Hint: One object has changed its color.",
                        3 => "Hint: The changed objects are now highlighted briefly.",
                        _ => ""
                    };

                case ChallengeType.MechanismLogicPuzzle:
                    return level switch
                    {
                        1 => "Hint: Some switches conflict with the current rules.",
                        2 => "Hint: Switches 1 and 2 are already correctly set.",
                        3 => "Hint: The highlighted switch is incorrect.",
                        _ => ""
                    };

                case ChallengeType.PanelFlashReaction:
                    return level switch
                    {
                        1 => "Hint: Focus on the green-glowing panels.",
                        2 => "Hint: Ignore orange/red panels — those are decoys.",
                        3 => "Hint: Only 1 panel is active at a time now.",
                        _ => ""
                    };

                case ChallengeType.AudioSequence:
                    return level switch
                    {
                        1 => "Hint: The sequence starts with a high note.",
                        2 => "Hint: First two notes replayed for you.",
                        3 => "Hint: Full sequence replayed slowly.",
                        _ => ""
                    };

                case ChallengeType.ShapeAlignment3D:
                    return level switch
                    {
                        1 => "Hint: Try rotating on the Y axis first.",
                        2 => "Hint: The shape needs a 90-degree turn.",
                        3 => "Hint: Alignment guide activated.",
                        _ => ""
                    };

                case ChallengeType.CCTVAnomalyHunt:
                    return level switch
                    {
                        1 => "Hint: Look near the entrance area.",
                        2 => "Hint: One anomaly is on the floor.",
                        3 => "Hint: Anomaly locations briefly highlighted.",
                        _ => ""
                    };

                case ChallengeType.PatternLock:
                    return level switch
                    {
                        1 => "Hint: The pattern has symmetry.",
                        2 => "Hint: Check the corners of the grid.",
                        3 => "Hint: Pattern replayed once more.",
                        _ => ""
                    };

                default: return $"Hint {level}: Look carefully at the task.";
            }
        }

        // ── Penalty Calculation ────────────────────────────────────
        // Penalty scales with difficulty level
        // Mirrors the hint penalty design: Easy×0.7, Medium×1.0, Hard×1.3
        private int CalculatePenalty(int hintLevel, DifficultyLevel diff)
        {
            int basePenalty = BASE_PENALTIES[hintLevel - 1];
            float multiplier = diff switch
            {
                DifficultyLevel.Easy   => 0.7f,
                DifficultyLevel.Medium => 1.0f,
                DifficultyLevel.Hard   => 1.3f,
                _ => 1.0f
            };
            return Mathf.RoundToInt(basePenalty * multiplier);
        }
    }
}
