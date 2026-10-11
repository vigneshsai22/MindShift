// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PhysicalWallReactionMatrix
// 3D Reaction Assessment.
// Physical wall panels placed across the walls of the 3D room light up.
// Player must physically swing the camera, aim the reticle at the glowing
// 3D wall object, and press it before the light turns off.
// ABSOLUTELY ZERO 2D CANVAS WINDOWS.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using MindShift.Audio;

namespace MindShift.Challenges
{
    public class PhysicalWallReactionMatrix : ChallengeBase
    {
        // ── Inspector References ──────────────────────────────────
        [Header("3D Wall Panels")]
        [Tooltip("Panels positioned on the walls around the entire room (including behind/above)")]
        public List<PhysicalWallPanel> wallPanels = new List<PhysicalWallPanel>();

        [Header("Reaction Timing")]
        public float defaultTargetWindow = 1.8f; // seconds active
        public float delayBetweenRounds  = 0.8f;
        public int   totalRounds         = 10;

        // ── Round State ───────────────────────────────────────────
        private int   _currentRound    = 0;
        private int   _hits            = 0;
        private int   _misses          = 0;
        private float _roundStartTime  = 0f;
        private List<float> _reactionTimes = new List<float>();
        private Coroutine   _reactionLoopCoroutine;

        // ── Lifecycle ─────────────────────────────────────────────
        public override void SetupChallenge()
        {
            _currentRound = 0;
            _hits = 0;
            _misses = 0;
            _reactionTimes.Clear();

            foreach (var panel in wallPanels)
            {
                panel.Deactivate();
            }
        }

        public override void StartChallenge()
        {
            base.StartChallenge();
            _reactionLoopCoroutine = StartCoroutine(ReactionGameLoop());
        }

        public override void TeardownChallenge()
        {
            if (_reactionLoopCoroutine != null)
                StopCoroutine(_reactionLoopCoroutine);

            foreach (var panel in wallPanels)
                panel.Deactivate();
        }

        // ── 3D Reaction Loop ──────────────────────────────────────
        private IEnumerator ReactionGameLoop()
        {
            yield return new WaitForSeconds(1.0f);

            int roundsToPlay = Config != null && Config.reactionRounds > 0 ? Config.reactionRounds : totalRounds;
            float window = Config != null && Config.reactionWindowSec > 0 ? Config.reactionWindowSec : defaultTargetWindow;

            while (_currentRound < roundsToPlay && !IsResolved)
            {
                _currentRound++;

                // Pick a random panel from the room
                if (wallPanels.Count == 0) yield break;
                int targetIndex = UnityEngine.Random.Range(0, wallPanels.Count);
                PhysicalWallPanel activePanel = wallPanels[targetIndex];

                bool roundHandled = false;
                _roundStartTime = Time.time;

                activePanel.Activate(false, (p, hitCorrect) =>
                {
                    if (roundHandled) return;
                    roundHandled = true;

                    float rt = Time.time - _roundStartTime;
                    _reactionTimes.Add(rt);

                    if (hitCorrect)
                    {
                        _hits++;
                    }
                    else
                    {
                        _misses++;
                    }
                });

                // Wait for player to hit or window timeout
                float elapsed = 0f;
                while (elapsed < window && !roundHandled)
                {
                    elapsed += Time.deltaTime;
                    yield return null;
                }

                if (!roundHandled)
                {
                    // Timeout miss
                    roundHandled = true;
                    activePanel.Deactivate();
                    _misses++;
                    AudioManager.Instance?.PlaySFX(SFXType.Wrong);
                }

                yield return new WaitForSeconds(delayBetweenRounds);
            }

            // Challenge Finished
            bool passed = _hits >= (roundsToPlay * 0.65f);
            Resolve(passed);
        }
    }
}
