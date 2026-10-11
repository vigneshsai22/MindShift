// ═══════════════════════════════════════════════════════════════
// MindShift 3D — VideoManager
// Manages video playback (cinematics, ARIA briefings, and CCTV footage
// for the Observation Lab) via Unity VideoPlayer and RawImage / RenderTextures.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Video;
using UnityEngine.UI;
using MindShift.Core;

namespace MindShift.Media
{
    [RequireComponent(typeof(VideoPlayer))]
    public class VideoManager : Singleton<VideoManager>
    {
        // ── Inspector References ──────────────────────────────────
        [Header("Components")]
        public VideoPlayer videoPlayer;
        public RawImage    targetDisplay;
        public GameObject  videoScreenContainer;

        [Header("Subtitles")]
        public Text       subtitleText;
        public GameObject subtitlePanel;

        [Header("Controls")]
        public Button skipButton;

        [Header("Pre-configured Clips")]
        public VideoClip introCinematic;
        public VideoClip cctvObservationEasy;
        public VideoClip cctvObservationMedium;
        public VideoClip cctvObservationHard;
        public VideoClip resultsOutro;

        // ── Events ────────────────────────────────────────────────
        public event Action OnPlaybackStarted;
        public event Action OnPlaybackFinished;

        // ── State ─────────────────────────────────────────────────
        private Action _activeCallback;

        // ─────────────────────────────────────────────────────────
        protected override void Awake()
        {
            base.Awake();
            if (videoPlayer == null)
                videoPlayer = GetComponent<VideoPlayer>();

            videoPlayer.loopPointReached += OnVideoLoopPointReached;

            if (skipButton != null)
                skipButton.onClick.AddListener(SkipVideo);

            HideVideo();
        }

        // ── Playback API ──────────────────────────────────────────
        public void PlayVideo(VideoClip clip, Action onComplete = null, string initialSubtitle = "")
        {
            if (clip == null)
            {
                Debug.LogWarning("[VideoManager] Requested clip is null. Invoking callback immediately.");
                onComplete?.Invoke();
                return;
            }

            _activeCallback = onComplete;

            if (videoScreenContainer != null)
                videoScreenContainer.SetActive(true);

            if (targetDisplay != null)
                targetDisplay.enabled = true;

            SetSubtitle(initialSubtitle);

            videoPlayer.clip = clip;
            videoPlayer.Play();

            OnPlaybackStarted?.Invoke();
        }

        public void PlayObservationCCTV(int difficulty, Action onComplete = null)
        {
            VideoClip clip = difficulty switch
            {
                0 => cctvObservationEasy,
                1 => cctvObservationMedium,
                _ => cctvObservationHard
            };

            PlayVideo(clip, onComplete, "Analyzing CCTV surveillance feed for security anomalies...");
        }

        public void SkipVideo()
        {
            if (videoPlayer.isPlaying)
            {
                videoPlayer.Stop();
                OnVideoFinished();
            }
        }

        public void StopVideo()
        {
            videoPlayer.Stop();
            HideVideo();
        }

        // ── Callbacks ─────────────────────────────────────────────
        private void OnVideoLoopPointReached(VideoPlayer source)
        {
            OnVideoFinished();
        }

        private void OnVideoFinished()
        {
            HideVideo();
            OnPlaybackFinished?.Invoke();

            var cb = _activeCallback;
            _activeCallback = null;
            cb?.Invoke();
        }

        private void HideVideo()
        {
            if (videoScreenContainer != null)
                videoScreenContainer.SetActive(false);

            if (subtitlePanel != null)
                subtitlePanel.SetActive(false);
        }

        public void SetSubtitle(string text)
        {
            if (subtitlePanel == null || subtitleText == null) return;

            bool hasText = !string.IsNullOrEmpty(text);
            subtitlePanel.SetActive(hasText);
            subtitleText.text = text;
        }
    }
}
