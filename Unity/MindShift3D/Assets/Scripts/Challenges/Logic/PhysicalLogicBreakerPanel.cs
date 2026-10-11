// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PhysicalLogicBreakerPanel
// Wall-mounted physical 3D electrical breaker panel.
// Player physically aims and pulls 3D lever handles on the wall,
// lighting up 3D neon bulbs and conduits to solve logical circuit rules.
// ABSOLUTELY ZERO 2D CANVAS WINDOWS.
// ═══════════════════════════════════════════════════════════════
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using MindShift.Audio;

namespace MindShift.Challenges
{
    public class PhysicalLogicBreakerPanel : MonoBehaviour
    {
        // ── Inspector References ──────────────────────────────────
        [Header("3D Levers on Panel")]
        [Tooltip("Physical lever switches mounted on the wall breaker panel")]
        public List<PhysicalLogicDial> leverSwitches = new List<PhysicalLogicDial>();

        [Header("3D Status Bulbs")]
        [Tooltip("Physical light bulb meshes that illuminate when circuits engage")]
        public List<Renderer> statusBulbMeshes = new List<Renderer>();
        public List<Light>    statusPointLights = new List<Light>();

        [Header("Physical Master Breaker")]
        public PhysicalBreakerLever masterSubmitLever;

        [Header("Circuit Feedback Colors")]
        [ColorUsage(true, true)]
        public Color bulbActiveColor   = new Color(0f, 1f, 0.4f) * 2.0f; // HDR Neon Green
        [ColorUsage(true, true)]
        public Color bulbInactiveColor = new Color(0.1f, 0.1f, 0.15f);

        [Header("Master Terminal Light")]
        public Light masterCircuitLight;

        // ── Backend Integration ───────────────────────────────────
        [Header("Backend Link")]
        public LogicChallenge logicChallenge;

        // ─────────────────────────────────────────────────────────
        private void Start()
        {
            InitializeBreakerPanel();
        }

        public void InitializeBreakerPanel()
        {
            for (int i = 0; i < leverSwitches.Count; i++)
            {
                int index = i;
                leverSwitches[i].Initialize(index, false, (swId, isOn) =>
                {
                    OnLeverToggled(swId, isOn);
                });

                UpdateBulbVisual(index, false);
            }

            if (masterSubmitLever != null && logicChallenge != null)
            {
                masterSubmitLever.logicChallenge = logicChallenge;
            }
        }

        private void OnLeverToggled(int leverId, bool isOn)
        {
            UpdateBulbVisual(leverId, isOn);

            // Feed directly into LogicChallenge backend rule engine
            if (logicChallenge != null && leverId < logicChallenge.switches.Count)
            {
                logicChallenge.switches[leverId].SetState(isOn, false);
            }
        }

        private void UpdateBulbVisual(int index, bool active)
        {
            if (index < statusBulbMeshes.Count && statusBulbMeshes[index] != null)
            {
                Material mat = statusBulbMeshes[index].material;
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", active ? bulbActiveColor : bulbInactiveColor);
            }

            if (index < statusPointLights.Count && statusPointLights[index] != null)
            {
                statusPointLights[index].color = active ? Color.green : Color.red;
                statusPointLights[index].intensity = active ? 1.5f : 0.2f;
            }
        }

        public void TriggerPanelSuccessAnimation()
        {
            StartCoroutine(SuccessPulseRoutine());
        }

        private IEnumerator SuccessPulseRoutine()
        {
            AudioManager.Instance?.PlaySFX(SFXType.Correct);

            for (int r = 0; r < 4; r++)
            {
                foreach (var light in statusPointLights) if (light != null) light.intensity = 2.5f;
                if (masterCircuitLight != null) masterCircuitLight.intensity = 3.0f;
                yield return new WaitForSeconds(0.15f);
                foreach (var light in statusPointLights) if (light != null) light.intensity = 0.5f;
                if (masterCircuitLight != null) masterCircuitLight.intensity = 0.5f;
                yield return new WaitForSeconds(0.15f);
            }

            foreach (var light in statusPointLights) if (light != null) light.intensity = 1.8f;
            if (masterCircuitLight != null) masterCircuitLight.intensity = 2.0f;
        }
    }
}
