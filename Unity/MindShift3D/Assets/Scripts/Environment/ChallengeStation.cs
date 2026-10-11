// ═══════════════════════════════════════════════════════════════
// MindShift 3D — ChallengeStation
// Physical world terminal/console where a challenge takes place.
// Coordinates camera focus transition, physical station activation,
// and decouples challenge start/end from 2D canvas popups.
// ═══════════════════════════════════════════════════════════════
using UnityEngine;
using MindShift.Challenges;
using MindShift.Interaction;
using MindShift.Player;
using MindShift.Audio;

namespace MindShift.Environment
{
    [RequireComponent(typeof(Collider))]
    public class ChallengeStation : MonoBehaviour, IInteractable
    {
        // ── Inspector References ──────────────────────────────────
        [Header("Station Identity")]
        public string stationName = "Memory Calibration Pedestal";
        public ChallengeBase challengeInstance;

        [Header("Camera Focus Anchor")]
        [Tooltip("Transform where the camera will position and orient itself during testing")]
        public Transform stationCameraAnchor;

        [Header("Physical Visual Feedback")]
        public Light     stationSpotlight;
        public Renderer  consoleScreenRenderer;
        public Color     activeConsoleColor = new Color(0f, 0.9f, 1f);
        public Color     idleConsoleColor   = new Color(0.2f, 0.4f, 0.5f);

        [Header("State")]
        public bool isStationActive = false;

        // ── IInteractable Implementation ──────────────────────────
        public string InteractPrompt => isStationActive 
            ? "Station Active..." 
            : $"[E] Begin {stationName}";

        public void OnHoverEnter()
        {
            if (isStationActive) return;
            if (stationSpotlight != null) stationSpotlight.intensity = 1.8f;
        }

        public void OnHoverExit()
        {
            if (isStationActive) return;
            if (stationSpotlight != null) stationSpotlight.intensity = 1.0f;
        }

        public void OnInteract(GameObject interactor)
        {
            if (isStationActive) return;
            ActivateStation();
        }

        // ── Station Activation ────────────────────────────────────
        public void ActivateStation()
        {
            isStationActive = true;
            AudioManager.Instance?.PlaySFX(SFXType.DoorOpen);

            UpdateConsoleVisual(activeConsoleColor);

            // 1. Transition camera to station perspective
            if (CameraFocusController.Instance != null && stationCameraAnchor != null)
            {
                CameraFocusController.Instance.FocusOnStation(stationCameraAnchor, () =>
                {
                    // 2. Start physical challenge after camera is locked in place
                    StartChallengeAtStation();
                });
            }
            else
            {
                StartChallengeAtStation();
            }
        }

        private void StartChallengeAtStation()
        {
            if (challengeInstance != null)
            {
                // Subscribe to completion
                challengeInstance.OnChallengeComplete += OnChallengeFinished;
                challengeInstance.SetupChallenge();
                challengeInstance.StartChallenge();
            }
        }

        private void OnChallengeFinished(ChallengeResult result)
        {
            if (challengeInstance != null)
                challengeInstance.OnChallengeComplete -= OnChallengeFinished;

            // Give player 2.5 seconds to observe final physical state
            Invoke(nameof(DeactivateStation), 2.2f);
        }

        public void DeactivateStation()
        {
            UpdateConsoleVisual(idleConsoleColor);

            // Release camera back to first-person walking
            if (CameraFocusController.Instance != null)
            {
                CameraFocusController.Instance.ReleaseFocus(() =>
                {
                    isStationActive = false;
                });
            }
            else
            {
                isStationActive = false;
            }
        }

        private void UpdateConsoleVisual(Color col)
        {
            if (consoleScreenRenderer != null)
            {
                Material mat = consoleScreenRenderer.material;
                mat.color = col;
                mat.SetColor("_EmissionColor", col * 1.3f);
            }
        }
    }
}
