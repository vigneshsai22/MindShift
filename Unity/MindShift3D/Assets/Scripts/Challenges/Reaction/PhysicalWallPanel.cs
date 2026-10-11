// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PhysicalWallPanel
// 3D physical button/panel mounted on the room wall.
// Lights up dynamically with emissive PBR glow + point light.
// Player must swing camera, aim reticle, and press it before it expires.
// ═══════════════════════════════════════════════════════════════
using System;
using UnityEngine;
using MindShift.Interaction;
using MindShift.Audio;

namespace MindShift.Challenges
{
    [RequireComponent(typeof(Collider))]
    public class PhysicalWallPanel : MonoBehaviour, IInteractable
    {
        // ── Inspector Settings ────────────────────────────────────
        [Header("3D Visuals")]
        public Renderer panelMeshRenderer;
        public Light    panelPointLight;

        [Header("Emissive HDR Colors")]
        [ColorUsage(true, true)]
        public Color idleColor  = new Color(0.1f, 0.1f, 0.12f);
        [ColorUsage(true, true)]
        public Color activeTargetColor = new Color(0f, 1f, 0.5f) * 3.0f; // Neon green
        [ColorUsage(true, true)]
        public Color decoyColor        = new Color(1f, 0.1f, 0.1f) * 3.0f; // Neon red

        // ── State ─────────────────────────────────────────────────
        public bool IsActiveTarget { get; private set; } = false;
        public bool IsDecoy        { get; private set; } = false;
        private Action<PhysicalWallPanel, bool> _onPanelPressedCallback;

        // ── IInteractable Implementation ──────────────────────────
        public string InteractPrompt => IsActiveTarget ? "[E] Hit Target Panel!" : "";

        public void OnHoverEnter()
        {
            if (panelMeshRenderer != null && IsActiveTarget)
                panelMeshRenderer.transform.localScale = Vector3.one * 1.1f;
        }

        public void OnHoverExit()
        {
            if (panelMeshRenderer != null)
                panelMeshRenderer.transform.localScale = Vector3.one;
        }

        public void OnInteract(GameObject interactor)
        {
            if (!IsActiveTarget) return;

            bool hitCorrect = !IsDecoy;
            Deactivate();

            AudioManager.Instance?.PlaySFX(hitCorrect ? SFXType.PanelHit : SFXType.Wrong);
            _onPanelPressedCallback?.Invoke(this, hitCorrect);
        }

        // ── Activation API ────────────────────────────────────────
        public void Activate(bool isDecoy, Action<PhysicalWallPanel, bool> callback)
        {
            IsActiveTarget = true;
            IsDecoy = isDecoy;
            _onPanelPressedCallback = callback;

            Color glow = isDecoy ? decoyColor : activeTargetColor;
            SetVisualState(glow, 2.5f);

            AudioManager.Instance?.PlaySFX(SFXType.Tick);
        }

        public void Deactivate()
        {
            IsActiveTarget = false;
            IsDecoy = false;
            SetVisualState(idleColor, 0f);

            if (panelMeshRenderer != null)
                panelMeshRenderer.transform.localScale = Vector3.one;
        }

        private void SetVisualState(Color emissive, float lightIntensity)
        {
            if (panelMeshRenderer != null)
            {
                Material mat = panelMeshRenderer.material;
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", emissive);
            }

            if (panelPointLight != null)
            {
                panelPointLight.color = emissive;
                panelPointLight.intensity = lightIntensity;
            }
        }
    }
}
