// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PhysicalRoomMemoryChallenge
// Physical Room Memory assessment.
// Player walks around a 3D room inspecting physical props on tables
// (beakers, hard drives, tools). Lights turn off for 3 seconds.
// When lights restore, 2 items have physically shifted position.
// Player walks around and clicks directly on the shifted 3D meshes.
// ABSOLUTELY ZERO 2D CANVAS CARDS OR POPUPS.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using MindShift.Audio;
using MindShift.Interaction;

namespace MindShift.Challenges
{
    public class PhysicalRoomMemoryChallenge : ChallengeBase
    {
        // ── Inspector References ──────────────────────────────────
        [Header("Room Props & Tables")]
        [Tooltip("Physical 3D props placed on tables in the room (beakers, hard drives, tools)")]
        public List<PhysicalMemoryProp> roomProps = new List<PhysicalMemoryProp>();

        [Header("Room Lighting")]
        public List<Light> roomLights = new List<Light>();
        public float       normalLightIntensity = 1.2f;
        public float       blackoutHoldSeconds  = 3.0f;
        public float       observationSeconds   = 8.0f;

        [Header("Shift Configurations")]
        public int itemsToShift = 2;
        public float shiftDistance = 0.65f;

        // ── State ─────────────────────────────────────────────────
        private HashSet<int> _shiftedIndices = new HashSet<int>();
        private HashSet<int> _foundIndices   = new HashSet<int>();
        private int          _wrongClicks    = 0;
        private bool         _isRecallActive = false;

        // ── Lifecycle ─────────────────────────────────────────────
        public override void SetupChallenge()
        {
            _shiftedIndices.Clear();
            _foundIndices.Clear();
            _wrongClicks = 0;
            _isRecallActive = false;

            // Initialize all physical props
            for (int i = 0; i < roomProps.Count; i++)
            {
                int index = i;
                roomProps[i].Configure(index, false, OnPropClicked);
                roomProps[i].SetInteractable(false);
            }
        }

        public override void StartChallenge()
        {
            base.StartChallenge();
            StartCoroutine(RoomMemoryRoutine());
        }

        private IEnumerator RoomMemoryRoutine()
        {
            // ── PHASE 1: OBSERVATION (Free Walk) ──
            SetRoomLights(normalLightIntensity);
            AudioManager.Instance?.PlaySFX(SFXType.ObservationStart);

            yield return new WaitForSeconds(Config != null && Config.memoryObservationTime > 0 ? Config.memoryObservationTime : observationSeconds);

            // ── PHASE 2: 3-SECOND BLACKOUT ──
            AudioManager.Instance?.PlaySFX(SFXType.PanelFlash);
            SetRoomLights(0f); // Pitch black

            // Physically shift selected 3D props during darkness
            PhysicallyShiftProps();

            yield return new WaitForSeconds(blackoutHoldSeconds);

            // ── PHASE 3: RECALL (Walk & Click directly on shifted meshes) ──
            SetRoomLights(normalLightIntensity);
            AudioManager.Instance?.PlaySFX(SFXType.RecallStart);

            _isRecallActive = true;
            foreach (var prop in roomProps)
            {
                prop.SetInteractable(true);
            }
        }

        private void PhysicallyShiftProps()
        {
            if (roomProps.Count == 0) return;

            // Pick randomized props to physically move
            List<int> candidateIndices = new List<int>();
            for (int i = 0; i < roomProps.Count; i++) candidateIndices.Add(i);

            // Shuffle
            for (int i = 0; i < candidateIndices.Count; i++)
            {
                int r = UnityEngine.Random.Range(i, candidateIndices.Count);
                int tmp = candidateIndices[i];
                candidateIndices[i] = candidateIndices[r];
                candidateIndices[r] = tmp;
            }

            int count = Mathf.Min(itemsToShift, candidateIndices.Count);
            for (int i = 0; i < count; i++)
            {
                int idx = candidateIndices[i];
                _shiftedIndices.Add(idx);

                // Physically offset the 3D mesh position on the table
                Vector3 offset = new Vector3(
                    UnityEngine.Random.Range(-shiftDistance, shiftDistance),
                    0f,
                    UnityEngine.Random.Range(-shiftDistance, shiftDistance)
                );

                Color subtleShiftColor = new Color(0.9f, 0.95f, 1f);
                roomProps[idx].ApplyAlteredAppearance(subtleShiftColor, offset);
            }
        }

        private void OnPropClicked(int index, bool wasAltered)
        {
            if (!_isRecallActive || IsResolved) return;

            if (wasAltered)
            {
                _foundIndices.Add(index);

                // Check if all shifted objects have been located
                if (_foundIndices.Count >= _shiftedIndices.Count)
                {
                    _isRecallActive = false;
                    foreach (var p in roomProps) p.SetInteractable(false);
                    Resolve(true);
                }
            }
            else
            {
                _wrongClicks++;
            }
        }

        protected override void OnTimeExpired()
        {
            _isRecallActive = false;
            foreach (var p in roomProps) p.SetInteractable(false);

            bool partial = _foundIndices.Count > 0;
            Resolve(partial);
        }

        private void SetRoomLights(float intensity)
        {
            foreach (var l in roomLights)
            {
                if (l != null) l.intensity = intensity;
            }
        }
    }
}
