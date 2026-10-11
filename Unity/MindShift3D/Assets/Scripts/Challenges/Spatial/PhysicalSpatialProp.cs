// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PhysicalSpatialProp
// 3D physical puzzle piece manipulated in space to match a target
// holographic socket orientation.
// Supports direct mouse-drag 3D rotation and magnetic snap alignment.
// ═══════════════════════════════════════════════════════════════
using System;
using UnityEngine;
using MindShift.Interaction;
using MindShift.Audio;

namespace MindShift.Challenges
{
    [RequireComponent(typeof(Collider))]
    public class PhysicalSpatialProp : MonoBehaviour, IInteractable
    {
        // ── Inspector Settings ────────────────────────────────────
        [Header("Target Hologram Socket")]
        public Transform targetSocketHologram;
        public float     snapToleranceAngle = 14f; // degrees of precision required
        public float     rotationSpeed      = 5.0f;

        [Header("Visual Feedback")]
        public Renderer  propRenderer;
        public ParticleSystem snapParticles;
        public Color     normalColor  = new Color(0.2f, 0.7f, 1.0f);
        public Color     alignedColor = new Color(0.1f, 1.0f, 0.4f);

        // ── State ─────────────────────────────────────────────────
        public bool IsAligned { get; private set; } = false;
        private bool _isDragging = false;
        private Vector3 _lastMousePos;
        private Action _onAlignedCallback;

        // ── IInteractable Implementation ──────────────────────────
        public string InteractPrompt => IsAligned
            ? "Socket Locked & Calibrated"
            : "[Click & Drag] Rotate 3D Spatial Geometry";

        public void OnHoverEnter()
        {
            if (IsAligned || propRenderer == null) return;
            propRenderer.material.SetColor("_EmissionColor", normalColor * 0.8f);
        }

        public void OnHoverExit()
        {
            if (IsAligned || _isDragging || propRenderer == null) return;
            propRenderer.material.SetColor("_EmissionColor", Color.black);
        }

        public void OnInteract(GameObject interactor)
        {
            // Initial click starts drag
            _isDragging = true;
            _lastMousePos = Input.mousePosition;
        }

        // ── Setup API ─────────────────────────────────────────────
        public void ConfigureTarget(Quaternion targetRot, Action onAligned)
        {
            IsAligned = false;
            _onAlignedCallback = onAligned;

            if (targetSocketHologram != null)
                targetSocketHologram.rotation = targetRot;

            // Randomize starting rotation away from target
            transform.rotation = targetRot * Quaternion.Euler(
                UnityEngine.Random.Range(45f, 180f),
                UnityEngine.Random.Range(45f, 180f),
                UnityEngine.Random.Range(45f, 180f)
            );

            UpdateEmission(Color.black);
        }

        private void Update()
        {
            if (IsAligned) return;

            HandleMouseDragRotation();
            CheckAlignment();
        }

        private void HandleMouseDragRotation()
        {
            if (Input.GetMouseButtonDown(0))
            {
                // Raycast check if clicking directly on prop
                Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);
                if (Physics.Raycast(ray, out RaycastHit hit))
                {
                    if (hit.collider.gameObject == gameObject || hit.collider.transform.IsChildOf(transform))
                    {
                        _isDragging = true;
                        _lastMousePos = Input.mousePosition;
                    }
                }
            }

            if (Input.GetMouseButtonUp(0))
            {
                _isDragging = false;
                if (propRenderer != null)
                    propRenderer.material.SetColor("_EmissionColor", Color.black);
            }

            if (_isDragging)
            {
                Vector3 delta = Input.mousePosition - _lastMousePos;
                _lastMousePos = Input.mousePosition;

                float rotX = delta.y * rotationSpeed * Time.deltaTime * 20f;
                float rotY = -delta.x * rotationSpeed * Time.deltaTime * 20f;

                transform.Rotate(Camera.main.transform.up, rotY, Space.World);
                transform.Rotate(Camera.main.transform.right, rotX, Space.World);

                UpdateEmission(normalColor * 1.2f);
            }
        }

        private void CheckAlignment()
        {
            if (targetSocketHologram == null) return;

            float angleDiff = Quaternion.Angle(transform.rotation, targetSocketHologram.rotation);

            if (angleDiff <= snapToleranceAngle)
            {
                SnapIntoPlace();
            }
        }

        private void SnapIntoPlace()
        {
            IsAligned = true;
            _isDragging = false;

            // Snap cleanly to target rotation
            transform.rotation = targetSocketHologram.rotation;
            transform.position = targetSocketHologram.position;

            UpdateEmission(alignedColor * 1.8f);

            if (snapParticles != null)
                snapParticles.Play();

            AudioManager.Instance?.PlaySFX(SFXType.ShapeSnap);

            _onAlignedCallback?.Invoke();
        }

        private void UpdateEmission(Color col)
        {
            if (propRenderer != null)
                propRenderer.material.SetColor("_EmissionColor", col);
        }
    }
}
