// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PhysicalConsoleButton
// Spring-loaded physical 3D button on consoles and desk stations.
// Physically depresses when clicked via raycast reticle.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections;
using UnityEngine;
using MindShift.Interaction;
using MindShift.Audio;

namespace MindShift.Challenges
{
    [RequireComponent(typeof(Collider))]
    public class PhysicalConsoleButton : MonoBehaviour, IInteractable
    {
        // ── Inspector Settings ────────────────────────────────────
        public Transform buttonCapTransform;
        public float     pressDepth     = 0.04f;
        public float     pressDuration  = 0.15f;
        public Renderer  buttonCapRenderer;

        [ColorUsage(true, true)]
        public Color defaultColor = new Color(0.2f, 0.6f, 1f) * 1.5f;

        // ── State ─────────────────────────────────────────────────
        private string  _prompt = "[E] Press Button";
        private Action  _onPressedCallback;
        private Vector3 _originalLocalPos;
        private bool    _isPressing = false;

        // ── IInteractable Implementation ──────────────────────────
        public string InteractPrompt => _prompt;

        public void OnHoverEnter()
        {
            if (buttonCapRenderer != null)
                buttonCapRenderer.material.SetColor("_EmissionColor", defaultColor * 1.8f);
        }

        public void OnHoverExit()
        {
            if (buttonCapRenderer != null)
                buttonCapRenderer.material.SetColor("_EmissionColor", defaultColor);
        }

        public void OnInteract(GameObject interactor)
        {
            if (_isPressing) return;
            StartCoroutine(PressRoutine());
        }

        public void Configure(string promptText, Action callback)
        {
            _prompt = $"[E] {promptText}";
            _onPressedCallback = callback;

            if (buttonCapTransform != null)
                _originalLocalPos = buttonCapTransform.localPosition;
            else
                _originalLocalPos = transform.localPosition;
        }

        private IEnumerator PressRoutine()
        {
            _isPressing = true;
            AudioManager.Instance?.PlaySFX(SFXType.PanelHit);

            Transform targetT = buttonCapTransform != null ? buttonCapTransform : transform;
            Vector3 downPos = _originalLocalPos - new Vector3(0, pressDepth, 0);

            // Depress
            float elapsed = 0f;
            while (elapsed < pressDuration)
            {
                elapsed += Time.deltaTime;
                targetT.localPosition = Vector3.Lerp(_originalLocalPos, downPos, elapsed / pressDuration);
                yield return null;
            }

            _onPressedCallback?.Invoke();

            // Spring back
            elapsed = 0f;
            while (elapsed < pressDuration)
            {
                elapsed += Time.deltaTime;
                targetT.localPosition = Vector3.Lerp(downPos, _originalLocalPos, elapsed / pressDuration);
                yield return null;
            }

            targetT.localPosition = _originalLocalPos;
            _isPressing = false;
        }
    }
}
