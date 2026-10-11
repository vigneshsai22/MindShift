// ═══════════════════════════════════════════════════════════════
// MindShift 3D — ProgressionSystem + AchievementSystem
// XP, level-up, unlock management, and achievement checking.
// Achievement IDs match the 12-achievement list in the design doc.
// ═══════════════════════════════════════════════════════════════
using UnityEngine;
using MindShift.Challenges;
using MindShift.Core;
using MindShift.Profile;
using MindShift.Storage;
using MindShift.Audio;
using MindShift.Scoring;

namespace MindShift.Progression
{
    // ── Progression System ────────────────────────────────────────
    public class ProgressionSystem : Singleton<ProgressionSystem>
    {
        // XP thresholds per level: Level N requires N×500 total XP
        private const int XP_PER_LEVEL = 500;

        public void AwardXP(int xp)
        {
            var profile = GameManager.Instance?.ActiveProfile;
            if (profile == null) return;

            profile.xp += xp;

            int requiredXP = profile.level * XP_PER_LEVEL;
            if (profile.xp >= requiredXP && profile.level < 6)
            {
                profile.level++;
                Debug.Log($"[Progression] Level up! Now level {profile.level}");
                UI.UIManager.Instance?.ShowLevelUp(profile.level, GetLevelTitle(profile.level));
                AudioManager.Instance?.PlaySFX(SFXType.Achievement);
            }

            SaveLoadManager.Instance.SaveProfile(profile);
        }

        public static string GetLevelTitle(int level)
        {
            return level switch
            {
                1 => "Mind Explorer",
                2 => "Memory Seeker",
                3 => "Observation Specialist",
                4 => "Logic Thinker",
                5 => "Reaction Expert",
                6 => "Cognitive Master",
                _ => "Trainee"
            };
        }

        public int GetXPForLevel(int level) => level * XP_PER_LEVEL;
    }

    // ── Achievement System ────────────────────────────────────────
    public class AchievementSystem : Singleton<AchievementSystem>
    {
        // Achievement IDs — match design doc ACH_001..ACH_012
        public const string MEMORY_MASTER    = "ACH_001";
        public const string SHARP_OBSERVER   = "ACH_002";
        public const string LIGHTNING_MIND   = "ACH_003";
        public const string PERFECT_RUN      = "ACH_004";
        public const string LOGIC_EXPERT     = "ACH_005";
        public const string ADAPTIVE_MASTER  = "ACH_006";
        public const string SPATIAL_GENIUS   = "ACH_007";
        public const string AUDIOPHILE       = "ACH_008";
        public const string NO_HINTS_NEEDED  = "ACH_009";
        public const string COGNITIVE_MASTER = "ACH_010";
        public const string IMPROVING_MIND   = "ACH_011";
        public const string SPEED_DEMON      = "ACH_012";

        // ── Evaluates and unlocks achievements after a challenge ───
        public void CheckAchievements(ChallengeResult result)
        {
            var profile = GameManager.Instance?.ActiveProfile;
            if (profile == null) return;

            // ACH_001: Memory Master — 100% accuracy on memory challenge
            if (result.category == CognitiveCategory.Memory && result.Accuracy >= 1.0f)
                TryUnlock(profile, MEMORY_MASTER);

            // ACH_002: Sharp Observer — all anomalies, no false positives
            if (result.category == CognitiveCategory.Observation
                && result.Accuracy >= 1.0f && result.wrongAttempts == 0)
                TryUnlock(profile, SHARP_OBSERVER);

            // ACH_003: Lightning Mind — reaction avg < 400ms (timeTaken < 0.4s per round)
            if (result.category == CognitiveCategory.Reaction
                && result.timeTaken / Mathf.Max(1, result.totalRequired) < 0.4f)
                TryUnlock(profile, LIGHTNING_MIND);

            // ACH_004: Perfect Run — no hints used
            if (result.hintsUsed == 0 && result.correct)
                TryUnlock(profile, PERFECT_RUN);

            // ACH_005: Logic Expert — check via profile (3 hard logic challenges)
            // (Tracked separately by counting hard logic completions in profile)

            // ACH_007: Spatial Genius — aligned shape in < 10 seconds
            if (result.category == CognitiveCategory.Spatial
                && result.correct && result.timeTaken < 10f)
                TryUnlock(profile, SPATIAL_GENIUS);

            // ACH_008: Audiophile — perfect audio sequence
            if (result.category == CognitiveCategory.Audio && result.Accuracy >= 1.0f)
                TryUnlock(profile, AUDIOPHILE);

            // ACH_009: No Hints Needed — session-level, checked in OnSessionEnd
        }

        // ── Called at session end ─────────────────────────────────
        public void CheckSessionAchievements(int totalHints, float sessionPercentage)
        {
            var profile = GameManager.Instance?.ActiveProfile;
            if (profile == null) return;

            if (totalHints == 0)
                TryUnlock(profile, NO_HINTS_NEEDED);

            if (sessionPercentage >= 85f)
                TryUnlock(profile, COGNITIVE_MASTER);
        }

        // ── Unlock ────────────────────────────────────────────────
        private void TryUnlock(PlayerProfile profile, string id)
        {
            bool wasNew = !profile.achievements.Contains(id);
            SaveLoadManager.Instance.UnlockAchievement(profile, id);

            if (wasNew)
            {
                Debug.Log($"[Achievement] Unlocked: {id}");
                AudioManager.Instance?.PlaySFX(SFXType.Achievement);
                UI.UIManager.Instance?.ShowAchievementToast(id, GetAchievementName(id));
            }
        }

        public static string GetAchievementName(string id)
        {
            return id switch
            {
                MEMORY_MASTER    => "Memory Master",
                SHARP_OBSERVER   => "Sharp Observer",
                LIGHTNING_MIND   => "Lightning Mind",
                PERFECT_RUN      => "Perfect Run",
                LOGIC_EXPERT     => "Logic Expert",
                ADAPTIVE_MASTER  => "Adaptive Master",
                SPATIAL_GENIUS   => "Spatial Genius",
                AUDIOPHILE       => "Audiophile",
                NO_HINTS_NEEDED  => "No Hints Needed",
                COGNITIVE_MASTER => "Cognitive Master",
                IMPROVING_MIND   => "Improving Mind",
                SPEED_DEMON      => "Speed Demon",
                _ => id
            };
        }
    }
}
