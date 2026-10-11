// ═══════════════════════════════════════════════════════════════
// MindShift 3D — ReactionPanel
// An individual illuminated panel in the Reaction Lab.
// Flashes as a target (correct) or decoy (wrong).
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections;
using UnityEngine;
using MindShift.Interaction;

namespace MindShift.Challenges
{
    [RequireComponent(typeof(MeshRenderer))]
    public class ReactionPanel : MonoBehaviour, IInteractable
    {
        // ── Inspector ─────────────────────────────────────────────
        public Color idleColor   = new Color(0.05f, 0.05f, 0.15f);
        public Color targetColor = new Color(0.1f, 0.95f, 0.4f);    // green
        public Color decoyColor  = new Color(0.95f, 0.3f, 0.1f);    // red/orange
        public Color hitColor    = new Color(1f, 1f, 1f);            // white flash on hit

        public AudioSource localAudio;   // optional per-panel positional audio

        // ── Events ────────────────────────────────────────────────
        public event Action<float> OnCorrectHit;   // reaction time in seconds
        public event Action        OnDecoyHit;
        public event Action        OnMiss;

        // ── State ─────────────────────────────────────────────────
        public bool IsActive   { get; private set; }
        private bool _isDecoy  = false;
        private float _activatedAt;
        private MeshRenderer _mr;

        // ── IInteractable ─────────────────────────────────────────
        public string InteractPrompt => IsActive && !_isDecoy ? "[E] Hit!" : "";

        // ─────────────────────────────────────────────────────────
        private void Awake() => _mr = GetComponent<MeshRenderer>();

        private void Start() => SetEmission(idleColor);

        // ── Activation ────────────────────────────────────────────
        public void ActivateTarget(float windowSeconds)
        {
            _isDecoy    = false;
            IsActive    = true;
            _activatedAt = Time.time;
            SetEmission(targetColor);
            StartCoroutine(AutoDeactivate(windowSeconds));
        }

        public void ActivateDecoy(float windowSeconds)
        {
            _isDecoy    = true;
            IsActive    = true;
            _activatedAt = Time.time;
            SetEmission(decoyColor);
            StartCoroutine(AutoDeactivate(windowSeconds));
        }

        public void Deactivate()
        {
            IsActive = false;
            StopAllCoroutines();
            SetEmission(idleColor);
        }

        // ── IInteractable ─────────────────────────────────────────
        public void OnHoverEnter() { }
        public void OnHoverExit()  { }

        public void OnInteract(GameObject interactor)
        {
            if (!IsActive) return;

            if (_isDecoy)
            {
                StartCoroutine(FlashAndDeactivate(decoyColor));
                OnDecoyHit?.Invoke();
            }
            else
            {
                float reactionTime = Time.time - _activatedAt;
                StartCoroutine(FlashAndDeactivate(hitColor));
                OnCorrectHit?.Invoke(reactionTime);
            }
        }

        // ── Visual ────────────────────────────────────────────────
        private IEnumerator AutoDeactivate(float seconds)
        {
            yield return new WaitForSeconds(seconds);
            if (IsActive)
            {
                if (!_isDecoy) OnMiss?.Invoke();
                Deactivate();
            }
        }

        private IEnumerator FlashAndDeactivate(Color flash)
        {
            IsActive = false;
            SetEmission(flash);
            yield return new WaitForSeconds(0.15f);
            SetEmission(idleColor);
        }

        private void SetEmission(Color c)
        {
            if (_mr == null) return;
            MaterialPropertyBlock mpb = new MaterialPropertyBlock();
            _mr.GetPropertyBlock(mpb);
            mpb.SetColor("_EmissionColor", c);
            _mr.SetPropertyBlock(mpb);
        }
    }
}
