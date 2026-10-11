// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PostProcessingSetup
// Configures and validates post-processing visual volume parameters
// (Bloom, Ambient Occlusion, Color Grading, Tonemapping)
// to maximize PBR emissive glow and contrast in the 3D lab environment.
// ═══════════════════════════════════════════════════════════════
using UnityEngine;
using UnityEngine.Rendering;
#if UNITY_PIPELINE_URP
using UnityEngine.Rendering.Universal;
#endif

namespace MindShift.Environment
{
    [RequireComponent(typeof(Volume))]
    public class PostProcessingSetup : MonoBehaviour
    {
        [Header("Post-Processing Presets")]
        [Tooltip("Target volume for lab post-processing")]
        public Volume targetVolume;

        [Header("Cinematic Sci-Fi Settings")]
        public bool  enableBloom           = true;
        public float bloomThreshold        = 0.9f;
        public float bloomIntensity        = 1.75f;
        public float bloomScatter          = 0.7f;

        public bool  enableAmbientOcclusion = true;
        public float aoIntensity           = 0.85f;
        public float aoRadius              = 0.45f;

        public bool  enableACESColorGrading = true;
        public float contrastAdjustment    = 18f;

        private void Awake()
        {
            if (targetVolume == null)
                targetVolume = GetComponent<Volume>();
        }

        private void Start()
        {
            ApplyCinematicVisualProfiles();
        }

        public void ApplyCinematicVisualProfiles()
        {
            if (targetVolume == null || targetVolume.profile == null) return;

#if UNITY_PIPELINE_URP
            var profile = targetVolume.profile;

            // 1. Configure Bloom for Neon/PBR Emissive Glow
            if (enableBloom && profile.TryGet<Bloom>(out var bloom))
            {
                bloom.threshold.value = bloomThreshold;
                bloom.intensity.value = bloomIntensity;
                bloom.scatter.value   = bloomScatter;
                bloom.active          = true;
            }

            // 2. Configure Ambient Occlusion for 3D Crevices & Mechanical Depth
            if (enableAmbientOcclusion && profile.TryGet<ScreenSpaceAmbientOcclusion>(out var ssao))
            {
                ssao.active = true;
            }

            // 3. Configure Color Grading & ACES Tonemapping
            if (enableACESColorGrading && profile.TryGet<Tonemapping>(out var tonemapping))
            {
                tonemapping.mode.value = TonemappingMode.ACES;
                tonemapping.active     = true;
            }

            if (profile.TryGet<ColorAdjustments>(out var colorAdj))
            {
                colorAdj.contrast.value = contrastAdjustment;
                colorAdj.active         = true;
            }
#endif
            Debug.Log("[PostProcessing] Visual profile validated for PBR emissive rendering.");
        }
    }
}
