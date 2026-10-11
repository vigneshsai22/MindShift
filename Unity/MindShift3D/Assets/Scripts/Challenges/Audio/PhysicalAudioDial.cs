// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PhysicalAudioDial
// 3D rotary dial on the acoustic desk console.
// Player turns dial to cycle acoustic frequencies / sequence steps.
// ═══════════════════════════════════════════════════════════════
using System;
using UnityEngine;
using MindShift.Interaction;
using MindShift.Audio;

namespace MindShift.Challenges
{
    [RequireComponent(typeof(Collider))]
    public class PhysicalAudioDial : MonoBehaviour, IInteractable
    {
        // ── Inspector Settings ────────────────────────────────────
        public int       dialIndex = 0;
        public Transform rotatableKnob;
        public int       totalSteps = 6;
        public float     stepAngle  = 45f;
        public AudioSource dialToneSource;
        public AudioClip   stepToneClip;

        [Header("Status LED")]
        public Renderer ledRenderer;
        [ColorUsage(true, true)]
        public Color ledColor = new Color(0f, 0.8f, 1f) * 2f;

        // ── State ─────────────────────────────────────────────────
        public int CurrentStep { get; private set; } = 0;
        private Action<int, int> _onDialChanged;

        // ── IInteractable Implementation ──────────────────────────
        public string InteractPrompt => $"[E] Turn Audio Dial #{dialIndex + 1} (Tone {CurrentStep + 1}/{totalSteps})";

        public void OnHoverEnter()
        {
            if (ledRenderer != null)
                ledRenderer.material.SetColor("_EmissionColor", ledColor * 1.5f);
        }

        public void OnHoverExit()
        {
            if (ledRenderer != null)
                ledRenderer.material.SetColor("_EmissionColor", ledColor * 0.5f);
        }

        public void OnInteract(GameObject interactor)
        {
            AdvanceStep();
        }

        public void Configure(int index, Action<int, int> onStepChanged)
        {
            dialIndex = index;
            _onDialChanged = onStepChanged;
            CurrentStep = 0;
            UpdateRotation();
        }

        public void AdvanceStep()
        {
            CurrentStep = (CurrentStep + 1) % totalSteps;
            UpdateRotation();

            // Play acoustic tone for this step
            if (dialToneSource != null && stepToneClip != null)
            {
                dialToneSource.pitch = 0.8f + (CurrentStep * 0.15f); // vary pitch per step
                dialToneSource.PlayOneShot(stepToneClip);
            }

            _onDialChanged?.Invoke(dialIndex, CurrentStep);
        }

        private void UpdateRotation()
        {
            if (rotatableKnob != null)
            {
                rotatableKnob.localRotation = Quaternion.Euler(0, CurrentStep * stepAngle, 0);
            }
        }
    }
}
