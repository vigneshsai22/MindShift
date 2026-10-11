// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PhysicalMonitorDisplay
// Physical 3D desk monitor playing CCTV video clips on a 3D Render Texture.
// NO 2D CANVAS POPUPS — pure in-world 3D screen display.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Video;
using MindShift.Audio;

namespace MindShift.Challenges
{
    [RequireComponent(typeof(VideoPlayer))]
    public class PhysicalMonitorDisplay : MonoBehaviour
    {
        // ── Inspector References ──────────────────────────────────
        [Header("Physical Monitor Screen")]
        public Renderer     screenMeshRenderer;
        public RenderTexture cctvRenderTexture;
        public Light        screenGlowLight;

        [Header("Video Player")]
        public VideoPlayer  videoPlayer;
        public VideoClip    cctvFootageClip;

        [Header("Screen PBR Materials")]
        [ColorUsage(true, true)]
        public Color screenActiveEmission   = Color.white * 1.2f;
        public Color screenOffEmission      = Color.black;

        // ── State ─────────────────────────────────────────────────
        private Action _onPlaybackComplete;

        // ─────────────────────────────────────────────────────────
        private void Awake()
        {
            if (videoPlayer == null) videoPlayer = GetComponent<VideoPlayer>();

            // Configure video player for direct 3D Render Texture output
            videoPlayer.renderMode = VideoRenderMode.RenderTexture;
            videoPlayer.targetTexture = cctvRenderTexture;
            videoPlayer.loopPointReached += OnVideoFinished;

            if (screenMeshRenderer != null && cctvRenderTexture != null)
            {
                Material mat = screenMeshRenderer.material;
                mat.mainTexture = cctvRenderTexture;
                mat.EnableKeyword("_EMISSION");
                mat.SetTexture("_EmissionMap", cctvRenderTexture);
            }

            TurnScreenOff();
        }

        public void PlayFootage(VideoClip clip = null, Action onComplete = null)
        {
            _onPlaybackComplete = onComplete;

            if (clip != null)
                videoPlayer.clip = clip;
            else if (cctvFootageClip != null)
                videoPlayer.clip = cctvFootageClip;

            StartCoroutine(BootAndPlayRoutine());
        }

        private IEnumerator BootAndPlayRoutine()
        {
            // CRT Flicker boot sequence
            AudioManager.Instance?.PlaySFX(SFXType.PanelFlash);
            TurnScreenOn(0.4f);
            yield return new WaitForSeconds(0.08f);
            TurnScreenOff();
            yield return new WaitForSeconds(0.05f);
            TurnScreenOn(1.5f);

            videoPlayer.Play();
        }

        private void OnVideoFinished(VideoPlayer source)
        {
            Debug.Log("[MonitorDisplay] CCTV Footage Finished.");
            _onPlaybackComplete?.Invoke();
        }

        public void TurnScreenOn(float lightIntensity)
        {
            if (screenMeshRenderer != null)
                screenMeshRenderer.material.SetColor("_EmissionColor", screenActiveEmission);

            if (screenGlowLight != null)
            {
                screenGlowLight.intensity = lightIntensity;
                screenGlowLight.enabled = true;
            }
        }

        public void TurnScreenOff()
        {
            if (screenMeshRenderer != null)
                screenMeshRenderer.material.SetColor("_EmissionColor", screenOffEmission);

            if (screenGlowLight != null)
                screenGlowLight.enabled = false;
        }
    }
}
