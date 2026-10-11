// ═══════════════════════════════════════════════════════════════
// MindShift 3D — LogicChallenge
// Mechanism panel with switches. Satisfy all logical rules.
// Ported from LogicalReasoning.js — rule evaluation, wrong attempt
// tracking, and animated switch state feedback.
// ═══════════════════════════════════════════════════════════════
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using TMPro;
using MindShift.Audio;

namespace MindShift.Challenges
{
    // ── Data Structures ───────────────────────────────────────────
    [System.Serializable]
    public class LogicRule
    {
        public int  switchA;         // index
        public int  switchB;         // index
        public bool aOnMeansBOn;     // if A is ON → B must be ON (true) or OFF (false)
        public bool isCompound;      // compound rules need a third condition
        public int  switchC;         // only used when isCompound = true
        public bool cRequired;       // what C must be

        public bool Evaluate(List<LogicSwitch> switches)
        {
            if (switchA >= switches.Count || switchB >= switches.Count) return true;
            bool aState = switches[switchA].IsOn;
            bool bState = switches[switchB].IsOn;

            if (!isCompound)
            {
                // If A is ON, then B must be in the required state
                if (aState) return bState == aOnMeansBOn;
                return true;   // rule only applies when A is on
            }
            else
            {
                if (switchC >= switches.Count) return true;
                bool cState = switches[switchC].IsOn;
                if (aState && bState) return cState == cRequired;
                return true;
            }
        }
    }

    // ── Challenge ─────────────────────────────────────────────────
    public class LogicChallenge : ChallengeBase
    {
        // ── Inspector ─────────────────────────────────────────────
        [Header("Logic Lab References")]
        public List<LogicSwitch>    switches;
        public TextMeshProUGUI      rulesDisplay;
        public TextMeshProUGUI      statusText;
        public GameObject           successEffect;
        public UnityEngine.UI.Button submitButton;

        // ── Generated rules ───────────────────────────────────────
        private List<LogicRule> _rules = new List<LogicRule>();
        private int             _submitAttempts = 0;

        // ── Lifecycle ─────────────────────────────────────────────
        public override void SetupChallenge()
        {
            _rules.Clear();
            _submitAttempts = 0;

            // Randomize initial switch states
            foreach (var sw in switches)
                sw.SetState(Random.value > 0.5f, false);

            GenerateRules();
            DisplayRules();

            if (submitButton != null)
                submitButton.onClick.AddListener(TrySubmit);
        }

        public override void StartChallenge()
        {
            base.StartChallenge();
            if (statusText != null) statusText.text = "Configure the switches to satisfy all rules.";
        }

        public override void TeardownChallenge()
        {
            if (submitButton != null) submitButton.onClick.RemoveAllListeners();
        }

        // ── Rule Generation ───────────────────────────────────────
        // Mirrors the rule-based puzzle generation concept from LogicalReasoning.js
        private void GenerateRules()
        {
            int complexity = Config.logicRuleComplexity;
            int ruleCount  = Config.logicRuleCount;

            for (int i = 0; i < ruleCount && i < switches.Count - 1; i++)
            {
                var rule = new LogicRule
                {
                    switchA      = i % switches.Count,
                    switchB      = (i + 1) % switches.Count,
                    aOnMeansBOn  = Random.value > 0.5f,
                    isCompound   = complexity == 2 && i % 2 == 0,
                    switchC      = (i + 2) % switches.Count,
                    cRequired    = Random.value > 0.5f
                };
                _rules.Add(rule);
            }
        }

        private void DisplayRules()
        {
            if (rulesDisplay == null) return;
            var sb = new System.Text.StringBuilder();
            sb.AppendLine("<b>RULES:</b>");
            for (int i = 0; i < _rules.Count; i++)
            {
                var r = _rules[i];
                string aLabel = $"SW{r.switchA + 1}";
                string bLabel = $"SW{r.switchB + 1}";
                string req    = r.aOnMeansBOn ? "ON" : "OFF";
                if (!r.isCompound)
                    sb.AppendLine($"• If {aLabel} is ON → {bLabel} must be {req}");
                else
                {
                    string cLabel = $"SW{r.switchC + 1}";
                    string cReq   = r.cRequired ? "ON" : "OFF";
                    sb.AppendLine($"• If {aLabel} ON and {bLabel} ON → {cLabel} must be {cReq}");
                }
            }
            rulesDisplay.text = sb.ToString();
        }

        // ── Submit ────────────────────────────────────────────────
        public void TrySubmit()
        {
            if (IsResolved) return;
            _submitAttempts++;

            bool allSatisfied = true;
            List<int> failedRules = new List<int>();

            for (int i = 0; i < _rules.Count; i++)
            {
                if (!_rules[i].Evaluate(switches))
                {
                    allSatisfied = false;
                    failedRules.Add(i);
                }
            }

            if (allSatisfied)
            {
                if (statusText != null) statusText.text = "✅ System Calibrated!";
                if (successEffect != null) successEffect.SetActive(true);
                AudioManager.Instance?.PlaySFX(SFXType.Correct);
                StartCoroutine(DelayedResolve(1.5f, true));
            }
            else
            {
                WrongAttempts++;
                AudioManager.Instance?.PlaySFX(SFXType.Wrong);

                // Highlight failed rule switches
                foreach (int rIdx in failedRules)
                    HighlightRule(_rules[rIdx], true);

                if (statusText != null)
                    statusText.text = $"⚠ {failedRules.Count} rule(s) violated. Adjust and retry.";

                // Clear highlights after 1.5s
                StartCoroutine(ClearHighlightsAfter(1.5f));
            }
        }

        private void HighlightRule(LogicRule rule, bool error)
        {
            Color c = error ? Color.red : Color.white;
            if (rule.switchA < switches.Count) switches[rule.switchA].SetHighlight(c);
            if (rule.switchB < switches.Count) switches[rule.switchB].SetHighlight(c);
        }

        private IEnumerator ClearHighlightsAfter(float delay)
        {
            yield return new WaitForSeconds(delay);
            foreach (var sw in switches) sw.SetHighlight(Color.white);
        }

        private IEnumerator DelayedResolve(float delay, bool correct)
        {
            yield return new WaitForSeconds(delay);
            Resolve(correct);
        }
    }
}
