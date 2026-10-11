// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PhysicalAudioDeskConsole
// Physical console on the lab desk with rotary dials and commit button.
// Connects with PhysicalMonitorDisplay (CCTV Render Texture).
// Player watches footage on the 3D monitor, then turns and inputs
// the sequence physically on the desk console dials.
// ABSOLUTELY ZERO 2D CANVAS POPUPS.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections.Generic;
using UnityEngine;
using MindShift.Interaction;
using MindShift.Audio;

namespace MindShift.Challenges
{
    public class PhysicalAudioDeskConsole : MonoBehaviour
    {
        // ── Inspector References ──────────────────────────────────
        [Header("Desk Monitor Link")]
        public PhysicalMonitorDisplay monitorScreen;

        [Header("Desk Console 3D Dials")]
        public List<PhysicalAudioDial> consoleDials = new List<PhysicalAudioDial>();

        [Header("Physical Submit Button")]
        public PhysicalConsoleButton submitButton;

        [Header("Backend Challenge Link")]
        public AudioChallenge audioChallenge;

        // ── State ─────────────────────────────────────────────────
        private List<int> _playerSequence = new List<int>();

        // ─────────────────────────────────────────────────────────
        private void Start()
        {
            InitializeConsole();
        }

        public void InitializeConsole()
        {
            _playerSequence.Clear();

            for (int i = 0; i < consoleDials.Count; i++)
            {
                int index = i;
                _playerSequence.Add(0);

                consoleDials[i].Configure(index, (dialIdx, step) =>
                {
                    _playerSequence[dialIdx] = step;
                });
            }

            if (submitButton != null)
            {
                submitButton.Configure("Verify Audio Sequence", OnSubmitPressed);
            }
        }

        public void BeginDeskAssessment()
        {
            // Play CCTV clip on 3D monitor
            if (monitorScreen != null)
            {
                monitorScreen.PlayFootage(null, () =>
                {
                    Debug.Log("[DeskConsole] Footage finished. Player may now adjust physical dials.");
                });
            }
        }

        private void OnSubmitPressed()
        {
            Debug.Log("[DeskConsole] Submitting physical sequence...");
            AudioManager.Instance?.PlaySFX(SFXType.SwitchFlip);

            if (audioChallenge != null)
            {
                // Verify against backend sequence
                audioChallenge.CheckPlayerSequence(_playerSequence);
            }
        }
    }
}
