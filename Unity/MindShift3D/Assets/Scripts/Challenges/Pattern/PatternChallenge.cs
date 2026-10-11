// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PatternChallenge
// Grid illuminates in a pattern → goes dark → player recreates it.
// Ported from PatternRecognition.js — grid generation, recall,
// color-coded result feedback.
// ═══════════════════════════════════════════════════════════════
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using TMPro;
using MindShift.Audio;

namespace MindShift.Challenges
{
    public class PatternChallenge : ChallengeBase
    {
        // ── Inspector ─────────────────────────────────────────────
        [Header("Pattern Lab References")]
        public List<PatternPanel> panels;      // must have ≥ 25 (5x5)
        public TextMeshProUGUI    statusText;
        public UnityEngine.UI.Button submitButton;

        // ── State ─────────────────────────────────────────────────
        private enum Phase { Show, Dark, Recall, Done }
        private Phase           _phase;
        private HashSet<int>    _litPattern   = new HashSet<int>();
        private HashSet<int>    _playerChoice = new HashSet<int>();
        private int             _gridSize;

        // ── Lifecycle ─────────────────────────────────────────────
        public override void SetupChallenge()
        {
            _litPattern.Clear();
            _playerChoice.Clear();
            _gridSize = Config.patternGridSize;

            DeactivateAllPanels();
            GeneratePattern();

            if (submitButton != null)
                submitButton.onClick.AddListener(SubmitAnswer);
        }

        public override void StartChallenge()
        {
            base.StartChallenge();
            StartCoroutine(ChallengeRoutine());
        }

        public override void TeardownChallenge()
        {
            StopAllCoroutines();
            DeactivateAllPanels();
            if (submitButton != null) submitButton.onClick.RemoveAllListeners();
        }

        // ── Routine ───────────────────────────────────────────────
        private IEnumerator ChallengeRoutine()
        {
            // SHOW phase
            _phase = Phase.Show;
            if (statusText != null) statusText.text = "Memorize the pattern…";

            foreach (int idx in _litPattern)
                if (idx < panels.Count) panels[idx].Illuminate(true);

            yield return new WaitForSeconds(Config.patternShowTime);

            // DARK phase
            _phase = Phase.Dark;
            foreach (var p in panels) p.Illuminate(false);
            AudioManager.Instance?.PlaySFX(SFXType.ObservationStart);
            yield return new WaitForSeconds(0.8f);

            // RECALL phase
            _phase = Phase.Recall;
            if (statusText != null) statusText.text = "Recreate the pattern!";
            SetPanelsInteractive(true);
        }

        // ── Pattern Generation ────────────────────────────────────
        // Mirrors _generatePattern() logic from PatternRecognition.js
        private void GeneratePattern()
        {
            int gridCount = _gridSize * _gridSize;
            int litCount  = Mathf.Min(Config.patternLitCount, gridCount);

            List<int> indices = new List<int>();
            for (int i = 0; i < gridCount; i++) indices.Add(i);

            // Shuffle
            for (int i = indices.Count - 1; i > 0; i--)
            {
                int j = Random.Range(0, i + 1);
                (indices[i], indices[j]) = (indices[j], indices[i]);
            }

            for (int i = 0; i < litCount; i++)
                _litPattern.Add(indices[i]);
        }

        // ── Panel Interaction ─────────────────────────────────────
        private void SetPanelsInteractive(bool on)
        {
            int gridCount = _gridSize * _gridSize;
            for (int i = 0; i < gridCount && i < panels.Count; i++)
                panels[i].SetInteractive(on, OnPanelToggled);
        }

        private void OnPanelToggled(int panelIndex, bool selected)
        {
            if (_phase != Phase.Recall || IsResolved) return;

            if (selected) _playerChoice.Add(panelIndex);
            else          _playerChoice.Remove(panelIndex);
        }

        // ── Evaluation ────────────────────────────────────────────
        public void SubmitAnswer()
        {
            if (_phase != Phase.Recall || IsResolved) return;
            SetPanelsInteractive(false);

            int correct = 0;
            int gridCount = _gridSize * _gridSize;

            for (int i = 0; i < gridCount && i < panels.Count; i++)
            {
                bool wasList = _litPattern.Contains(i);
                bool wasChosen = _playerChoice.Contains(i);

                if (wasList && wasChosen)
                {
                    panels[i].ShowResult(true);
                    correct++;
                }
                else if (!wasList && wasChosen)
                {
                    panels[i].ShowResult(false);
                    WrongAttempts++;
                }
                else if (wasList && !wasChosen)
                {
                    panels[i].ShowMissed();
                    WrongAttempts++;
                }
            }

            bool fullCorrect = correct == _litPattern.Count && WrongAttempts == 0;
            if (fullCorrect) RegisterCorrect();
            else             RegisterWrongAttempt();

            if (statusText != null)
                statusText.text = $"{correct}/{_litPattern.Count} correct";

            StartCoroutine(DelayedResolve(1.5f, fullCorrect, correct, _litPattern.Count));
        }

        protected override void OnTimeExpired()
        {
            if (_phase == Phase.Recall) SubmitAnswer();
            else Resolve(false);
        }

        // ── Helpers ───────────────────────────────────────────────
        private void DeactivateAllPanels()
        {
            foreach (var p in panels)
            {
                p.Illuminate(false);
                p.SetInteractive(false, null);
            }
        }

        private IEnumerator DelayedResolve(float delay, bool correct, int correctCount, int total)
        {
            yield return new WaitForSeconds(delay);
            Resolve(correct, correctCount, total);
        }
    }
}
