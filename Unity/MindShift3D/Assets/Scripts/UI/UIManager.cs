// ═══════════════════════════════════════════════════════════════
// MindShift 3D — UIManager
// Centralized UI orchestrator for canvas toggles, HUD, toasts,
// level up popups, pause menu, loading overlay, and results screen.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using MindShift.Core;
using MindShift.Challenges;
using MindShift.Audio;

namespace MindShift.UI
{
    public class UIManager : Singleton<UIManager>
    {
        // ── Inspector References ──────────────────────────────────
        [Header("Canvases & Root Panels")]
        public GameObject hudPanel;
        public GameObject pauseMenuPanel;
        public GameObject loadingOverlayPanel;
        public GameObject resultsPanel;
        public GameObject postChallengePanel;

        [Header("HUD Controller Reference")]
        public HUDController hudController;

        [Header("Results Controller Reference")]
        public ResultsUI resultsUI;

        [Header("Loading UI")]
        public Slider loadingProgressBar;
        public Text   loadingStatusText;

        [Header("Toasts & Modals")]
        public GameObject toastContainer;
        public Text       toastTitleText;
        public Text       toastDescriptionText;
        public float      toastDisplayDuration = 3.5f;

        [Header("Level Up Modal")]
        public GameObject levelUpModal;
        public Text       levelUpNumberText;
        public Text       levelUpTitleText;

        [Header("Hint Dialog")]
        public GameObject hintModal;
        public Text       hintBodyText;
        public Text       hintPenaltyText;
        public Text       hintCountText;

        [Header("Post-Challenge Summary Banner")]
        public Text postChallengeTitle;
        public Text postChallengeScore;
        public Text postChallengeTime;
        public Text postChallengeAccuracy;

        // ── State ─────────────────────────────────────────────────
        private Coroutine _toastCoroutine;
        private Coroutine _postChallengeCoroutine;

        // ─────────────────────────────────────────────────────────
        protected override void Awake()
        {
            base.Awake();
            InitializePanels();
        }

        private void InitializePanels()
        {
            if (hudPanel != null) hudPanel.SetActive(false);
            if (pauseMenuPanel != null) pauseMenuPanel.SetActive(false);
            if (loadingOverlayPanel != null) loadingOverlayPanel.SetActive(false);
            if (resultsPanel != null) resultsPanel.SetActive(false);
            if (postChallengePanel != null) postChallengePanel.SetActive(false);
            if (toastContainer != null) toastContainer.SetActive(false);
            if (levelUpModal != null) levelUpModal.SetActive(false);
            if (hintModal != null) hintModal.SetActive(false);
        }

        // ── HUD Operations ────────────────────────────────────────
        public void ShowChallengeHUD(bool show, ChallengeConfig config = null)
        {
            if (hudPanel != null)
                hudPanel.SetActive(show);

            if (show && hudController != null && config != null)
            {
                hudController.ConfigureHUD(config);
            }
        }

        public void UpdateTimerDisplay(float remainingSeconds, float totalSeconds)
        {
            if (hudController != null)
                hudController.UpdateTimer(remainingSeconds, totalSeconds);
        }

        public void UpdateScoreDisplay(int currentScore, int streak)
        {
            if (hudController != null)
                hudController.UpdateScore(currentScore, streak);
        }

        // ── Post Challenge Brief Overlay ──────────────────────────
        public void ShowPostChallenge(ChallengeResult result)
        {
            if (postChallengePanel == null) return;

            if (_postChallengeCoroutine != null)
                StopCoroutine(_postChallengeCoroutine);

            _postChallengeCoroutine = StartCoroutine(PostChallengeRoutine(result));
        }

        private IEnumerator PostChallengeRoutine(ChallengeResult result)
        {
            postChallengePanel.SetActive(true);

            if (postChallengeTitle != null)
                postChallengeTitle.text = result.correct ? "<color=#00FF99>CHALLENGE COMPLETED</color>" : "<color=#FF3366>CHALLENGE FAILED</color>";

            if (postChallengeScore != null)
                postChallengeScore.text = $"+{result.finalScore} PTS";

            if (postChallengeTime != null)
                postChallengeTime.text = $"Time: {result.timeTaken:F1}s";

            if (postChallengeAccuracy != null)
                postChallengeAccuracy.text = $"Accuracy: {(result.Accuracy * 100f):F0}%";

            yield return new WaitForSeconds(2.8f);

            postChallengePanel.SetActive(false);
        }

        // ── Pause Menu ────────────────────────────────────────────
        public void ShowPauseMenu(bool show)
        {
            if (pauseMenuPanel != null)
                pauseMenuPanel.SetActive(show);

            // Unlock/lock cursor accordingly
            Cursor.lockState = show ? CursorLockMode.None : CursorLockMode.Locked;
            Cursor.visible = show;
        }

        public void OnResumeClicked()
        {
            GameManager.Instance?.ResumeGame();
        }

        public void OnReturnToMainMenuClicked()
        {
            Time.timeScale = 1f;
            SceneLoader.Instance?.LoadScene(GameManager.SCENE_MAIN_MENU);
        }

        // ── Loading Screen ────────────────────────────────────────
        public void ShowLoadingScreen(bool show)
        {
            if (loadingOverlayPanel != null)
                loadingOverlayPanel.SetActive(show);

            if (show && loadingProgressBar != null)
                loadingProgressBar.value = 0f;
        }

        public void SetLoadingProgress(float progress)
        {
            if (loadingProgressBar != null)
                loadingProgressBar.value = progress;

            if (loadingStatusText != null)
                loadingStatusText.text = $"Loading Environment... {(progress * 100f):F0}%";
        }

        // ── Hints UI ──────────────────────────────────────────────
        public void ShowHint(string hintText, int penalty, int hintsUsed, int maxHints)
        {
            if (hintModal == null) return;

            hintModal.SetActive(true);

            if (hintBodyText != null)
                hintBodyText.text = hintText;

            if (hintPenaltyText != null)
                hintPenaltyText.text = $"Score Penalty: -{penalty} PTS";

            if (hintCountText != null)
                hintCountText.text = $"Hint {hintsUsed} of {maxHints}";
        }

        public void ShowHintUnavailable(string message)
        {
            ShowToast("HINT UNAVAILABLE", message);
        }

        public void DismissHint()
        {
            if (hintModal != null)
                hintModal.SetActive(false);
        }

        // ── Level Up Modal ────────────────────────────────────────
        public void ShowLevelUp(int level, string title)
        {
            if (levelUpModal == null) return;

            if (levelUpNumberText != null)
                levelUpNumberText.text = $"LEVEL {level}";

            if (levelUpTitleText != null)
                levelUpTitleText.text = title.ToUpper();

            levelUpModal.SetActive(true);
        }

        public void DismissLevelUp()
        {
            if (levelUpModal != null)
                levelUpModal.SetActive(false);
        }

        // ── Achievements & Notifications ──────────────────────────
        public void ShowAchievementToast(string id, string name)
        {
            ShowToast("ACHIEVEMENT UNLOCKED!", $"{name} ({id})");
        }

        public void ShowToast(string title, string description)
        {
            if (toastContainer == null) return;

            if (_toastCoroutine != null)
                StopCoroutine(_toastCoroutine);

            _toastCoroutine = StartCoroutine(ToastRoutine(title, description));
        }

        private IEnumerator ToastRoutine(string title, string desc)
        {
            toastContainer.SetActive(true);

            if (toastTitleText != null)
                toastTitleText.text = title;

            if (toastDescriptionText != null)
                toastDescriptionText.text = desc;

            yield return new WaitForSeconds(toastDisplayDuration);

            toastContainer.SetActive(false);
        }

        // ── Results Screen ────────────────────────────────────────
        public void ShowResultsScreen(bool show)
        {
            if (resultsPanel != null)
                resultsPanel.SetActive(show);

            Cursor.lockState = show ? CursorLockMode.None : CursorLockMode.Locked;
            Cursor.visible = show;

            if (show && resultsUI != null)
            {
                resultsUI.PopulateResults();
            }
        }
    }
}
