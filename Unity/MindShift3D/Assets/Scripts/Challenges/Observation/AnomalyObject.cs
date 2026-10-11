// ═══════════════════════════════════════════════════════════════
// MindShift 3D — AnomalyObject
// An object in the Observation Lab that may or may not be an anomaly.
// Manages visual states: original, changed, tagged, result feedback.
// ═══════════════════════════════════════════════════════════════
using UnityEngine;

namespace MindShift.Challenges
{
    public class AnomalyObject : MonoBehaviour
    {
        [Header("States")]
        public GameObject originalState;    // original appearance
        public GameObject changedState;     // the "anomaly" appearance

        [Header("Feedback Materials")]
        public Material taggedMaterial;
        public Material correctMaterial;
        public Material wrongMaterial;
        public Material missedMaterial;

        // ── State ─────────────────────────────────────────────────
        public bool IsActive { get; private set; }   // true = real anomaly
        private bool _isTagged = false;
        private Renderer[] _renderers;
        private Material[] _originalMaterials;

        // ─────────────────────────────────────────────────────────
        private void Awake()
        {
            _renderers = GetComponentsInChildren<Renderer>();
            // Cache original materials
            _originalMaterials = new Material[_renderers.Length];
            for (int i = 0; i < _renderers.Length; i++)
                _originalMaterials[i] = _renderers[i].material;
        }

        // ── Configuration ─────────────────────────────────────────
        public void SetActive(bool isAnomaly)
        {
            IsActive = isAnomaly;
            if (originalState != null) originalState.SetActive(true);
            if (changedState  != null) changedState.SetActive(false);
        }

        public void ShowOriginalState(bool showOriginal)
        {
            if (!IsActive) return;
            if (originalState != null) originalState.SetActive(showOriginal);
            if (changedState  != null) changedState.SetActive(!showOriginal);
        }

        // ── Tagging ───────────────────────────────────────────────
        public void SetTagged(bool tagged)
        {
            _isTagged = tagged;
            if (tagged && taggedMaterial != null)
                ApplyMaterial(taggedMaterial);
            else
                ResetMaterials();
        }

        public void ClearHighlight()
        {
            _isTagged = false;
            ResetMaterials();
        }

        // ── Result Feedback ───────────────────────────────────────
        public void ShowResult(bool correct)
        {
            if (correct && correctMaterial != null) ApplyMaterial(correctMaterial);
            else if (!correct && missedMaterial != null) ApplyMaterial(missedMaterial);
        }

        public void ShowFalsePositive()
        {
            if (wrongMaterial != null) ApplyMaterial(wrongMaterial);
        }

        // ── Helpers ───────────────────────────────────────────────
        private void ApplyMaterial(Material mat)
        {
            foreach (var r in _renderers)
                r.material = mat;
        }

        private void ResetMaterials()
        {
            for (int i = 0; i < _renderers.Length && i < _originalMaterials.Length; i++)
                _renderers[i].material = _originalMaterials[i];
        }
    }
}
