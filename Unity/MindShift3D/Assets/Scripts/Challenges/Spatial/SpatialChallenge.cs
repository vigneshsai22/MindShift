// ═══════════════════════════════════════════════════════════════
// MindShift 3D — SpatialChallenge
// A 3D shape floats in space. Player drags/rotates it until it
// aligns with the target socket. Tests spatial reasoning.
// ═══════════════════════════════════════════════════════════════
using System.Collections;
using UnityEngine;
using TMPro;
using MindShift.Audio;

namespace MindShift.Challenges
{
    public class SpatialChallenge : ChallengeBase
    {
        // ── Inspector ─────────────────────────────────────────────
        [Header("Spatial Lab References")]
        public RotatableShape   shapeObject;
        public Transform        socketTransform;       // target position + rotation
        public GameObject       alignParticleEffect;
        public TextMeshProUGUI  statusText;
        public TextMeshProUGUI  alignmentText;

        [Header("Alignment")]
        [Tooltip("Degrees tolerance for snap alignment")]
        public float alignmentTolerance = 15f;
        [Tooltip("Distance tolerance for position snap")]
        public float positionTolerance  = 0.3f;

        // ── State ─────────────────────────────────────────────────
        private bool   _solved = false;
        private int    _attemptCount = 0;

        // ── Lifecycle ─────────────────────────────────────────────
        public override void SetupChallenge()
        {
            _solved       = false;
            _attemptCount = 0;

            if (shapeObject != null)
            {
                shapeObject.ResetToRandomRotation();
                shapeObject.SetRotationAxes(Config.spatialRotationAxes);
                shapeObject.OnRotationChanged += CheckAlignment;
                shapeObject.SetInteractive(true);
            }

            if (alignParticleEffect != null)
                alignParticleEffect.SetActive(false);

            UpdateAlignmentDisplay(0f);
        }

        public override void StartChallenge()
        {
            base.StartChallenge();
            if (statusText != null)
                statusText.text = "Rotate the shape to match the socket orientation.";
        }

        public override void TeardownChallenge()
        {
            if (shapeObject != null)
                shapeObject.OnRotationChanged -= CheckAlignment;
        }

        // ── Alignment Check ───────────────────────────────────────
        private void CheckAlignment()
        {
            if (_solved || IsResolved || socketTransform == null) return;

            float angleDiff = Quaternion.Angle(shapeObject.transform.rotation, socketTransform.rotation);
            float normalizedAngle = 1f - Mathf.Clamp01(angleDiff / 180f);

            UpdateAlignmentDisplay(normalizedAngle);

            if (angleDiff < alignmentTolerance)
                StartCoroutine(SnapAndSolve());
        }

        private IEnumerator SnapAndSolve()
        {
            if (_solved) yield break;
            _solved = true;

            // Snap shape to socket
            float t = 0f; float dur = 0.5f;
            Quaternion startRot = shapeObject.transform.rotation;
            Vector3    startPos = shapeObject.transform.position;

            while (t < dur)
            {
                t += Time.deltaTime;
                float s = t / dur;
                shapeObject.transform.rotation = Quaternion.Slerp(startRot, socketTransform.rotation, s);
                shapeObject.transform.position = Vector3.Lerp(startPos, socketTransform.position, s);
                yield return null;
            }

            shapeObject.SetInteractive(false);

            if (alignParticleEffect != null) alignParticleEffect.SetActive(true);
            AudioManager.Instance?.PlaySFX(SFXType.ShapeSnap);

            if (statusText != null) statusText.text = "✅ ALIGNED!";
            UpdateAlignmentDisplay(1f);

            yield return new WaitForSeconds(1.5f);
            Resolve(true);
        }

        public void ReportCorrectPlacement()
        {
            if (_solved) return;
            _solved = true;
            Resolve(true);
        }

        protected override void OnTimeExpired()
        {
            float angleDiff = socketTransform != null
                ? Quaternion.Angle(shapeObject.transform.rotation, socketTransform.rotation)
                : 180f;
            bool partial = angleDiff < 45f;
            Resolve(partial);
        }

        private void UpdateAlignmentDisplay(float normalized)
        {
            if (alignmentText == null) return;
            int pct = Mathf.RoundToInt(normalized * 100f);
            alignmentText.text = $"Alignment: {pct}%";
            alignmentText.color = Color.Lerp(Color.red, Color.green, normalized);
        }
    }
}
