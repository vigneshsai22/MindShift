// ═══════════════════════════════════════════════════════════════
// MindShift 3D — CameraFocusController
// Smoothly transitions camera between First-Person free-walk mode
// and fixed-angle testing station perspectives (e.g. Memory table,
// Logic console, Spatial pedestal).
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections;
using UnityEngine;
using MindShift.Core;

namespace MindShift.Player
{
    public class CameraFocusController : Singleton<CameraFocusController>
    {
        // ── Inspector References ──────────────────────────────────
        [Header("Camera & Anchors")]
        public Camera    mainCamera;
        public Transform firstPersonAnchor; // the player's head pivot
        public PlayerController playerController;
        public RaycastInteractor raycastInteractor;

        [Header("Transition Settings")]
        public float defaultTransitionTime = 1.1f;
        public AnimationCurve transitionCurve = AnimationCurve.EaseInOut(0f, 0f, 1f, 1f);

        [Header("Focus Interaction Mode")]
        [Tooltip("If true, unlocks the mouse cursor when focused so the player can click 3D props freely.")]
        public bool unlockCursorWhenFocused = true;

        // ── State ─────────────────────────────────────────────────
        public bool IsFocused { get; private set; } = false;
        private Coroutine _transitionCoroutine;
        private Transform _currentStationAnchor;

        // ─────────────────────────────────────────────────────────
        protected override void Awake()
        {
            base.Awake();
            if (mainCamera == null) mainCamera = Camera.main;
            if (playerController == null) playerController = FindObjectOfType<PlayerController>();
            if (raycastInteractor == null) raycastInteractor = FindObjectOfType<RaycastInteractor>();

            if (firstPersonAnchor == null && mainCamera != null)
                firstPersonAnchor = mainCamera.transform.parent;
        }

        // ── Public Focus API ──────────────────────────────────────
        /// <summary>
        /// Smoothly animates camera from first-person view to a fixed testing station view.
        /// </summary>
        public void FocusOnStation(Transform stationCameraAnchor, Action onComplete = null)
        {
            if (stationCameraAnchor == null || mainCamera == null)
            {
                onComplete?.Invoke();
                return;
            }

            if (_transitionCoroutine != null)
                StopCoroutine(_transitionCoroutine);

            _currentStationAnchor = stationCameraAnchor;

            // 1. Lock player movement and mouse look
            if (playerController != null)
                playerController.LockMovement(true);

            _transitionCoroutine = StartCoroutine(TransitionRoutine(
                mainCamera.transform.position,
                mainCamera.transform.rotation,
                stationCameraAnchor.position,
                stationCameraAnchor.rotation,
                defaultTransitionTime,
                () =>
                {
                    IsFocused = true;

                    // Unparent or parent to station to prevent player jitter
                    mainCamera.transform.SetParent(stationCameraAnchor);

                    // Set cursor mode
                    if (unlockCursorWhenFocused)
                    {
                        Cursor.lockState = CursorLockMode.None;
                        Cursor.visible = true;
                    }

                    onComplete?.Invoke();
                }
            ));
        }

        /// <summary>
        /// Smoothly returns camera from testing station back to the player's first-person view.
        /// </summary>
        public void ReleaseFocus(Action onComplete = null)
        {
            if (!IsFocused || firstPersonAnchor == null || mainCamera == null)
            {
                onComplete?.Invoke();
                return;
            }

            if (_transitionCoroutine != null)
                StopCoroutine(_transitionCoroutine);

            // Re-parent to first person anchor first (keeping world position intact)
            mainCamera.transform.SetParent(firstPersonAnchor, true);

            _transitionCoroutine = StartCoroutine(TransitionRoutine(
                mainCamera.transform.position,
                mainCamera.transform.rotation,
                firstPersonAnchor.position,
                firstPersonAnchor.rotation,
                defaultTransitionTime,
                () =>
                {
                    IsFocused = false;
                    _currentStationAnchor = null;

                    // Reset local transforms
                    mainCamera.transform.localPosition = Vector3.zero;
                    mainCamera.transform.localRotation = Quaternion.identity;

                    // Restore first person controller and cursor lock
                    if (playerController != null)
                        playerController.LockMovement(false);

                    Cursor.lockState = CursorLockMode.Locked;
                    Cursor.visible = false;

                    onComplete?.Invoke();
                }
            ));
        }

        // ── Animation Routine ─────────────────────────────────────
        private IEnumerator TransitionRoutine(
            Vector3 startPos, Quaternion startRot,
            Vector3 endPos,   Quaternion endRot,
            float duration,   Action onFinish)
        {
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.Clamp01(elapsed / duration);
                float curveT = transitionCurve.Evaluate(t);

                mainCamera.transform.position = Vector3.Lerp(startPos, endPos, curveT);
                mainCamera.transform.rotation = Quaternion.Slerp(startRot, endRot, curveT);

                yield return null;
            }

            mainCamera.transform.position = endPos;
            mainCamera.transform.rotation = endRot;

            onFinish?.Invoke();
        }
    }
}
