// ═══════════════════════════════════════════════════════════════
// MindShift 3D — HUDController
// Handles active in-challenge HUD: countdown timer bar, score,
// streak multiplier badge, challenge title & difficulty, hint button.
// ═══════════════════════════════════════════════════════════════
using UnityEngine;
using UnityEngine.UI;
using MindShift.Challenges;
using MindShift.Hints;
using MindShift.Core;

namespace MindShift.UI
{
    public class HUDController : MonoBehaviour
    {
        // ── Inspector References ──────────────────────────────────
        [Header("Challenge Info")]
        public Text   challengeTitleText;
        public Text   categoryBadgeText;
        public Text   difficultyBadgeText;
        public Image  difficultyBadgeBg;

        [Header("Timer")]
        public Slider timerSlider;
        public Image  timerFillImage;
        public Text   timerText;
        public Color  timerNormalColor  = new Color(0.2f, 0.8f, 1f);
        public Color  timerWarningColor = new Color(1f, 0.6f, 0.1f);
        public Color  timerCriticalColor = new Color(1f, 0.2f, 0.2f);

        [Header("Score & Streak")]
        public Text   scoreText;
        public Text   streakText;
        public GameObject streakContainer;

        [Header("Hint System")]
        public Button hintButton;
        public Text   hintButtonLabel;

        [Header("Pause")]
        public Button pauseButton;

        // ── Initialization ────────────────────────────────────────
        private void Awake()
        {
            if (hintButton != null)
                hintButton.onClick.AddListener(OnHintClicked);

            if (pauseButton != null)
                pauseButton.onClick.AddListener(OnPauseClicked);
        }

        // ── Configuration ─────────────────────────────────────────
        public void ConfigureHUD(ChallengeConfig config)
        {
            if (challengeTitleText != null)
                challengeTitleText.text = FormatChallengeName(config.type);

            if (categoryBadgeText != null)
                categoryBadgeText.text = config.category.ToString().ToUpper();

            if (difficultyBadgeText != null)
            {
                difficultyBadgeText.text = config.difficulty.ToString().ToUpper();
                Color diffColor = config.difficulty switch
                {
                    DifficultyLevel.Easy   => new Color(0.2f, 0.9f, 0.4f),
                    DifficultyLevel.Medium => new Color(1.0f, 0.75f, 0.2f),
                    DifficultyLevel.Hard   => new Color(1.0f, 0.25f, 0.35f),
                    _ => Color.white
                };

                difficultyBadgeText.color = diffColor;
                if (difficultyBadgeBg != null)
                    difficultyBadgeBg.color = new Color(diffColor.r, diffColor.g, diffColor.b, 0.25f);
            }

            UpdateHintButtonState();
        }

        // ── Real-Time Updates ─────────────────────────────────────
        public void UpdateTimer(float remaining, float total)
        {
            if (total <= 0f) return;

            float fraction = Mathf.Clamp01(remaining / total);

            if (timerSlider != null)
                timerSlider.value = fraction;

            if (timerText != null)
                timerText.text = $"{Mathf.CeilToInt(remaining)}s";

            if (timerFillImage != null)
            {
                if (fraction > 0.4f)
                    timerFillImage.color = timerNormalColor;
                else if (fraction > 0.2f)
                    timerFillImage.color = timerWarningColor;
                else
                    timerFillImage.color = timerCriticalColor;
            }
        }

        public void UpdateScore(int score, int streak)
        {
            if (scoreText != null)
                scoreText.text = $"{score:N0} PTS";

            if (streakContainer != null)
                streakContainer.SetActive(streak > 1);

            if (streakText != null && streak > 1)
                streakText.text = $"STREAK x{streak}";
        }

        public void UpdateHintButtonState()
        {
            if (hintButton == null) return;

            int used = HintSystem.Instance != null ? HintSystem.Instance.HintsUsedThisChallenge : 0;
            int max  = HintSystem.MAX_HINTS;
            int left = Mathf.Max(0, max - used);

            if (hintButtonLabel != null)
                hintButtonLabel.text = $"HINT ({left})";

            hintButton.interactable = (left > 0);
        }

        // ── Callbacks ─────────────────────────────────────────────
        private void OnHintClicked()
        {
            HintSystem.Instance?.RequestHint();
            UpdateHintButtonState();
        }

        private void OnPauseClicked()
        {
            GameManager.Instance?.PauseGame();
        }

        private string FormatChallengeName(ChallengeType type)
        {
            return type switch
            {
                ChallengeType.MemoryObjectRecall => "Memory Lab: Object Recall",
                ChallengeType.ObservationCCTV    => "Observation Lab: CCTV Scan",
                ChallengeType.LogicSwitch        => "Logic Lab: Circuit Overload",
                ChallengeType.ReactionTarget     => "Reaction Lab: Reflex Matrix",
                ChallengeType.SpatialRotation    => "Spatial Lab: Axis Alignment",
                ChallengeType.AudioSequence      => "Audio Lab: Acoustic Sequence",
                ChallengeType.PatternGrid        => "Pattern Lab: Neural Grid",
                _ => "Cognitive Challenge"
            };
        }
    }
}
