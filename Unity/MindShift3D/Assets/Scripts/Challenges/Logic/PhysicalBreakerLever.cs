// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PhysicalBreakerLever
// Physical 3D Circuit Breaker handle on the Logic Lab console.
// Player physically pulls/swings the breaker to test circuit stability
// instead of clicking a 2D canvas submit button.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections;
using UnityEngine;
using MindShift.Interaction;
using MindShift.Audio;

namespace MindShift.Challenges
{
    [RequireComponent(typeof(Collider))]
    public class PhysicalBreakerLever : MonoBehaviour, IInteractable
    {
        // ── Inspector References ──────────────────────────────────
        [Header("Lever Mechanics")]
        public Transform leverArmPivot;
        public float     pullAngle       = 65f;
        public float     pullDuration    = 0.35f;
        public Light     indicatorBeacon;

        [Header("Logic Challenge Link")]
        public LogicChallenge logicChallenge;

        // ── State ─────────────────────────────────────────────────
        private bool _isPulling = false;

        // ── IInteractable Implementation ──────────────────────────
        public string InteractPrompt => _isPulling ? "Engaging Circuit..." : "[E] Pull Circuit Breaker";

        public void OnHoverEnter()
        {
            if (indicatorBeacon != null)
                indicatorBeacon.intensity = 2.0f;
        }

        public void OnHoverExit()
        {
            if (indicatorBeacon != null)
                indicatorBeacon.intensity = 1.0f;
        }

        public void OnInteract(GameObject interactor)
        {
            if (_isPulling) return;
            StartCoroutine(PullRoutine());
        }

        private IEnumerator PullRoutine()
        {
            _isPulling = true;
            AudioManager.Instance?.PlaySFX(SFXType.SwitchFlip);

            Quaternion upRot   = Quaternion.identity;
            Quaternion downRot = Quaternion.Euler(pullAngle, 0, 0);

            // Pull down
            float elapsed = 0f;
            while (elapsed < pullDuration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.SmoothStep(0f, 1f, elapsed / pullDuration);
                if (leverArmPivot != null)
                    leverArmPivot.localRotation = Quaternion.Slerp(upRot, downRot, t);
                yield return null;
            }

            // Trigger submit on LogicChallenge
            if (logicChallenge != null)
            {
                logicChallenge.TrySubmit();
            }

            yield return new WaitForSeconds(0.4f);

            // Spring back up
            elapsed = 0f;
            while (elapsed < pullDuration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.SmoothStep(0f, 1f, elapsed / pullDuration);
                if (leverArmPivot != null)
                    leverArmPivot.localRotation = Quaternion.Slerp(downRot, upRot, t);
                yield return null;
            }

            if (leverArmPivot != null)
                leverArmPivot.localRotation = upRot;

            _isPulling = false;
        }
    }
}
