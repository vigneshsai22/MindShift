// ═══════════════════════════════════════════════════════════════
// MindShift 3D — Singleton<T>
// Generic MonoBehaviour singleton base. Inherit from this instead
// of MonoBehaviour for any manager that must be unique per scene.
// ═══════════════════════════════════════════════════════════════
using UnityEngine;

namespace MindShift.Core
{
    public abstract class Singleton<T> : MonoBehaviour where T : MonoBehaviour
    {
        private static T _instance;
        private static readonly object _lock = new object();
        private static bool _applicationQuitting = false;

        public static T Instance
        {
            get
            {
                if (_applicationQuitting)
                {
                    Debug.LogWarning($"[Singleton] Instance of {typeof(T)} requested after application quit. Returning null.");
                    return null;
                }

                lock (_lock)
                {
                    if (_instance == null)
                    {
                        _instance = (T)FindObjectOfType(typeof(T));
                        if (_instance == null)
                        {
                            var go = new GameObject($"[{typeof(T).Name}]");
                            _instance = go.AddComponent<T>();
                            DontDestroyOnLoad(go);
                        }
                    }
                    return _instance;
                }
            }
        }

        protected virtual void Awake()
        {
            if (_instance == null)
            {
                _instance = this as T;
                DontDestroyOnLoad(gameObject);
            }
            else if (_instance != this)
            {
                Debug.LogWarning($"[Singleton] Duplicate instance of {typeof(T)} destroyed.");
                Destroy(gameObject);
            }
        }

        private void OnApplicationQuit()
        {
            _applicationQuitting = true;
        }
    }
}
