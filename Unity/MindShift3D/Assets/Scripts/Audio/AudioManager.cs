// ═══════════════════════════════════════════════════════════════
// MindShift 3D — AudioManager
// Centralized BGM, SFX, voice, ambient, and one-shot clip playback.
// Mirrors AudioEngine.js — volume control, BGM switching,
// spatial audio concept, and category-based ambience.
// ═══════════════════════════════════════════════════════════════
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using MindShift.Challenges;
using MindShift.Core;
using MindShift.Scoring;

namespace MindShift.Audio
{
    public class AudioManager : Singleton<AudioManager>
    {
        // ── Inspector ─────────────────────────────────────────────
        [Header("Audio Sources")]
        public AudioSource bgmSource;
        public AudioSource sfxSource;
        public AudioSource voiceSource;
        public AudioSource ambienceSource;

        [Header("BGM Clips")]
        public AudioClip mainMenuBGM;
        public AudioClip lobbyBGM;
        public AudioClip memoryBGM;
        public AudioClip logicBGM;
        public AudioClip reactionBGM;
        public AudioClip resultsBGM;
        public AudioClip spatialBGM;

        [Header("SFX Clips")]
        public AudioClip correctSFX;
        public AudioClip wrongSFX;
        public AudioClip tickSFX;
        public AudioClip hintSFX;
        public AudioClip achievementSFX;
        public AudioClip doorOpenSFX;
        public AudioClip doorCloseSFX;
        public AudioClip panelHitSFX;
        public AudioClip shapeSnapSFX;
        public AudioClip switchFlipSFX;
        public AudioClip observeStartSFX;
        public AudioClip recallStartSFX;
        public AudioClip scanTagSFX;

        [Header("Ambience Clips")]
        public AudioClip lobbyAmbience;
        public AudioClip memoryAmbience;
        public AudioClip logicAmbience;
        public AudioClip reactionAmbience;

        [Header("Volume Settings")]
        [Range(0f, 1f)] public float masterVolume = 1f;
        [Range(0f, 1f)] public float bgmVolume    = 0.6f;
        [Range(0f, 1f)] public float sfxVolume    = 0.9f;
        [Range(0f, 1f)] public float voiceVolume  = 1.0f;

        // ─────────────────────────────────────────────────────────
        protected override void Awake()
        {
            base.Awake();
            LoadVolumeSettings();
        }

        // ── BGM ───────────────────────────────────────────────────
        public void PlayBGM(AudioClip clip)
        {
            if (bgmSource == null || clip == null) return;
            if (bgmSource.clip == clip && bgmSource.isPlaying) return;

            StartCoroutine(CrossfadeBGM(clip));
        }

        private IEnumerator CrossfadeBGM(AudioClip newClip)
        {
            float fadeDur = 1f;

            // Fade out
            if (bgmSource.isPlaying)
            {
                float startVol = bgmSource.volume;
                float t = 0f;
                while (t < fadeDur)
                {
                    t += Time.deltaTime;
                    bgmSource.volume = Mathf.Lerp(startVol, 0f, t / fadeDur);
                    yield return null;
                }
            }

            bgmSource.clip = newClip;
            bgmSource.loop = true;
            bgmSource.Play();

            // Fade in
            float t2 = 0f;
            while (t2 < fadeDur)
            {
                t2 += Time.deltaTime;
                bgmSource.volume = Mathf.Lerp(0f, bgmVolume * masterVolume, t2 / fadeDur);
                yield return null;
            }
        }

        // ── Lab Ambience ──────────────────────────────────────────
        // Mirrors per-lab audio from AudioEngine.js playLabBGM concept
        public void PlayLabAmbience(CognitiveCategory category)
        {
            AudioClip clip;
            switch (category)
            {
                case CognitiveCategory.Memory:      clip = memoryBGM;    break;
                case CognitiveCategory.Logic:       clip = logicBGM;     break;
                case CognitiveCategory.Reaction:    clip = reactionBGM;  break;
                case CognitiveCategory.Spatial:     clip = spatialBGM;   break;
                default:                            clip = lobbyBGM;     break;
            }
            PlayBGM(clip);
        }

        // ── SFX ───────────────────────────────────────────────────
        public void PlaySFX(SFXType type)
        {
            AudioClip clip = GetSFXClip(type);
            if (clip == null || sfxSource == null) return;
            sfxSource.volume = sfxVolume * masterVolume;
            sfxSource.PlayOneShot(clip);
        }

        private AudioClip GetSFXClip(SFXType type)
        {
            return type switch
            {
                SFXType.Correct          => correctSFX,
                SFXType.Wrong            => wrongSFX,
                SFXType.Tick             => tickSFX,
                SFXType.Hint             => hintSFX,
                SFXType.Achievement      => achievementSFX,
                SFXType.DoorOpen         => doorOpenSFX,
                SFXType.DoorClose        => doorCloseSFX,
                SFXType.PanelHit         => panelHitSFX,
                SFXType.ShapeSnap        => shapeSnapSFX,
                SFXType.SwitchFlip       => switchFlipSFX,
                SFXType.ObservationStart => observeStartSFX,
                SFXType.RecallStart      => recallStartSFX,
                SFXType.ScanTag          => scanTagSFX,
                _ => null
            };
        }

        // ── One-Shot Clip (for audio challenge tones) ─────────────
        public void PlayClipOneShot(AudioClip clip, float durationHint = 0f)
        {
            if (sfxSource == null || clip == null) return;
            sfxSource.volume = sfxVolume * masterVolume;
            sfxSource.PlayOneShot(clip);
        }

        // ── Voice ─────────────────────────────────────────────────
        public void PlayVoice(AudioClip clip)
        {
            if (voiceSource == null || clip == null) return;
            voiceSource.volume = voiceVolume * masterVolume;
            voiceSource.Stop();
            voiceSource.clip = clip;
            voiceSource.Play();
        }

        // ── Volume Control (mirrors AudioEngine.js setVolume) ─────
        public void SetMasterVolume(float v)
        {
            masterVolume = Mathf.Clamp01(v);
            ApplyVolumes();
            SaveVolumeSettings();
        }

        public void SetBGMVolume(float v)
        {
            bgmVolume = Mathf.Clamp01(v);
            if (bgmSource != null) bgmSource.volume = bgmVolume * masterVolume;
            SaveVolumeSettings();
        }

        public void SetSFXVolume(float v)
        {
            sfxVolume = Mathf.Clamp01(v);
            SaveVolumeSettings();
        }

        private void ApplyVolumes()
        {
            if (bgmSource    != null) bgmSource.volume    = bgmVolume    * masterVolume;
            if (ambienceSource != null) ambienceSource.volume = 0.4f    * masterVolume;
            if (voiceSource  != null) voiceSource.volume  = voiceVolume  * masterVolume;
        }

        // ── Persistence ───────────────────────────────────────────
        private void SaveVolumeSettings()
        {
            PlayerPrefs.SetFloat("MindShift_MasterVol", masterVolume);
            PlayerPrefs.SetFloat("MindShift_BGMVol",    bgmVolume);
            PlayerPrefs.SetFloat("MindShift_SFXVol",    sfxVolume);
        }

        private void LoadVolumeSettings()
        {
            masterVolume = PlayerPrefs.GetFloat("MindShift_MasterVol", 1f);
            bgmVolume    = PlayerPrefs.GetFloat("MindShift_BGMVol",    0.6f);
            sfxVolume    = PlayerPrefs.GetFloat("MindShift_SFXVol",    0.9f);
            ApplyVolumes();
        }
    }
}
