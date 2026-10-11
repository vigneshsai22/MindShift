// ═══════════════════════════════════════════════════════════════
// MindShift 3D — SoundButton
// A single piano key / tone button in the Audio Challenge.
// ═══════════════════════════════════════════════════════════════
using System;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

namespace MindShift.Challenges
{
    public class SoundButton : MonoBehaviour, IPointerClickHandler
    {
        [Header("Config")]
        public int   noteIndex;          // 0 = C4 … 7 = C5
        public Color defaultColor  = new Color(0.12f, 0.12f, 0.3f);
        public Color pressedColor  = new Color(0.5f, 0.2f, 1.0f);
        public Color correctColor  = new Color(0.1f, 0.9f, 0.3f);
        public Color wrongColor    = new Color(0.9f, 0.2f, 0.1f);

        // Event raised with the note index
        public event Action<int> OnPressed;

        private Image _img;
        private bool  _interactive = true;

        private void Awake()
        {
            _img = GetComponent<Image>();
            if (_img != null) _img.color = defaultColor;
        }

        public void OnPointerClick(PointerEventData eventData)
        {
            if (!_interactive) return;
            FlashPressed();
            OnPressed?.Invoke(noteIndex);
        }

        public void SetInteractive(bool on)
        {
            _interactive = on;
            if (_img != null)
                _img.color = on ? defaultColor : new Color(0.05f, 0.05f, 0.1f);
        }

        public void ShowFeedback(bool correct)
        {
            if (_img != null) _img.color = correct ? correctColor : wrongColor;
        }

        private void FlashPressed()
        {
            if (_img == null) return;
            _img.color = pressedColor;
            Invoke(nameof(ResetColor), 0.25f);
        }

        private void ResetColor()
        {
            if (_img != null) _img.color = defaultColor;
        }
    }
}
