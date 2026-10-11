// ═══════════════════════════════════════════════════════════════
// MindShift 3D — MemoryChallenge
// OBSERVE objects on table → BLACKOUT → RECALL what changed.
// Ported from MemoryChallenge.js (show→hide→recall pattern).
// ═══════════════════════════════════════════════════════════════
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using MindShift.Audio;
using MindShift.Environment;

namespace MindShift.Challenges
{
    public class MemoryChallenge : ChallengeBase
    {
        // ── Inspector ─────────────────────────────────────────────
        [Header("Memory Lab References")]
        [Tooltip("Pedestal GameObjects — must be at least 7 in the scene.")]
        public List<MemoryObjectPedestal> pedestals;

        [Tooltip("Pool of prefabs that can be placed on pedestals.")]
        public List<GameObject> objectPrefabs;

        public Light  roomLight;
        public float  blackoutLightIntensity = 0.05f;
        public float  normalLightIntensity   = 1.0f;

        // ── Private State ─────────────────────────────────────────
        private enum Phase { Observe, Blackout, Recall, Done }
        private Phase _phase;

        // Maps pedestal index → the object currently on it
        private Dictionary<int, GameObject> _spawnedObjects = new Dictionary<int, GameObject>();

        // Which pedestals had their state changed during blackout
        private HashSet<int> _changedPedestals = new HashSet<int>();

        // Player's click answers
        private HashSet<int> _playerSelections = new HashSet<int>();
        private int _correctAnswers  = 0;
        private int _wrongClicks     = 0;

        // ── Lifecycle ─────────────────────────────────────────────
        public override void SetupChallenge()
        {
            _spawnedObjects.Clear();
            _changedPedestals.Clear();
            _playerSelections.Clear();
            _correctAnswers = 0;
            _wrongClicks    = 0;

            SpawnObjects();
        }

        public override void StartChallenge()
        {
            base.StartChallenge();
            _phase = Phase.Observe;
            StartCoroutine(ChallengeRoutine());
        }

        public override void TeardownChallenge()
        {
            // Destroy all spawned objects
            foreach (var go in _spawnedObjects.Values)
                if (go != null) Destroy(go);

            _spawnedObjects.Clear();

            // Reset room light
            if (roomLight != null) roomLight.intensity = normalLightIntensity;

            // Deactivate pedestals
            foreach (var p in pedestals) p.Deactivate();
        }

        // ── Routine ───────────────────────────────────────────────
        private IEnumerator ChallengeRoutine()
        {
            // ── OBSERVE phase ──
            _phase = Phase.Observe;
            ActivatePedestals(false);                    // not clickable yet
            AudioManager.Instance?.PlaySFX(SFXType.ObservationStart);

            yield return new WaitForSeconds(Config.memoryObservationTime);

            // ── BLACKOUT ──
            _phase = Phase.Blackout;
            yield return StartCoroutine(Blackout());

            // Make changes during blackout
            ApplyChanges();

            yield return new WaitForSeconds(1.5f);       // blackout hold

            // ── RECALL phase ──
            _phase = Phase.Recall;
            yield return StartCoroutine(RestoreLight());
            ActivatePedestals(true);                     // now clickable
            AudioManager.Instance?.PlaySFX(SFXType.RecallStart);

            // ChallengeBase timer handles timeout → OnTimeExpired
        }

        // ── Object Spawning ───────────────────────────────────────
        private void SpawnObjects()
        {
            int count = Config.memoryObjectCount;
            // Shuffle pedestals
            List<int> indices = new List<int>();
            for (int i = 0; i < pedestals.Count; i++) indices.Add(i);
            Shuffle(indices);

            for (int i = 0; i < Mathf.Min(count, indices.Count); i++)
            {
                int pidx = indices[i];
                GameObject prefab = objectPrefabs[Random.Range(0, objectPrefabs.Count)];
                Vector3 spawnPos  = pedestals[pidx].SpawnPoint.position;
                GameObject go     = Instantiate(prefab, spawnPos, Quaternion.identity);
                go.transform.SetParent(pedestals[pidx].transform);
                _spawnedObjects[pidx] = go;
                pedestals[pidx].SetObject(go, false);
            }
        }

        // ── Apply Changes During Blackout ─────────────────────────
        private void ApplyChanges()
        {
            List<int> usedPedestals = new List<int>(_spawnedObjects.Keys);
            Shuffle(usedPedestals);

            int changeCount = Mathf.Min(Config.memoryChangeCount, usedPedestals.Count);

            for (int i = 0; i < changeCount; i++)
            {
                int pidx = usedPedestals[i];
                // Remove the existing object
                if (_spawnedObjects.TryGetValue(pidx, out GameObject existing))
                    Destroy(existing);

                // Spawn a different object
                GameObject prefab = objectPrefabs[Random.Range(0, objectPrefabs.Count)];
                GameObject go     = Instantiate(prefab, pedestals[pidx].SpawnPoint.position, Quaternion.identity);
                go.transform.SetParent(pedestals[pidx].transform);
                _spawnedObjects[pidx] = go;
                _changedPedestals.Add(pidx);
            }
        }

        // ── Lighting ──────────────────────────────────────────────
        private IEnumerator Blackout()
        {
            float t = 0f; float dur = 1.2f;
            float startIntensity = roomLight != null ? roomLight.intensity : 1f;
            while (t < dur)
            {
                t += Time.deltaTime;
                if (roomLight != null)
                    roomLight.intensity = Mathf.Lerp(startIntensity, blackoutLightIntensity, t / dur);
                yield return null;
            }
        }

        private IEnumerator RestoreLight()
        {
            float t = 0f; float dur = 0.8f;
            float startIntensity = roomLight != null ? roomLight.intensity : blackoutLightIntensity;
            while (t < dur)
            {
                t += Time.deltaTime;
                if (roomLight != null)
                    roomLight.intensity = Mathf.Lerp(startIntensity, normalLightIntensity, t / dur);
                yield return null;
            }
        }

        // ── Pedestal Interaction ──────────────────────────────────
        private void ActivatePedestals(bool interactive)
        {
            foreach (var kvp in _spawnedObjects)
                pedestals[kvp.Key].SetInteractive(interactive, OnPedestalClicked);
        }

        private void OnPedestalClicked(int pedestalIndex)
        {
            if (_phase != Phase.Recall || IsResolved) return;

            bool alreadySelected = _playerSelections.Contains(pedestalIndex);

            if (alreadySelected)
            {
                _playerSelections.Remove(pedestalIndex);
                pedestals[pedestalIndex].SetHighlight(false);
            }
            else
            {
                _playerSelections.Add(pedestalIndex);
                pedestals[pedestalIndex].SetHighlight(true);
            }
        }

        // ── Submit Answer (called by UI "Submit" button) ──────────
        public void SubmitAnswer()
        {
            if (_phase != Phase.Recall || IsResolved) return;
            EvaluateAnswers();
        }

        private void EvaluateAnswers()
        {
            _correctAnswers = 0;
            _wrongClicks    = 0;

            foreach (int selected in _playerSelections)
            {
                if (_changedPedestals.Contains(selected))
                    _correctAnswers++;
                else
                    _wrongClicks++;
            }

            // Missed correct ones count as wrong attempts
            int missed = 0;
            foreach (int changed in _changedPedestals)
                if (!_playerSelections.Contains(changed))
                    missed++;

            WrongAttempts += _wrongClicks + missed;     // expose to base class

            // Show feedback
            foreach (var kvp in _spawnedObjects)
            {
                bool wasChanged = _changedPedestals.Contains(kvp.Key);
                bool wasSelected = _playerSelections.Contains(kvp.Key);

                if (wasChanged && wasSelected)  pedestals[kvp.Key].ShowResult(true);
                if (wasChanged && !wasSelected) pedestals[kvp.Key].ShowResult(false);
                if (!wasChanged && wasSelected) pedestals[kvp.Key].ShowWrongSelection();
            }

            bool fullCredit = _correctAnswers == _changedPedestals.Count && _wrongClicks == 0;

            if (fullCredit) RegisterCorrect();
            else            RegisterWrongAttempt();

            // Resolve after brief feedback delay
            StartCoroutine(DelayedResolve(1.5f, fullCredit, _correctAnswers, _changedPedestals.Count));
        }

        private IEnumerator DelayedResolve(float delay, bool correct, int correctCount, int total)
        {
            yield return new WaitForSeconds(delay);
            Resolve(correct, correctCount, total);
        }

        protected override void OnTimeExpired()
        {
            if (_phase == Phase.Recall)
                EvaluateAnswers();
            else
                Resolve(false);
        }

        // ── Utility ───────────────────────────────────────────────
        private void Shuffle<T>(List<T> list)
        {
            for (int i = list.Count - 1; i > 0; i--)
            {
                int j = Random.Range(0, i + 1);
                (list[i], list[j]) = (list[j], list[i]);
            }
        }
    }
}
