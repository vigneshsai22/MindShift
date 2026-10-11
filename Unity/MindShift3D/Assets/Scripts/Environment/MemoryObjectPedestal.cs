// ═══════════════════════════════════════════════════════════════
// MindShift 3D — MemoryObjectPedestal
// A single pedestal in the Memory Lab. Handles spawned object
// display, click events, and visual feedback (highlight, result).
// ═══════════════════════════════════════════════════════════════
using System;
using UnityEngine;
using MindShift.Interaction;

namespace MindShift.Environment
{
    public class MemoryObjectPedestal : MonoBehaviour, IInteractable
    {
        // ── Inspector ─────────────────────────────────────────────
        public Transform        SpawnPoint;
        public MeshRenderer     glowRing;         // emissive ring at base
        public Color            defaultColor   = new Color(0.1f, 0.5f, 0.8f);
        public Color            selectedColor  = new Color(0.2f, 0.9f, 0.6f);
        public Color            correctColor   = new Color(0.1f, 0.9f, 0.1f);
        public Color            wrongColor     = new Color(0.9f, 0.1f, 0.1f);

        // ── IInteractable ─────────────────────────────────────────
        public string InteractPrompt => "[E] Select — changed object?";

        // ── State ─────────────────────────────────────────────────
        private bool            _interactive = false;
        private bool            _highlighted = false;
        private Action<int>     _onClicked;
        private int             _myIndex;
        private static int      _indexCounter = 0;

        private void Awake()
        {
            _myIndex = _indexCounter++;
        }

        // ── Setup ─────────────────────────────────────────────────
        public void SetObject(GameObject obj, bool highlight)
        {
            SetGlowColor(highlight ? selectedColor : defaultColor);
        }

        public void SetInteractive(bool interactive, Action<int> onClicked)
        {
            _interactive = interactive;
            _onClicked   = onClicked;
        }

        public void Deactivate()
        {
            _interactive = false;
            SetGlowColor(Color.black);
        }

        // ── IInteractable ─────────────────────────────────────────
        public void OnHoverEnter()
        {
            if (!_interactive) return;
            transform.localScale = Vector3.one * 1.05f;
        }

        public void OnHoverExit()
        {
            transform.localScale = Vector3.one;
        }

        public void OnInteract(GameObject interactor)
        {
            if (!_interactive) return;
            _onClicked?.Invoke(_myIndex);
        }

        // ── Visual Feedback ───────────────────────────────────────
        public void SetHighlight(bool on)
        {
            _highlighted = on;
            SetGlowColor(on ? selectedColor : defaultColor);
        }

        public void ShowResult(bool correct)
        {
            SetGlowColor(correct ? correctColor : wrongColor);
            _interactive = false;
        }

        public void ShowWrongSelection()
        {
            SetGlowColor(wrongColor);
            _interactive = false;
        }

        private void SetGlowColor(Color c)
        {
            if (glowRing == null) return;
            MaterialPropertyBlock mpb = new MaterialPropertyBlock();
            glowRing.GetPropertyBlock(mpb);
            mpb.SetColor("_EmissionColor", c);
            glowRing.SetPropertyBlock(mpb);
        }
    }
}
