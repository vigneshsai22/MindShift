// ═══════════════════════════════════════════════════════════════
// MindShift 3D — ChallengeConfig + ChallengeConfigFactory
// Data container for per-challenge parameters driven by difficulty.
// Factory builds the correct config from type + difficulty level.
// ═══════════════════════════════════════════════════════════════
using System;
using UnityEngine;

namespace MindShift.Challenges
{
    // ── Config Data Class ─────────────────────────────────────────
    [Serializable]
    public class ChallengeConfig
    {
        public ChallengeType     type;
        public CognitiveCategory category;
        public DifficultyLevel   difficulty;
        public float             timeLimit;      // seconds for the active phase

        // Memory
        public int   memoryObjectCount;          // 3 / 5 / 7
        public int   memoryChangeCount;          // 1 / 2 / 3
        public float memoryObservationTime;      // 10 / 7 / 4 seconds

        // Reaction
        public float reactionWindowSec;          // 2.0 / 1.5 / 1.0
        public int   reactionSimultaneous;       // 1 / 2 / 3 panels at once
        public int   reactionDecoys;             // 0 / 2 / 5
        public int   reactionRounds;             // 10 / 15 / 20

        // Logic
        public int   logicSwitchCount;           // 3 / 5 / 7
        public int   logicRuleCount;             // 2 / 4 / 6
        public int   logicRuleComplexity;        // 0=simple 1=conditional 2=compound

        // Observation / CCTV
        public int   observationAnomalyCount;    // 3 / 5 / 7
        public string cctvVideoClip;             // resource path or filename

        // Spatial
        public int   spatialRotationAxes;        // 1 / 2 / 3
        public int   spatialPieceCount;          // 1 / 1 / 2-3

        // Audio
        public int   audioSequenceLength;        // 4 / 6 / 8
        public float audioNoteDuration;          // 0.6 / 0.5 / 0.4

        // Pattern
        public int   patternGridSize;            // 3 / 4 / 5
        public int   patternLitCount;            // 4 / 6 / 9
        public float patternShowTime;            // 3.0 / 2.5 / 2.0
    }

    // ── Factory ───────────────────────────────────────────────────
    public static class ChallengeConfigFactory
    {
        public static ChallengeConfig Build(ChallengeType type, DifficultyLevel diff)
        {
            var cfg = new ChallengeConfig
            {
                type       = type,
                category   = GetCategory(type),
                difficulty = diff
            };

            switch (type)
            {
                case ChallengeType.MemoryObjectRecall:
                    BuildMemory(cfg, diff); break;
                case ChallengeType.CCTVAnomalyHunt:
                    BuildObservation(cfg, diff); break;
                case ChallengeType.MechanismLogicPuzzle:
                    BuildLogic(cfg, diff); break;
                case ChallengeType.PanelFlashReaction:
                    BuildReaction(cfg, diff); break;
                case ChallengeType.ShapeAlignment3D:
                    BuildSpatial(cfg, diff); break;
                case ChallengeType.AudioSequence:
                    BuildAudio(cfg, diff); break;
                case ChallengeType.PatternLock:
                    BuildPattern(cfg, diff); break;
            }

            return cfg;
        }

        // ── Per-type builders ─────────────────────────────────────
        private static void BuildMemory(ChallengeConfig c, DifficultyLevel d)
        {
            c.timeLimit = 60f;
            switch (d)
            {
                case DifficultyLevel.Easy:
                    c.memoryObjectCount      = 3; c.memoryChangeCount = 1;
                    c.memoryObservationTime  = 10f; break;
                case DifficultyLevel.Medium:
                    c.memoryObjectCount      = 5; c.memoryChangeCount = 2;
                    c.memoryObservationTime  = 7f; break;
                case DifficultyLevel.Hard:
                    c.memoryObjectCount      = 7; c.memoryChangeCount = 3;
                    c.memoryObservationTime  = 4f; break;
            }
        }

        private static void BuildObservation(ChallengeConfig c, DifficultyLevel d)
        {
            c.timeLimit = 90f;
            switch (d)
            {
                case DifficultyLevel.Easy:
                    c.observationAnomalyCount = 3;
                    c.cctvVideoClip = "CCTV_Easy"; break;
                case DifficultyLevel.Medium:
                    c.observationAnomalyCount = 5;
                    c.cctvVideoClip = "CCTV_Medium"; break;
                case DifficultyLevel.Hard:
                    c.observationAnomalyCount = 7;
                    c.cctvVideoClip = "CCTV_Hard"; break;
            }
        }

        private static void BuildLogic(ChallengeConfig c, DifficultyLevel d)
        {
            c.timeLimit = 120f;
            switch (d)
            {
                case DifficultyLevel.Easy:
                    c.logicSwitchCount = 3; c.logicRuleCount = 2;
                    c.logicRuleComplexity = 0; break;
                case DifficultyLevel.Medium:
                    c.logicSwitchCount = 5; c.logicRuleCount = 4;
                    c.logicRuleComplexity = 1; break;
                case DifficultyLevel.Hard:
                    c.logicSwitchCount = 7; c.logicRuleCount = 6;
                    c.logicRuleComplexity = 2; break;
            }
        }

        private static void BuildReaction(ChallengeConfig c, DifficultyLevel d)
        {
            c.timeLimit = 60f;
            switch (d)
            {
                case DifficultyLevel.Easy:
                    c.reactionWindowSec = 2.0f; c.reactionSimultaneous = 1;
                    c.reactionDecoys = 0; c.reactionRounds = 10; break;
                case DifficultyLevel.Medium:
                    c.reactionWindowSec = 1.5f; c.reactionSimultaneous = 2;
                    c.reactionDecoys = 2; c.reactionRounds = 15; break;
                case DifficultyLevel.Hard:
                    c.reactionWindowSec = 1.0f; c.reactionSimultaneous = 3;
                    c.reactionDecoys = 5; c.reactionRounds = 20; break;
            }
        }

        private static void BuildSpatial(ChallengeConfig c, DifficultyLevel d)
        {
            c.timeLimit = 60f;
            switch (d)
            {
                case DifficultyLevel.Easy:
                    c.spatialRotationAxes = 1; c.spatialPieceCount = 1; break;
                case DifficultyLevel.Medium:
                    c.spatialRotationAxes = 2; c.spatialPieceCount = 1; break;
                case DifficultyLevel.Hard:
                    c.spatialRotationAxes = 3; c.spatialPieceCount = 2; break;
            }
        }

        private static void BuildAudio(ChallengeConfig c, DifficultyLevel d)
        {
            c.timeLimit = 60f;
            switch (d)
            {
                case DifficultyLevel.Easy:
                    c.audioSequenceLength = 4; c.audioNoteDuration = 0.6f; break;
                case DifficultyLevel.Medium:
                    c.audioSequenceLength = 6; c.audioNoteDuration = 0.5f; break;
                case DifficultyLevel.Hard:
                    c.audioSequenceLength = 8; c.audioNoteDuration = 0.4f; break;
            }
        }

        private static void BuildPattern(ChallengeConfig c, DifficultyLevel d)
        {
            c.timeLimit = 60f;
            switch (d)
            {
                case DifficultyLevel.Easy:
                    c.patternGridSize = 3; c.patternLitCount = 4; c.patternShowTime = 3.0f; break;
                case DifficultyLevel.Medium:
                    c.patternGridSize = 4; c.patternLitCount = 6; c.patternShowTime = 2.5f; break;
                case DifficultyLevel.Hard:
                    c.patternGridSize = 5; c.patternLitCount = 9; c.patternShowTime = 2.0f; break;
            }
        }

        // ── Helper ────────────────────────────────────────────────
        public static CognitiveCategory GetCategory(ChallengeType type)
        {
            switch (type)
            {
                case ChallengeType.MemoryObjectRecall:  return CognitiveCategory.Memory;
                case ChallengeType.CCTVAnomalyHunt:     return CognitiveCategory.Observation;
                case ChallengeType.MechanismLogicPuzzle:return CognitiveCategory.Logic;
                case ChallengeType.PanelFlashReaction:  return CognitiveCategory.Reaction;
                case ChallengeType.ShapeAlignment3D:    return CognitiveCategory.Spatial;
                case ChallengeType.AudioSequence:       return CognitiveCategory.Audio;
                case ChallengeType.PatternLock:         return CognitiveCategory.Pattern;
                default:                                return CognitiveCategory.Memory;
            }
        }
    }
}
