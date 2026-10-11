// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PatternPanel
// Single cell in the Pattern Challenge grid.
// ═══════════════════════════════════════════════════════════════
using System;
using UnityEngine;
using MindShift.Interaction;

namespace MindShift.Challenges
{
    [RequireComponent(typeof(MeshRenderer))]
    public class PatternPanel : MonoBehaviour, IInteractable
    {
        public Color idleColor    = new Color(0.06f, 0.06f, 0.18f);
        public Color litColor     = new Color(0.2f, 0.6f, 1.0f);
        public Color selectedColor = new Color(0.6f, 0.2f, 1.0f);
        public Color correctColor = new Color(0.1f, 0.9f, 0.3f);
        public Color wrongColor   = new Color(0.9f, 0.1f, 0.1f);
        public Color missedColor  = new Color(1.0f, 0.7f, 0.0f);

        public string InteractPrompt => _interactive ? "[E] Toggle" : "";

        private bool          _selected    = false;
        private bool          _interactive = false;
        private Action<int, bool> _onToggled;
        private int           _index;
        private MeshRenderer  _mr;

        private static int _counter = 0;

        private void Awake()
        {
            _mr    = GetComponent<MeshRenderer>();
            _index = _counter++;
        }

        public void Illuminate(bool on)
        {
            SetEmission(on ? litColor : idleColor);
        }

        public void SetInteractive(bool on, Action<int, bool> callback)
        {
            _interactive = on;
            _onToggled   = callback;
            if (!on)
            {
                _selected = false;
                SetEmission(idleColor);
            }
        }

        public void ShowResult(bool correct)  => SetEmission(correct ? correctColor : wrongColor);
        public void ShowMissed()              => SetEmission(missedColor);

        public void OnHoverEnter() { if (_interactive) transform.localScale = Vector3.one * 1.08f; }
        public void OnHoverExit()  => transform.localScale = Vector3.one;

        public void OnInteract(GameObject interactor)
        {
            if (!_interactive) return;
            _selected = !_selected;
            SetEmission(_selected ? selectedColor : idleColor);
            _onToggled?.Invoke(_index, _selected);
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
