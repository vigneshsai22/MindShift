// ═══════════════════════════════════════════════════════════════
// MindShift 3D — ChallengeBase (abstract)
// All challenge MonoBehaviours inherit from this.
// Mirrors the lifecycle, timer, and resolve pattern from
// the 2D JS ChallengeBase.js — ported to C# / Unity.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections;
using UnityEngine;
using MindShift.Audio;
using MindShift.Hints;
using MindShift.Scoring;

namespace MindShift.Challenges
{
    public abstract class ChallengeBase : MonoBehaviour
    {
        // ── Config (set by ChallengeManager before StartChallenge) ─
        public ChallengeConfig Config { get; set; }

        // ── Events ────────────────────────────────────────────────
        public event Action<ChallengeResult> OnChallengeComplete;
        public event Action<float>           OnTimerTick;   // remaining seconds

        // ── State ─────────────────────────────────────────────────
        protected bool  IsResolved   { get; private set; }
        protected bool  IsRunning    { get; private set; }
        protected float StartTime    { get; private set; }

        protected int   WrongAttempts { get; private set; }
        protected int   HintsUsed    => HintSystem.Instance?.HintsUsedThisChallenge ?? 0;

        // ── Timer ─────────────────────────────────────────────────
        private Coroutine _timerRoutine;
        private float     _timeRemaining;

        // ─────────────────────────────────────────────────────────
        // LIFECYCLE — override in subclasses
        // ─────────────────────────────────────────────────────────

        /// <summary>Called once to set up the environment (spawn objects, etc.).</summary>
        public virtual void SetupChallenge() { }

        /// <summary>Called to begin gameplay. Starts timer.</summary>
        public virtual void StartChallenge()
        {
            IsResolved = false;
            IsRunning  = true;
            StartTime  = Time.time;
            WrongAttempts = 0;

            HintSystem.Instance?.ResetForChallenge(Config);

            _timeRemaining = Config.timeLimit;
            _timerRoutine = StartCoroutine(TimerRoutine());

            AudioManager.Instance?.PlayLabAmbience(Config.category);
        }

        /// <summary>Called when player provides wrong input. Increments counter.</summary>
        protected void RegisterWrongAttempt()
        {
            WrongAttempts++;
            AudioManager.Instance?.PlaySFX(SFXType.Wrong);
        }

        /// <summary>Called when player is correct.</summary>
        protected void RegisterCorrect()
        {
            AudioManager.Instance?.PlaySFX(SFXType.Correct);
        }

        /// <summary>Override to clean up objects when challenge ends.</summary>
        public virtual void TeardownChallenge() { }

        // ─────────────────────────────────────────────────────────
        // RESOLVE — call this from subclass when done
        // ─────────────────────────────────────────────────────────

        /// <param name="correct">Was the challenge completed successfully?</param>
        /// <param name="correctCount">Items correct (default = 1 for binary challenges).</param>
        /// <param name="totalRequired">Total items needed (default = 1 for binary).</param>
        protected void Resolve(bool correct, int correctCount = -1, int totalRequired = -1)
        {
            if (IsResolved) return;
            IsResolved = true;
            IsRunning  = false;

            StopTimer();
            float timeTaken = Time.time - StartTime;

            // Normalise correctCount for binary challenges
            if (correctCount  < 0) correctCount  = correct ? 1 : 0;
            if (totalRequired < 0) totalRequired = 1;

            // Build result
            var result = new ChallengeResult
            {
                type          = Config.type,
                category      = Config.category,
                difficulty    = Config.difficulty,
                correct       = correct,
                correctCount  = correctCount,
                totalRequired = totalRequired,
                timeTaken     = timeTaken,
                timeLimit     = Config.timeLimit,
                wrongAttempts = WrongAttempts,
                hintsUsed     = HintsUsed
            };

            // Calculate score
            result.rawScore        = ScoringSystem.Instance.CalculateScore(result);
            result.accuracyPercent = result.Accuracy * 100f;
            result.speedPercent    = Mathf.Clamp01(1f - (timeTaken / Config.timeLimit)) * 100f;

            TeardownChallenge();
            OnChallengeComplete?.Invoke(result);
        }

        // ─────────────────────────────────────────────────────────
        // TIMER
        // ─────────────────────────────────────────────────────────
        private IEnumerator TimerRoutine()
        {
            while (_timeRemaining > 0f && !IsResolved)
            {
                yield return new WaitForSeconds(1f);
                _timeRemaining -= 1f;
                OnTimerTick?.Invoke(_timeRemaining);

                if (_timeRemaining <= 5f && _timeRemaining > 0f)
                    AudioManager.Instance?.PlaySFX(SFXType.Tick);

                if (_timeRemaining <= 0f && !IsResolved)
                    OnTimeExpired();
            }
        }

        /// <summary>Override to handle timer expiry differently per challenge.</summary>
        protected virtual void OnTimeExpired()
        {
            Resolve(false);
        }

        protected void StopTimer()
        {
            if (_timerRoutine != null)
            {
                StopCoroutine(_timerRoutine);
                _timerRoutine = null;
            }
        }

        protected float GetTimeRemaining() => _timeRemaining;
    }
}
