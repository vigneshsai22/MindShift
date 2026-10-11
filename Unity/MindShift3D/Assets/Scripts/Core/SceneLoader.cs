// ═══════════════════════════════════════════════════════════════
// MindShift 3D — SceneLoader
// Async scene loading with a simple loading screen overlay.
// ═══════════════════════════════════════════════════════════════
using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;
using MindShift.UI;

namespace MindShift.Core
{
    public class SceneLoader : Singleton<SceneLoader>
    {
        [Header("Loading Config")]
        [Tooltip("Minimum time (seconds) to show the loading screen even if the scene loads faster.")]
        public float minLoadTime = 0.8f;

        public bool IsLoading { get; private set; }

        // ── Public API ────────────────────────────────────────────
        public void LoadScene(string sceneName)
        {
            if (!IsLoading)
                StartCoroutine(LoadAsync(sceneName));
        }

        // ── Internal ──────────────────────────────────────────────
        private IEnumerator LoadAsync(string sceneName)
        {
            IsLoading = true;

            // Show loading overlay if UIManager is available
            UIManager.Instance?.ShowLoadingScreen(true);

            float startTime = Time.realtimeSinceStartup;
            AsyncOperation op = SceneManager.LoadSceneAsync(sceneName);
            op.allowSceneActivation = false;

            while (!op.isDone)
            {
                float progress = Mathf.Clamp01(op.progress / 0.9f);
                UIManager.Instance?.SetLoadingProgress(progress);

                // Wait for minimum display time + scene ready
                bool timeElapsed = (Time.realtimeSinceStartup - startTime) >= minLoadTime;
                if (op.progress >= 0.9f && timeElapsed)
                    op.allowSceneActivation = true;

                yield return null;
            }

            UIManager.Instance?.ShowLoadingScreen(false);
            IsLoading = false;
        }
    }
}
