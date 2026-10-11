// ═══════════════════════════════════════════════════════════════
// MindShift 3D — CameraController
// Smooth first-person camera controller with dynamic head bobbing,
// FOV sprinting transitions, and procedural camera shake.
// ═══════════════════════════════════════════════════════════════
using System.Collections;
using UnityEngine;

namespace MindShift.Player
{
    public class CameraController : MonoBehaviour
    {
        // ── Inspector References ──────────────────────────────────
        [Header("Target & Orientation")]
        public Transform cameraHolder;
        public Camera    cam;

        [Header("Head Bobbing")]
        public bool  enableHeadBob = true;
        public float bobSpeed      = 12f;
        public float bobAmount     = 0.04f;

        [Header("Dynamic FOV")]
        public float normalFOV  = 65f;
        public float sprintFOV  = 75f;
        public float fovLerpSpeed = 8f;

        // ── Private State ─────────────────────────────────────────
        private Vector3   _defaultCameraLocalPos;
        private float     _bobTimer = 0f;
        private Coroutine _shakeCoroutine;

        // ─────────────────────────────────────────────────────────
        private void Awake()
        {
            if (cam == null) cam = GetComponentInChildren<Camera>();
            if (cam != null)
            {
                _defaultCameraLocalPos = cam.transform.localPosition;
                cam.fieldOfView = normalFOV;
            }
        }

        public void UpdateBobbing(Vector3 horizontalVelocity, bool isGrounded)
        {
            if (!enableHeadBob || cam == null) return;

            float speed = horizontalVelocity.magnitude;

            if (speed > 0.1f && isGrounded)
            {
                _bobTimer += Time.deltaTime * bobSpeed;
                float bobY = Mathf.Sin(_bobTimer) * bobAmount;
                float bobX = Mathf.Cos(_bobTimer * 0.5f) * (bobAmount * 0.6f);

                cam.transform.localPosition = _defaultCameraLocalPos + new Vector3(bobX, bobY, 0);
            }
            else
            {
                _bobTimer = 0f;
                cam.transform.localPosition = Vector3.Lerp(cam.transform.localPosition, _defaultCameraLocalPos, Time.deltaTime * 6f);
            }
        }

        public void UpdateFOV(bool isSprinting)
        {
            if (cam == null) return;

            float targetFOV = isSprinting ? sprintFOV : normalFOV;
            cam.fieldOfView = Mathf.Lerp(cam.fieldOfView, targetFOV, Time.deltaTime * fovLerpSpeed);
        }

        // ── Procedural Camera Shake ───────────────────────────────
        public void Shake(float duration = 0.35f, float intensity = 0.08f)
        {
            if (_shakeCoroutine != null)
                StopCoroutine(_shakeCoroutine);

            _shakeCoroutine = StartCoroutine(ShakeRoutine(duration, intensity));
        }

        private IEnumerator ShakeRoutine(float duration, float intensity)
        {
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float damp = 1f - (elapsed / duration);
                Vector3 offset = Random.insideUnitSphere * (intensity * damp);
                offset.z = 0; // maintain forward plane

                if (cam != null)
                    cam.transform.localPosition = _defaultCameraLocalPos + offset;

                yield return null;
            }

            if (cam != null)
                cam.transform.localPosition = _defaultCameraLocalPos;
        }
    }
}
