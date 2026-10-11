// ═══════════════════════════════════════════════════════════════
// MindShift 3D — LogicSwitch
// An interactive toggle switch on the Logic Lab mechanism panel.
// Implements IInteractable for player interaction.
// ═══════════════════════════════════════════════════════════════
using UnityEngine;
using MindShift.Audio;
using MindShift.Interaction;

namespace MindShift.Challenges
{
    public class LogicSwitch : MonoBehaviour, IInteractable
    {
        // ── Inspector ─────────────────────────────────────────────
        public bool  startsOn = false;
        public Transform leverPivot;         // child object that rotates
        public Light     indicatorLight;     // colored light above switch
        public Color     onColor  = new Color(0.1f, 1.0f, 0.3f);
        public Color     offColor = new Color(1.0f, 0.2f, 0.1f);

        [Tooltip("Rotation when OFF")]
        public Vector3 offRotation = new Vector3(-30f, 0f, 0f);
        [Tooltip("Rotation when ON")]
        public Vector3 onRotation  = new Vector3( 30f, 0f, 0f);

        // ── IInteractable ─────────────────────────────────────────
        public string InteractPrompt => $"[E] Flip SW{SwitchId} ({(IsOn ? "ON" : "OFF")})";

        // ── State ─────────────────────────────────────────────────
        public bool IsOn     { get; private set; }
        public int  SwitchId { get; set; }      // set by LogicChallenge on setup

        // ─────────────────────────────────────────────────────────
        private void Start() => SetState(startsOn, false);

        // ── Public API ────────────────────────────────────────────
        public void SetState(bool on, bool animate = true)
        {
            IsOn = on;
            UpdateVisuals(animate);
        }

        public void SetHighlight(Color c)
        {
            if (indicatorLight != null)
                indicatorLight.color = c;
        }

        // ── IInteractable ─────────────────────────────────────────
        public void OnHoverEnter() => transform.localScale = Vector3.one * 1.05f;
        public void OnHoverExit()  => transform.localScale = Vector3.one;

        public void OnInteract(GameObject interactor)
        {
            SetState(!IsOn, true);
            AudioManager.Instance?.PlaySFX(SFXType.SwitchFlip);
        }

        // ── Visuals ───────────────────────────────────────────────
        private void UpdateVisuals(bool animate)
        {
            // Rotate lever
            if (leverPivot != null)
            {
                Vector3 target = IsOn ? onRotation : offRotation;
                if (animate)
                    StartCoroutine(RotateTo(target, 0.25f));
                else
                    leverPivot.localEulerAngles = target;
            }

            // Indicator light color
            if (indicatorLight != null)
                indicatorLight.color = IsOn ? onColor : offColor;
        }

        private System.Collections.IEnumerator RotateTo(Vector3 target, float duration)
        {
            Vector3 start = leverPivot.localEulerAngles;
            float t = 0f;
            while (t < duration)
            {
                t += Time.deltaTime;
                leverPivot.localEulerAngles = Vector3.Lerp(start, target, t / duration);
                yield return null;
            }
            leverPivot.localEulerAngles = target;
        }
    }
}
