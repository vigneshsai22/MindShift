// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PhysicalLogicDial
// A 3D physical rotary dial / mechanical lever on the Logic Lab console.
// Connects player raycast interaction directly to the Logic circuit engine.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections;
using UnityEngine;
using MindShift.Interaction;
using MindShift.Audio;

namespace MindShift.Challenges
{
    [RequireComponent(typeof(Collider))]
    public class PhysicalLogicDial : MonoBehaviour, IInteractable
    {
        // ── Inspector Settings ────────────────────────────────────
        [Header("Dial Configuration")]
        public int switchId = 0;
        public Transform rotatableKnob;
        public float offAngle = -45f;
        public float onAngle  =  45f;
        public float turnDuration = 0.25f;

        [Header("Illuminated Conduits")]
        public Renderer wireConduitRenderer;
        public Light    statusLight;
        public Color    poweredColor   = new Color(0f, 1f, 0.4f);
        public Color    unpoweredColor = new Color(0.2f, 0.2f, 0.25f);

        // ── State ─────────────────────────────────────────────────
        public bool IsOn { get; private set; } = false;
        private bool _isAnimating = false;
        private Action<int, bool> _onToggledCallback;

        // ── IInteractable Implementation ──────────────────────────
        public string InteractPrompt => $"[E] Rotate Terminal Dial #{switchId + 1} ({(IsOn ? "ON" : "OFF")})";

        public void OnHoverEnter()
        {
            if (statusLight != null)
                statusLight.intensity = 1.8f;
        }

        public void OnHoverExit()
        {
            if (statusLight != null)
                statusLight.intensity = 1.0f;
        }

        public void OnInteract(GameObject interactor)
        {
            if (_isAnimating) return;
            ToggleDial();
        }

        // ── Setup API ─────────────────────────────────────────────
        public void Initialize(int id, bool initialState, Action<int, bool> callback)
        {
            switchId = id;
            _onToggledCallback = callback;
            SetStateInstant(initialState);
        }

        public void ToggleDial()
        {
            SetState(!IsOn, true);
            _onToggledCallback?.Invoke(switchId, IsOn);
        }

        public void SetState(bool state, bool animate = true)
        {
            IsOn = state;
            if (animate)
            {
                StartCoroutine(RotateKnobRoutine(state ? onAngle : offAngle));
            }
            else
            {
                SetStateInstant(state);
            }

            UpdateConduitVisuals();
            AudioManager.Instance?.PlaySFX(SFXType.SwitchFlip);
        }

        private void SetStateInstant(bool state)
        {
            IsOn = state;
            if (rotatableKnob != null)
                rotatableKnob.localRotation = Quaternion.Euler(0, state ? onAngle : offAngle, 0);

            UpdateConduitVisuals();
        }

        private IEnumerator RotateKnobRoutine(float targetYAngle)
        {
            _isAnimating = true;
            Quaternion startRot = rotatableKnob != null ? rotatableKnob.localRotation : Quaternion.identity;
            Quaternion endRot   = Quaternion.Euler(0, targetYAngle, 0);

            float elapsed = 0f;
            while (elapsed < turnDuration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.SmoothStep(0f, 1f, elapsed / turnDuration);

                if (rotatableKnob != null)
                    rotatableKnob.localRotation = Quaternion.Slerp(startRot, endRot, t);

                yield return null;
            }

            if (rotatableKnob != null)
                rotatableKnob.localRotation = endRot;

            _isAnimating = false;
        }

        private void UpdateConduitVisuals()
        {
            Color targetColor = IsOn ? poweredColor : unpoweredColor;

            if (statusLight != null)
                statusLight.color = targetColor;

            if (wireConduitRenderer != null)
            {
                Material mat = wireConduitRenderer.material;
                mat.color = targetColor;
                mat.SetColor("_EmissionColor", targetColor * (IsOn ? 1.5f : 0.2f));
            }
        }
    }
}
