// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PhysicalSpatialChamber
// Glass containment chamber on a pedestal containing a glowing 3D cube.
// The player clicks and drags the actual 3D cube model in real time
// along X/Y/Z axes to physically align it with a holographic target outline.
// ABSOLUTELY ZERO 2D CANVAS WINDOWS.
// ═══════════════════════════════════════════════════════════════
using System;
using UnityEngine;
using MindShift.Interaction;
using MindShift.Audio;

namespace MindShift.Challenges
{
    public class PhysicalSpatialChamber : MonoBehaviour
    {
        // ── Inspector References ──────────────────────────────────
        [Header("Physical Chamber Models")]
        public Transform glassChamberPivot;
        public Transform pedestalBase;
        public Light     chamberPedestalLight;

        [Header("3D Cube & Target Outline")]
        public PhysicalSpatialProp physicalCubeProp;
        public Transform           holographicWireframeSocket;

        [Header("Alignment Settings")]
        public float snapToleranceDegrees = 14f;

        [Header("Backend Challenge Link")]
        public SpatialChallenge spatialChallenge;

        // ─────────────────────────────────────────────────────────
        private void Start()
        {
            if (physicalCubeProp != null && holographicWireframeSocket != null)
            {
                SetupPuzzle();
            }
        }

        public void SetupPuzzle()
        {
            // Pick a randomized target orientation for the holographic wireframe
            Quaternion targetRotation = Quaternion.Euler(
                UnityEngine.Random.Range(0, 4) * 90f,
                UnityEngine.Random.Range(0, 4) * 90f,
                UnityEngine.Random.Range(0, 4) * 90f
            );

            if (holographicWireframeSocket != null)
                holographicWireframeSocket.rotation = targetRotation;

            if (physicalCubeProp != null)
            {
                physicalCubeProp.targetSocketHologram = holographicWireframeSocket;
                physicalCubeProp.snapToleranceAngle = snapToleranceDegrees;

                // Scramble the cube away from target
                physicalCubeProp.ConfigureTarget(targetRotation, OnCubeSnappedIntoSocket);
            }
        }

        private void OnCubeSnappedIntoSocket()
        {
            Debug.Log("[SpatialChamber] 3D Cube successfully snapped into holographic socket!");

            if (chamberPedestalLight != null)
            {
                chamberPedestalLight.color = Color.green;
                chamberPedestalLight.intensity = 3.0f;
            }

            // Report directly to backend SpatialChallenge
            if (spatialChallenge != null)
            {
                spatialChallenge.ReportCorrectPlacement();
            }
        }
    }
}
