// ═══════════════════════════════════════════════════════════════
// MindShift 3D — HologramDisplay
// Controls the holographic AI guide (ARIA) in the Lobby hub.
// Implements gentle floating bob, hologram glitch/flicker,
// proximity voice greeting, and interactive dialogue prompts.
// ═══════════════════════════════════════════════════════════════
using System.Collections;
using UnityEngine;
using MindShift.Audio;
using MindShift.Interaction;
using MindShift.UI;

namespace MindShift.Environment
{
    public class HologramDisplay : MonoBehaviour, IInteractable
    {
        // ── Inspector References ──────────────────────────────────
        [Header("Visual Effects")]
        public Transform hologramMesh;
        public Renderer  hologramRenderer;
        public Light     hologramProjectorLight;

        [Header("Animation Parameters")]
        public float bobHeight     = 0.15f;
        public float bobSpeed      = 1.5f;
        public float rotationSpeed = 20f;
        public float flickerChance = 0.05f;

        [Header("Dialogue / Audio")]
        public AudioClip ariaVoiceGreeting;
        [TextArea(2, 4)]
        public string greetingMessage = "Welcome to the MindShift Cognitive Research Facility. Approach any lab blast door to begin testing.";

        // ── Private State ─────────────────────────────────────────
        private Vector3   _initialPos;
        private Material  _holoMaterial;
        private Color     _baseColor;
        private bool      _hasGreetedPlayer = false;

        // ── IInteractable Implementation ──────────────────────────
        public string InteractPrompt => "[E] Consult ARIA (AI Guide)";

        public void OnHoverEnter()
        {
            if (hologramProjectorLight != null)
                hologramProjectorLight.intensity = 1.6f;
        }

        public void OnHoverExit()
        {
            if (hologramProjectorLight != null)
                hologramProjectorLight.intensity = 1.2f;
        }

        public void OnInteract(GameObject interactor)
        {
            if (ariaVoiceGreeting != null)
                AudioManager.Instance?.PlayVoice(ariaVoiceGreeting);

            UIManager.Instance?.ShowToast("ARIA (AI GUIDE)", greetingMessage);
        }

        // ── Lifecycle ─────────────────────────────────────────────
        private void Awake()
        {
            if (hologramMesh != null)
                _initialPos = hologramMesh.localPosition;

            if (hologramRenderer != null)
            {
                _holoMaterial = hologramRenderer.material;
                _baseColor = _holoMaterial.color;
            }
        }

        private void Update()
        {
            AnimateHologram();
        }

        private void AnimateHologram()
        {
            if (hologramMesh == null) return;

            // 1. Smooth vertical bob
            float yOffset = Mathf.Sin(Time.time * bobSpeed) * bobHeight;
            hologramMesh.localPosition = _initialPos + new Vector3(0, yOffset, 0);

            // 2. Slow rotation
            hologramMesh.Rotate(Vector3.up, rotationSpeed * Time.deltaTime, Space.World);

            // 3. Occasional sci-fi hologram flicker
            if (hologramRenderer != null && Random.value < flickerChance)
            {
                StartCoroutine(FlickerRoutine());
            }
        }

        private IEnumerator FlickerRoutine()
        {
            if (_holoMaterial == null) yield break;

            float flickerAlpha = Random.Range(0.2f, 0.7f);
            Color flickColor = new Color(_baseColor.r, _baseColor.g, _baseColor.b, flickerAlpha);
            _holoMaterial.color = flickColor;

            if (hologramProjectorLight != null)
                hologramProjectorLight.intensity = Random.Range(0.8f, 1.8f);

            yield return new WaitForSeconds(Random.Range(0.04f, 0.1f));

            _holoMaterial.color = _baseColor;

            if (hologramProjectorLight != null)
                hologramProjectorLight.intensity = 1.2f;
        }

        // ── Automatic Proximity Greeting ──────────────────────────
        private void OnTriggerEnter(Collider other)
        {
            if (other.CompareTag("Player") && !_hasGreetedPlayer)
            {
                _hasGreetedPlayer = true;
                Interact();
            }
        }
    }
}
