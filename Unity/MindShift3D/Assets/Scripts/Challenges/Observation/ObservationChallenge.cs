// ═══════════════════════════════════════════════════════════════
// MindShift 3D — ObservationChallenge (CCTV Anomaly Hunt)
// Plays a CCTV video clip showing the room BEFORE changes.
// Player then scans the real room with a raycast tool to tag anomalies.
// Ported from VisualObservation.js — tagging logic, false positive tracking.
// ═══════════════════════════════════════════════════════════════
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Video;
using TMPro;
using MindShift.Audio;

namespace MindShift.Challenges
{
    public class ObservationChallenge : ChallengeBase
    {
        // ── Inspector ─────────────────────────────────────────────
        [Header("Observation Lab References")]
        public VideoPlayer   cctvPlayer;         // plays CCTV clip on screens
        public List<AnomalyObject> anomalies;    // all anomaly objects in scene
        public TextMeshProUGUI statusText;
        public TextMeshProUGUI counterText;
        public UnityEngine.UI.Button submitButton;

        [Header("Scan Tool")]
        public float scanRange        = 5f;
        public LayerMask anomalyMask;
        public GameObject scanBeamEffect;       // optional visual scan effect

        // ── State ─────────────────────────────────────────────────
        private enum Phase { CCTV, Scan, Done }
        private Phase           _phase;
        private HashSet<int>    _taggedIndices  = new HashSet<int>();
        private int             _falsePositives = 0;
        private int             _activeAnomaly  = 0;   // count from config

        // ── Lifecycle ─────────────────────────────────────────────
        public override void SetupChallenge()
        {
            _taggedIndices.Clear();
            _falsePositives = 0;
            _activeAnomaly  = Mathf.Min(Config.observationAnomalyCount, anomalies.Count);

            // Activate correct number of anomalies, keep rest as normal
            for (int i = 0; i < anomalies.Count; i++)
                anomalies[i].SetActive(i < _activeAnomaly);

            if (submitButton != null) submitButton.onClick.AddListener(SubmitAnswer);
            UpdateCounter();
        }

        public override void StartChallenge()
        {
            base.StartChallenge();
            StartCoroutine(CCTVPhase());
        }

        public override void TeardownChallenge()
        {
            StopAllCoroutines();
            foreach (var a in anomalies) a.ClearHighlight();
            if (submitButton != null) submitButton.onClick.RemoveAllListeners();
            if (scanBeamEffect != null) scanBeamEffect.SetActive(false);
        }

        // ── CCTV Phase ────────────────────────────────────────────
        private IEnumerator CCTVPhase()
        {
            _phase = Phase.CCTV;
            if (statusText != null) statusText.text = "Watch the CCTV footage carefully…";

            // Temporarily hide anomaly changes (show original state)
            foreach (var a in anomalies) a.ShowOriginalState(true);

            if (cctvPlayer != null)
            {
                cctvPlayer.Play();
                yield return new WaitForSeconds((float)cctvPlayer.clip.length + 0.5f);
                cctvPlayer.Stop();
            }
            else
            {
                yield return new WaitForSeconds(15f);  // fallback if no video
            }

            // Show changed state
            foreach (var a in anomalies) a.ShowOriginalState(false);

            _phase = Phase.Scan;
            if (statusText != null) statusText.text = "Scan the room and tag the anomalies! [E] to tag";
            if (scanBeamEffect != null) scanBeamEffect.SetActive(true);
        }

        // ── Scan Input (called from PlayerController's Update context) ───
        private void Update()
        {
            if (_phase != Phase.Scan || IsResolved) return;

            if (Input.GetKeyDown(KeyCode.E))
                TryScan();
        }

        private void TryScan()
        {
            Camera cam = Camera.main;
            if (cam == null) return;

            Ray ray = new Ray(cam.transform.position, cam.transform.forward);
            if (Physics.Raycast(ray, out RaycastHit hit, scanRange, anomalyMask))
            {
                AnomalyObject anomaly = hit.collider.GetComponentInParent<AnomalyObject>();
                if (anomaly != null)
                    TagAnomaly(anomaly);
            }
        }

        private void TagAnomaly(AnomalyObject anomaly)
        {
            int idx = anomalies.IndexOf(anomaly);
            if (idx < 0) return;

            bool isRealAnomaly = anomaly.IsActive;

            if (_taggedIndices.Contains(idx))
            {
                // Untag
                _taggedIndices.Remove(idx);
                anomaly.SetTagged(false);
                if (!isRealAnomaly) _falsePositives = Mathf.Max(0, _falsePositives - 1);
            }
            else
            {
                // Tag
                _taggedIndices.Add(idx);
                anomaly.SetTagged(true);
                AudioManager.Instance?.PlaySFX(SFXType.ScanTag);

                if (!isRealAnomaly) _falsePositives++;
            }

            UpdateCounter();
        }

        // ── Submit ────────────────────────────────────────────────
        public void SubmitAnswer()
        {
            if (_phase != Phase.Scan || IsResolved) return;

            int correctTags = 0;
            int missed      = 0;

            for (int i = 0; i < anomalies.Count; i++)
            {
                bool isReal    = anomalies[i].IsActive;
                bool wasTagged = _taggedIndices.Contains(i);

                if (isReal && wasTagged)  { correctTags++; anomalies[i].ShowResult(true); }
                if (isReal && !wasTagged) { missed++;       anomalies[i].ShowResult(false); }
                if (!isReal && wasTagged) { anomalies[i].ShowFalsePositive(); }
            }

            WrongAttempts += missed + _falsePositives;

            bool pass = correctTags == _activeAnomaly && _falsePositives == 0;
            if (pass) RegisterCorrect();
            else      RegisterWrongAttempt();

            if (statusText != null)
                statusText.text = $"Found {correctTags}/{_activeAnomaly} | False positives: {_falsePositives}";

            StartCoroutine(DelayedResolve(2f, pass, correctTags, _activeAnomaly));
        }

        protected override void OnTimeExpired()
        {
            if (_phase == Phase.Scan) SubmitAnswer();
            else Resolve(false);
        }

        private void UpdateCounter()
        {
            if (counterText != null)
                counterText.text = $"Tagged: {_taggedIndices.Count}";
        }

        private IEnumerator DelayedResolve(float delay, bool correct, int correctCount, int total)
        {
            yield return new WaitForSeconds(delay);
            Resolve(correct, correctCount, total);
        }
    }
}
