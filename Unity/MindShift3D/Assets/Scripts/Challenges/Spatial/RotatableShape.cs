// ═══════════════════════════════════════════════════════════════
// MindShift 3D — RotatableShape
// A 3D shape the player can grab and rotate with mouse drag.
// Used by SpatialChallenge. Supports 1, 2, or 3 rotation axes.
// ═══════════════════════════════════════════════════════════════
using System;
using UnityEngine;

namespace MindShift.Challenges
{
    public class RotatableShape : MonoBehaviour
    {
        // ── Inspector ─────────────────────────────────────────────
        public float rotationSpeed = 200f;

        // ── Events ────────────────────────────────────────────────
        public event Action OnRotationChanged;

        // ── State ─────────────────────────────────────────────────
        private bool _interactive  = false;
        private bool _isDragging   = false;
        private int  _allowedAxes  = 3;     // 1 = Y only, 2 = Y+X, 3 = all

        private Vector3 _lastMousePos;

        // ─────────────────────────────────────────────────────────
        public void SetInteractive(bool on) => _interactive = on;

        public void SetRotationAxes(int axes) => _allowedAxes = Mathf.Clamp(axes, 1, 3);

        public void ResetToRandomRotation()
        {
            // Always give a non-trivial random rotation so player must work
            float rx = _allowedAxes >= 2 ? UnityEngine.Random.Range(-90f, 90f) : 0f;
            float ry = UnityEngine.Random.Range(-180f, 180f);
            float rz = _allowedAxes >= 3 ? UnityEngine.Random.Range(-90f, 90f) : 0f;
            transform.rotation = Quaternion.Euler(rx, ry, rz);
        }

        // ── Mouse Drag Rotation ───────────────────────────────────
        private void OnMouseDown()
        {
            if (!_interactive) return;
            _isDragging   = true;
            _lastMousePos = Input.mousePosition;
        }

        private void OnMouseUp()
        {
            _isDragging = false;
        }

        private void OnMouseDrag()
        {
            if (!_interactive || !_isDragging) return;

            Vector3 delta = Input.mousePosition - _lastMousePos;
            _lastMousePos = Input.mousePosition;

            float dt = Time.deltaTime * rotationSpeed;

            // Y-axis always enabled
            transform.Rotate(Vector3.up, -delta.x * dt, Space.World);

            // X-axis (allowed for 2+ axes)
            if (_allowedAxes >= 2)
                transform.Rotate(Vector3.right, delta.y * dt, Space.World);

            // Z-axis (only for 3 axes, via right-click drag)
            if (_allowedAxes >= 3 && Input.GetMouseButton(1))
                transform.Rotate(Vector3.forward, delta.x * dt, Space.World);

            OnRotationChanged?.Invoke();
        }

        // ── Slow Idle Rotation when not dragging ─────────────────
        private void Update()
        {
            if (!_isDragging && _interactive)
                transform.Rotate(Vector3.up, 10f * Time.deltaTime, Space.World);
        }
    }
}
