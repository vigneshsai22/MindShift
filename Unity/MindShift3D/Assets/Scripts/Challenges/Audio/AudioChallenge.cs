// ═══════════════════════════════════════════════════════════════
// MindShift 3D — AudioChallenge
// Listen to a procedural tone sequence → reproduce it on buttons.
// Ported directly from AudioChallenge.js — sequence gen, playback,
// visualizer, evaluation logic all preserved.
// ═══════════════════════════════════════════════════════════════
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MindShift.Audio;

namespace MindShift.Challenges
{
    public class AudioChallenge : ChallengeBase
    {
        // ── Note definitions (matches JS NOTE_NAMES) ──────────────
        public static readonly string[] NOTE_NAMES = { "C4","D4","E4","F4","G4","A4","B4","C5" };

        // ── Inspector ─────────────────────────────────────────────
        [Header("UI References")]
        public List<SoundButton>  soundButtons;     // 8 buttons, one per note
        public TextMeshProUGUI    statusText;
        public List<Image>        vizBars;           // one bar per note in sequence
        public List<Image>        progressDots;      // filled as player presses
        public Button             replayButton;
        public Button             submitButton;

        // ── Audio clips (assign in Inspector — C4 to C5) ─────────
        public AudioClip[] noteTones;               // [0]=C4 … [7]=C5

        // ── State ─────────────────────────────────────────────────
        private List<int> _sequence    = new List<int>();  // indices into NOTE_NAMES
        private List<int> _userInput   = new List<int>();
        private bool      _isListening = false;  // player can input

        // ── Lifecycle ─────────────────────────────────────────────
        public override void SetupChallenge()
        {
            _sequence.Clear();
            _userInput.Clear();
            _isListening = false;

            // Generate random sequence
            for (int i = 0; i < Config.audioSequenceLength; i++)
                _sequence.Add(Random.Range(0, NOTE_NAMES.Length));

            // Wire buttons
            foreach (var btn in soundButtons) btn.OnPressed += OnSoundButtonPressed;

            if (replayButton != null) replayButton.onClick.AddListener(OnReplayClicked);
            if (submitButton != null)  submitButton.onClick.AddListener(SubmitAnswer);

            SetButtonsInteractive(false);
            if (replayButton != null) replayButton.interactable = false;
            if (submitButton != null)  submitButton.interactable = false;

            UpdateProgressDots();
        }

        public override void StartChallenge()
        {
            base.StartChallenge();
            if (statusText != null) statusText.text = "🔊 Listen carefully…";
            StartCoroutine(PlaySequenceAndEnable());
        }

        public override void TeardownChallenge()
        {
            StopAllCoroutines();
            foreach (var btn in soundButtons) btn.OnPressed -= OnSoundButtonPressed;
            if (replayButton != null) replayButton.onClick.RemoveAllListeners();
            if (submitButton != null)  submitButton.onClick.RemoveAllListeners();
        }

        // ── Sequence Playback ─────────────────────────────────────
        // Directly mirrors _playSequence() from AudioChallenge.js
        private IEnumerator PlaySequenceAndEnable()
        {
            SetButtonsInteractive(false);
            if (replayButton != null) replayButton.interactable = false;

            float noteDur = Config.audioNoteDuration;
            float gap     = 0.12f;

            for (int i = 0; i < _sequence.Count; i++)
            {
                int noteIdx = _sequence[i];
                PlayTone(noteIdx, noteDur);
                FlashVizBar(i, true);
                yield return new WaitForSeconds(noteDur);
                FlashVizBar(i, false);
                yield return new WaitForSeconds(gap);
            }

            yield return new WaitForSeconds(0.3f);

            // Enable input (mirrors JS: phase = 'recall')
            _isListening = true;
            SetButtonsInteractive(true);
            if (replayButton != null) replayButton.interactable = true;
            if (statusText != null) statusText.text = "🎹 Reproduce the sequence!";
        }

        // ── Button Input ──────────────────────────────────────────
        // Mirrors _onKeyPress() from AudioChallenge.js
        private void OnSoundButtonPressed(int noteIndex)
        {
            if (!_isListening || IsResolved) return;
            if (_userInput.Count >= _sequence.Count) return;

            _userInput.Add(noteIndex);
            PlayTone(noteIndex, 0.4f);
            UpdateProgressDots();

            // Auto-submit when full (mirrors JS auto-submit after 400ms)
            if (_userInput.Count == _sequence.Count)
            {
                if (submitButton != null) submitButton.interactable = true;
                StartCoroutine(DelayedSubmit(0.4f));
            }
        }

        private IEnumerator DelayedSubmit(float delay)
        {
            yield return new WaitForSeconds(delay);
            if (!IsResolved) SubmitAnswer();
        }

        private void OnReplayClicked()
        {
            if (IsResolved) return;
            _userInput.Clear();
            UpdateProgressDots();
            _isListening = false;
            if (submitButton != null) submitButton.interactable = false;
            StartCoroutine(PlaySequenceAndEnable());
        }

        public void CheckPlayerSequence(List<int> playerInput)
        {
            _userInput = new List<int>(playerInput);
            _isListening = true;
            SubmitAnswer();
        }

        // ── Evaluation ────────────────────────────────────────────
        // Mirrors _evaluate() from AudioChallenge.js
        public void SubmitAnswer()
        {
            if (IsResolved) return;
            _isListening = false;
            SetButtonsInteractive(false);

            int correct = 0;
            for (int i = 0; i < _sequence.Count; i++)
            {
                bool posCorrect = i < _userInput.Count && _userInput[i] == _sequence[i];
                if (posCorrect) correct++;
                else            WrongAttempts++;

                // Color feedback on buttons
                if (i < _userInput.Count)
                    soundButtons[_userInput[i]]?.ShowFeedback(posCorrect);
            }

            bool fullCorrect = correct == _sequence.Count;

            if (statusText != null)
                statusText.text = fullCorrect
                    ? "✅ Perfect sequence!"
                    : $"Correct order: {SequenceToString(_sequence)}";

            if (fullCorrect) RegisterCorrect();
            else             RegisterWrongAttempt();

            StartCoroutine(DelayedResolve(1.2f, fullCorrect, correct, _sequence.Count));
        }

        protected override void OnTimeExpired()
        {
            if (!IsResolved) SubmitAnswer();
        }

        // ── Helpers ───────────────────────────────────────────────
        private void PlayTone(int noteIndex, float duration)
        {
            if (noteTones != null && noteIndex < noteTones.Length && noteTones[noteIndex] != null)
                AudioManager.Instance?.PlayClipOneShot(noteTones[noteIndex], duration);
        }

        private void FlashVizBar(int idx, bool lit)
        {
            if (vizBars == null || idx >= vizBars.Count || vizBars[idx] == null) return;
            vizBars[idx].color = lit
                ? new Color(0.5f, 0.2f, 1.0f)
                : new Color(0.5f, 0.2f, 1.0f, 0.2f);
        }

        private void UpdateProgressDots()
        {
            for (int i = 0; i < progressDots.Count; i++)
            {
                if (progressDots[i] == null) continue;
                progressDots[i].color = i < _userInput.Count
                    ? new Color(0.5f, 0.2f, 1.0f)
                    : new Color(1f, 1f, 1f, 0.15f);
            }
        }

        private void SetButtonsInteractive(bool on)
        {
            foreach (var btn in soundButtons)
                if (btn != null) btn.SetInteractive(on);
        }

        private string SequenceToString(List<int> seq)
        {
            var parts = new List<string>();
            foreach (int i in seq) parts.Add(NOTE_NAMES[i]);
            return string.Join(" → ", parts);
        }

        private IEnumerator DelayedResolve(float delay, bool correct, int correctCount, int total)
        {
            yield return new WaitForSeconds(delay);
            Resolve(correct, correctCount, total);
        }
    }
}
