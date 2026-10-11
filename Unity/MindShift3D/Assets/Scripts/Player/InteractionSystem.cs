// ═══════════════════════════════════════════════════════════════
// MindShift 3D — IInteractable & InteractionSystem
// Core interface for all physical 3D world interactables and
// UI reticle prompt controller.
// ═══════════════════════════════════════════════════════════════
using UnityEngine;
using UnityEngine.UI;

namespace MindShift.Interaction
{
    // ── Interface ─────────────────────────────────────────────────
    public interface IInteractable
    {
        /// <summary>HUD prompt text, e.g. "[E] Flip Switch" or "[Left Click] Rotate Shape"</summary>
        string InteractPrompt { get; }

        /// <summary>Called when the player's crosshair reticle begins aiming at this object</summary>
        void OnHoverEnter();

        /// <summary>Called when the player's crosshair reticle stops aiming at this object</summary>
        void OnHoverExit();

        /// <summary>Called when the player presses interact (E key or primary mouse button)</summary>
        void OnInteract(GameObject interactor);
    }

    // ── Interaction System Prompt UI Manager ──────────────────────
    public class InteractionSystem : Core.Singleton<InteractionSystem>
    {
        [Header("Reticle & Prompt UI")]
        public GameObject promptContainer;
        public Text       promptLabel;
        public Image      crosshairReticle;

        [Header("Crosshair Aesthetics")]
        public Color defaultCrosshairColor     = new Color(1f, 1f, 1f, 0.45f);
        public Color interactableCrosshairColor= new Color(0f, 1f, 0.75f, 0.95f);
        public float defaultReticleScale       = 1.0f;
        public float activeReticleScale        = 1.35f;

        // ─────────────────────────────────────────────────────────
        protected override void Awake()
        {
            base.Awake();
            ClearPrompt();
        }

        public void SetPrompt(string text)
        {
            if (promptContainer != null)
                promptContainer.SetActive(true);

            if (promptLabel != null)
                promptLabel.text = text;

            if (crosshairReticle != null)
            {
                crosshairReticle.color = interactableCrosshairColor;
                crosshairReticle.transform.localScale = Vector3.one * activeReticleScale;
            }
        }

        public void ClearPrompt()
        {
            if (promptContainer != null)
                promptContainer.SetActive(false);

            if (crosshairReticle != null)
            {
                crosshairReticle.color = defaultCrosshairColor;
                crosshairReticle.transform.localScale = Vector3.one * defaultReticleScale;
            }
        }
    }
}
