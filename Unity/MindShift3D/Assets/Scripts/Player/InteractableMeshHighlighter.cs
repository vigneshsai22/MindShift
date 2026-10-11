// ═══════════════════════════════════════════════════════════════
// MindShift 3D — InteractableMeshHighlighter
// Manages real-time PBR material emission glow and metallic highlights
// on physical 3D meshes when targeted by the First-Person raycast reticle.
// NO 2D UI CANVAS REQUIRED — Pure 3D shader/material manipulation.
// ═══════════════════════════════════════════════════════════════
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace MindShift.Interaction
{
    [RequireComponent(typeof(Collider))]
    public class InteractableMeshHighlighter : MonoBehaviour
    {
        // ── Inspector Settings ────────────────────────────────────
        [Header("Target Mesh Renderers")]
        [Tooltip("Renderers that will glow when reticle hovers over this object")]
        public List<Renderer> targetRenderers = new List<Renderer>();

        [Header("PBR Emissive Properties")]
        [ColorUsage(true, true)]
        public Color hoverGlowColor   = new Color(0f, 0.85f, 1f) * 1.5f; // HDR cyan emission
        [ColorUsage(true, true)]
        public Color interactPulseColor = new Color(0f, 1f, 0.5f) * 2.5f; // HDR green pulse
        public float glowTransitionSpeed = 10f;

        [Header("Optional Point Light")]
        public Light dynamicPointLight;
        public float baseLightIntensity  = 0f;
        public float hoverLightIntensity = 1.6f;

        // ── Material Instance Cache ───────────────────────────────
        private List<Material> _instancedMaterials = new List<Material>();
        private List<Color>    _originalEmissions  = new List<Color>();
        private Color          _currentTargetGlow;
        private Coroutine      _pulseCoroutine;

        // ─────────────────────────────────────────────────────────
        private void Awake()
        {
            if (targetRenderers.Count == 0)
            {
                var r = GetComponent<Renderer>();
                if (r != null) targetRenderers.Add(r);
            }

            // Clone materials and enable standard PBR emission keyword
            foreach (var rend in targetRenderers)
            {
                if (rend == null) continue;
                Material mat = rend.material; // creates local instance
                mat.EnableKeyword("_EMISSION");
                _instancedMaterials.Add(mat);

                Color orig = mat.HasProperty("_EmissionColor") ? mat.GetColor("_EmissionColor") : Color.black;
                _originalEmissions.Add(orig);
            }

            _currentTargetGlow = Color.black;

            if (dynamicPointLight != null)
                dynamicPointLight.intensity = baseLightIntensity;
        }

        private void Update()
        {
            // Smoothly lerp emission color on materials
            for (int i = 0; i < _instancedMaterials.Count; i++)
            {
                var mat = _instancedMaterials[i];
                if (mat == null) continue;

                Color currentColor = mat.GetColor("_EmissionColor");
                Color target = _currentTargetGlow != Color.black ? _currentTargetGlow : _originalEmissions[i];
                Color newColor = Color.Lerp(currentColor, target, Time.deltaTime * glowTransitionSpeed);

                mat.SetColor("_EmissionColor", newColor);
            }

            // Smoothly adjust point light if assigned
            if (dynamicPointLight != null)
            {
                float targetIntensity = (_currentTargetGlow != Color.black) ? hoverLightIntensity : baseLightIntensity;
                dynamicPointLight.intensity = Mathf.Lerp(dynamicPointLight.intensity, targetIntensity, Time.deltaTime * glowTransitionSpeed);
            }
        }

        public void SetHovered(bool isHovered)
        {
            if (_pulseCoroutine != null) return;
            _currentTargetGlow = isHovered ? hoverGlowColor : Color.black;
        }

        public void TriggerInteractionPulse()
        {
            if (_pulseCoroutine != null) StopCoroutine(_pulseCoroutine);
            _pulseCoroutine = StartCoroutine(PulseRoutine());
        }

        private IEnumerator PulseRoutine()
        {
            _currentTargetGlow = interactPulseColor;
            yield return new WaitForSeconds(0.25f);
            _currentTargetGlow = hoverGlowColor;
            _pulseCoroutine = null;
        }

        private void OnDestroy()
        {
            // Clean up instanced materials
            foreach (var mat in _instancedMaterials)
            {
                if (mat != null) Destroy(mat);
            }
        }
    }
}
