// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PhysicalMemoryProp
// 3D physical object placed on laboratory pedestals for the Memory Lab.
// Responds to physical raycast selection during the Recall phase.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections;
using UnityEngine;
using MindShift.Interaction;
using MindShift.Audio;

namespace MindShift.Challenges
{
    [RequireComponent(typeof(Collider))]
    public class PhysicalMemoryProp : MonoBehaviour, IInteractable
    {
        // ── Inspector Settings ────────────────────────────────────
        [Header("Prop Identity")]
        public int pedestalIndex = 0;
        public Renderer propRenderer;
        public Light    spotLight;

        [Header("Visual Feedback Colors")]
        public Color hoverGlowColor   = new Color(0.2f, 0.9f, 1f);
        public Color correctGlowColor = new Color(0.1f, 1.0f, 0.3f);
        public Color wrongGlowColor   = new Color(1.0f, 0.2f, 0.2f);

        // ── State ─────────────────────────────────────────────────
        private bool _isInteractableNow = false;
        private bool _isAltered         = false;
        private bool _isResolved        = false;
        private Color _originalColor;
        private Action<int, bool> _onPropSelected;

        // ── IInteractable Implementation ──────────────────────────
        public string InteractPrompt => _isInteractableNow && !_isResolved
            ? "[E] Identify as Modified Object"
            : "";

        public void OnHoverEnter()
        {
            if (!_isInteractableNow || _isResolved) return;
            Highlight(hoverGlowColor, 1.5f);
        }

        public void OnHoverExit()
        {
            if (!_isInteractableNow || _isResolved) return;
            ResetHighlight();
        }

        public void OnInteract(GameObject interactor)
        {
            if (!_isInteractableNow || _isResolved) return;

            _isResolved = true;

            if (_isAltered)
            {
                // Correct identification!
                StartCoroutine(FeedbackPulseRoutine(correctGlowColor, true));
                AudioManager.Instance?.PlaySFX(SFXType.Correct);
                _onPropSelected?.Invoke(pedestalIndex, true);
            }
            else
            {
                // False alarm / incorrect
                StartCoroutine(FeedbackPulseRoutine(wrongGlowColor, false));
                AudioManager.Instance?.PlaySFX(SFXType.Wrong);
                _onPropSelected?.Invoke(pedestalIndex, false);
            }
        }

        // ── Setup API ─────────────────────────────────────────────
        public void Configure(int index, bool altered, Action<int, bool> onSelectedCallback)
        {
            pedestalIndex = index;
            _isAltered = altered;
            _isResolved = false;
            _onPropSelected = onSelectedCallback;

            if (propRenderer != null)
                _originalColor = propRenderer.material.color;
        }

        public void SetInteractable(bool active)
        {
            _isInteractableNow = active;
            if (!active) ResetHighlight();
        }

        public void ApplyAlteredAppearance(Color alteredColor, Vector3 positionOffset)
        {
            _isAltered = true;
            transform.localPosition += positionOffset;

            if (propRenderer != null)
            {
                propRenderer.material.color = alteredColor;
                _originalColor = alteredColor;
            }
        }

        private void Highlight(Color col, float lightBoost)
        {
            if (propRenderer != null)
                propRenderer.material.SetColor("_EmissionColor", col * 1.2f);

            if (spotLight != null)
                spotLight.intensity = lightBoost;
        }

        private void ResetHighlight()
        {
            if (propRenderer != null)
                propRenderer.material.SetColor("_EmissionColor", Color.black);

            if (spotLight != null)
                spotLight.intensity = 1.0f;
        }

        private IEnumerator FeedbackPulseRoutine(Color feedbackColor, bool correct)
        {
            Highlight(feedbackColor, 2.5f);
            yield return new WaitForSeconds(0.6f);
            Highlight(correct ? correctGlowColor : Color.black, 1.0f);
        }
    }
}
