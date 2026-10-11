// ═══════════════════════════════════════════════════════════════
// MindShift 3D — ChallengeManager
// Orchestrates which challenge runs next. Receives results and
// pipes them to AdaptiveDifficultyEngine + AnalyticsManager.
// ═══════════════════════════════════════════════════════════════
using System.Collections.Generic;
using UnityEngine;
using MindShift.Core;
using MindShift.Adaptive;
using MindShift.Analytics;
using MindShift.Scoring;
using MindShift.Progression;
using MindShift.UI;

namespace MindShift.Challenges
{
    public class ChallengeManager : Singleton<ChallengeManager>
    {
        // ── Inspector ─────────────────────────────────────────────
        [Header("Challenge Prefabs — assign in Inspector")]
        public MemoryChallenge    memoryPrefab;
        public ObservationChallenge observationPrefab;
        public LogicChallenge     logicPrefab;
        public ReactionChallenge  reactionPrefab;
        public SpatialChallenge   spatialPrefab;
        public AudioChallenge     audioPrefab;
        public PatternChallenge   patternPrefab;

        [Header("Challenge Spawn Point")]
        public Transform challengeSpawnParent;

        // ── State ─────────────────────────────────────────────────
        private ChallengeBase _activeChallenge;

        // Default lab order (can be randomised for the Final Lab)
        private readonly List<ChallengeType> _labSequence = new List<ChallengeType>
        {
            ChallengeType.MemoryObjectRecall,
            ChallengeType.CCTVAnomalyHunt,
            ChallengeType.MechanismLogicPuzzle,
            ChallengeType.PanelFlashReaction,
            ChallengeType.ShapeAlignment3D,
            ChallengeType.AudioSequence
        };

        private int _currentLabIndex = 0;

        // ── Public API ────────────────────────────────────────────

        /// <summary>Starts the challenge for the current lab.</summary>
        public void StartCurrentLabChallenge()
        {
            if (_currentLabIndex >= _labSequence.Count)
            {
                Debug.Log("[ChallengeManager] All labs complete. Transitioning to Results.");
                GameManager.Instance.TransitionTo(GameState.Results);
                return;
            }

            ChallengeType type = _labSequence[_currentLabIndex];
            LaunchChallenge(type);
        }

        /// <summary>Directly launch any challenge type (used by lab door triggers).</summary>
        public void LaunchChallenge(ChallengeType type)
        {
            DifficultyLevel diff = AdaptiveDifficultyEngine.Instance.GetDifficulty(
                ChallengeConfigFactory.GetCategory(type)
            );

            ChallengeConfig config = ChallengeConfigFactory.Build(type, diff);
            SpawnChallenge(type, config);
        }

        // ── Spawning ──────────────────────────────────────────────
        private void SpawnChallenge(ChallengeType type, ChallengeConfig config)
        {
            // Destroy any existing challenge
            if (_activeChallenge != null)
            {
                Destroy(_activeChallenge.gameObject);
                _activeChallenge = null;
            }

            ChallengeBase prefab = GetPrefab(type);
            if (prefab == null)
            {
                Debug.LogError($"[ChallengeManager] No prefab found for {type}");
                return;
            }

            _activeChallenge = Instantiate(prefab, challengeSpawnParent);
            _activeChallenge.Config = config;
            _activeChallenge.OnChallengeComplete += OnChallengeComplete;

            // Lock player movement during challenge
            FindObjectOfType<Player.PlayerController>()?.LockMovement(true);

            UIManager.Instance?.ShowChallengeHUD(true, config);
            _activeChallenge.SetupChallenge();
            _activeChallenge.StartChallenge();

            GameManager.Instance.TransitionTo(GameState.InChallenge);
        }

        // ── Result Handling ───────────────────────────────────────
        private void OnChallengeComplete(ChallengeResult result)
        {
            Debug.Log($"[ChallengeManager] {result.type} complete | Score: {result.rawScore} | Correct: {result.correct}");

            // 1. Update adaptive engine
            AdaptiveDifficultyEngine.Instance.UpdatePerformance(result);

            // 2. Record in analytics
            AnalyticsManager.Instance.RecordChallenge(result);

            // 3. Award XP + check achievements
            ProgressionSystem.Instance.AwardXP(result.rawScore / 10);
            AchievementSystem.Instance.CheckAchievements(result);

            // 4. Show post-challenge screen
            UIManager.Instance?.ShowPostChallenge(result);

            // 5. Restore player control
            FindObjectOfType<Player.PlayerController>()?.LockMovement(false);

            _currentLabIndex++;
            GameManager.Instance.TransitionTo(GameState.PostChallenge);
        }

        // ── Helpers ───────────────────────────────────────────────
        private ChallengeBase GetPrefab(ChallengeType type)
        {
            switch (type)
            {
                case ChallengeType.MemoryObjectRecall:   return memoryPrefab;
                case ChallengeType.CCTVAnomalyHunt:      return observationPrefab;
                case ChallengeType.MechanismLogicPuzzle: return logicPrefab;
                case ChallengeType.PanelFlashReaction:   return reactionPrefab;
                case ChallengeType.ShapeAlignment3D:     return spatialPrefab;
                case ChallengeType.AudioSequence:        return audioPrefab;
                case ChallengeType.PatternLock:          return patternPrefab;
                default: return null;
            }
        }

        public void ResetLabProgress() => _currentLabIndex = 0;
    }
}
