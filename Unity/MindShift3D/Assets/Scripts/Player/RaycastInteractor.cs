// ═══════════════════════════════════════════════════════════════
// MindShift 3D — RaycastInteractor
// Continuous center-screen raycast processor for physical 3D prop
// interaction via crosshair reticle targeting.
// ═══════════════════════════════════════════════════════════════
using UnityEngine;
using MindShift.Interaction;

namespace MindShift.Player
{
    public class RaycastInteractor : MonoBehaviour
    {
        // ── Inspector Settings ────────────────────────────────────
        [Header("Raycast Configuration")]
        public Camera    playerCamera;
        public float     interactionDistance = 3.5f;
        public LayerMask interactableLayers  = ~0; // default all layers

        [Header("Controls")]
        public KeyCode   primaryInteractKey  = KeyCode.E;
        public bool      allowMouseClick     = true;

        [Header("State")]
        public bool      interactionEnabled  = true;

        // ── Private State ─────────────────────────────────────────
        private IInteractable _currentTarget = null;
        private GameObject    _currentHitObj = null;

        // ─────────────────────────────────────────────────────────
        private void Awake()
        {
            if (playerCamera == null)
                playerCamera = GetComponentInChildren<Camera>() ?? Camera.main;
        }

        private void Update()
        {
            if (!interactionEnabled || playerCamera == null)
            {
                ClearCurrentTarget();
                return;
            }

            PerformRaycast();
            HandleInput();
        }

        private InteractableMeshHighlighter _currentHighlighter = null;

        [Header("Canvasless Reticle")]
        public bool drawDirectReticle = true;
        public float reticleSize = 4f;
        public Color reticleDefaultColor = new Color(1f, 1f, 1f, 0.6f);
        public Color reticleActiveColor  = new Color(0f, 1f, 0.75f, 1f);

        private void PerformRaycast()
        {
            // Cast ray from dead-center of screen / reticle
            Ray ray = playerCamera.ViewportPointToRay(new Vector3(0.5f, 0.5f, 0f));

            if (Physics.Raycast(ray, out RaycastHit hit, interactionDistance, interactableLayers))
            {
                IInteractable interactable = hit.collider.GetComponentInParent<IInteractable>();

                if (interactable != null)
                {
                    if (interactable != _currentTarget)
                    {
                        // Target changed
                        ClearCurrentTarget();
                        _currentTarget = interactable;
                        _currentHitObj = hit.collider.gameObject;

                        _currentHighlighter = hit.collider.GetComponentInParent<InteractableMeshHighlighter>();
                        _currentHighlighter?.SetHovered(true);

                        _currentTarget.OnHoverEnter();
                        InteractionSystem.Instance?.SetPrompt(_currentTarget.InteractPrompt);
                    }
                    return;
                }
            }

            // Raycast hit nothing interactable
            if (_currentTarget != null)
            {
                ClearCurrentTarget();
            }
        }

        private void HandleInput()
        {
            if (_currentTarget == null) return;

            bool interactPressed = Input.GetKeyDown(primaryInteractKey) ||
                                  (allowMouseClick && Input.GetMouseButtonDown(0));

            if (interactPressed)
            {
                _currentHighlighter?.TriggerInteractionPulse();
                _currentTarget.OnInteract(gameObject);

                // Update prompt if state changed
                if (_currentTarget != null)
                    InteractionSystem.Instance?.SetPrompt(_currentTarget.InteractPrompt);
            }
        }

        private void ClearCurrentTarget()
        {
            if (_currentTarget != null)
            {
                _currentHighlighter?.SetHovered(false);
                _currentHighlighter = null;

                _currentTarget.OnHoverExit();
                _currentTarget = null;
                _currentHitObj = null;
                InteractionSystem.Instance?.ClearPrompt();
            }
        }

        private void OnGUI()
        {
            if (!drawDirectReticle || !interactionEnabled) return;

            // Draws a clean 3D crosshair reticle in dead center of screen without any Canvas
            float x = Screen.width * 0.5f;
            float y = Screen.height * 0.5f;
            Color col = (_currentTarget != null) ? reticleActiveColor : reticleDefaultColor;

            UnityEditor_DrawDot(new Rect(x - reticleSize * 0.5f, y - reticleSize * 0.5f, reticleSize, reticleSize), col);
        }

        private static Texture2D _dotTex;
        private static void UnityEditor_DrawDot(Rect rect, Color color)
        {
            if (_dotTex == null)
            {
                _dotTex = new Texture2D(1, 1);
                _dotTex.SetPixel(0, 0, Color.white);
                _dotTex.Apply();
            }
            Color prev = GUI.color;
            GUI.color = color;
            GUI.DrawTexture(rect, _dotTex);
            GUI.color = prev;
        }

        public void SetInteractionEnabled(bool enabled)
        {
            interactionEnabled = enabled;
            if (!enabled)
                ClearCurrentTarget();
        }
    }
}
