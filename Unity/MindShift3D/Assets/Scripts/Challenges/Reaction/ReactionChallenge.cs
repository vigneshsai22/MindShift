// ═══════════════════════════════════════════════════════════════
// MindShift 3D — ReactionChallenge
// Panels flash randomly. Click them within the time window.
// Ported from ReactionTime.js — false start, miss, and decoy logic.
// ═══════════════════════════════════════════════════════════════
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using MindShift.Audio;

namespace MindShift.Challenges
{
    public class ReactionChallenge : ChallengeBase
    {
        // ── Inspector ─────────────────────────────────────────────
        [Header("Reaction Lab References")]
        public List<ReactionPanel> panels;        // All panels in the lab (≥ 12 recommended)

        // ── Stats ─────────────────────────────────────────────────
        private int   _roundsTotal;
        private int   _roundsDone;
        private int   _hits;
        private int   _misses;
        private int   _decoyClicks;
        private float _totalReactionTime;
        private int   _reactionSamples;

        private List<ReactionPanel> _activePanels = new List<ReactionPanel>();
        private bool _roundRunning = false;

        // ── Lifecycle ─────────────────────────────────────────────
        public override void SetupChallenge()
        {
            _roundsDone      = 0;
            _hits            = 0;
            _misses          = 0;
            _decoyClicks     = 0;
            _totalReactionTime = 0f;
            _reactionSamples   = 0;
            _roundsTotal     = Config.reactionRounds;

            foreach (var p in panels)
            {
                p.Deactivate();
                p.OnCorrectHit  += OnPanelHit;
                p.OnDecoyHit    += OnDecoyHit;
                p.OnMiss        += OnPanelMiss;
            }
        }

        public override void StartChallenge()
        {
            base.StartChallenge();
            StartCoroutine(RoundRunner());
        }

        public override void TeardownChallenge()
        {
            StopAllCoroutines();
            foreach (var p in panels)
            {
                p.Deactivate();
                p.OnCorrectHit  -= OnPanelHit;
                p.OnDecoyHit    -= OnDecoyHit;
                p.OnMiss        -= OnPanelMiss;
            }
        }

        // ── Round Runner ──────────────────────────────────────────
        private IEnumerator RoundRunner()
        {
            while (_roundsDone < _roundsTotal && !IsResolved)
            {
                yield return new WaitForSeconds(Random.Range(0.4f, 1.0f));  // inter-round gap

                // Pick correct panels
                List<ReactionPanel> targets = PickRandom(panels, Config.reactionSimultaneous, excludeDecoy: true);

                // Pick decoy panels (wrong color)
                int decoysThisRound = Random.Range(0, Config.reactionDecoys > 0 ? 2 : 0);
                List<ReactionPanel> decoys = PickRandom(panels, decoysThisRound, exclude: targets, excludeDecoy: false);

                // Activate
                float flashTime = Config.reactionWindowSec;
                foreach (var p in targets) p.ActivateTarget(flashTime);
                foreach (var p in decoys)  p.ActivateDecoy(flashTime);

                _activePanels.Clear();
                _activePanels.AddRange(targets);
                _activePanels.AddRange(decoys);

                _roundRunning = true;
                yield return new WaitForSeconds(flashTime + 0.1f);

                // Count unclicked targets as misses
                foreach (var p in targets)
                    if (p.IsActive) { _misses++; p.Deactivate(); }

                _roundsDone++;
                _roundRunning = false;
            }

            // All rounds done — resolve
            float avgRT = _reactionSamples > 0 ? _totalReactionTime / _reactionSamples : Config.reactionWindowSec;
            bool success = _hits >= Mathf.CeilToInt(_roundsTotal * 0.5f);   // pass = hit ≥ 50%
            Resolve(success, _hits, _roundsTotal);
        }

        // ── Event Handlers ────────────────────────────────────────
        private void OnPanelHit(float reactionTime)
        {
            _hits++;
            _totalReactionTime += reactionTime;
            _reactionSamples++;
            AudioManager.Instance?.PlaySFX(SFXType.PanelHit);
        }

        private void OnDecoyHit()
        {
            _decoyClicks++;
            WrongAttempts++;
            AudioManager.Instance?.PlaySFX(SFXType.Wrong);
        }

        private void OnPanelMiss()
        {
            _misses++;
        }

        // ── Helpers ───────────────────────────────────────────────
        private List<ReactionPanel> PickRandom(
            List<ReactionPanel> source, int count,
            List<ReactionPanel> exclude = null,
            bool excludeDecoy = false)
        {
            var pool   = new List<ReactionPanel>(source);
            var result = new List<ReactionPanel>();
            if (exclude != null) pool.RemoveAll(p => exclude.Contains(p));

            for (int i = pool.Count - 1; i > 0; i--)
            {
                int j = Random.Range(0, i + 1);
                (pool[i], pool[j]) = (pool[j], pool[i]);
            }

            for (int i = 0; i < Mathf.Min(count, pool.Count); i++)
                result.Add(pool[i]);

            return result;
        }
    }
}
