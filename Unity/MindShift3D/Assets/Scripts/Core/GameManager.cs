// ═══════════════════════════════════════════════════════════════
// MindShift 3D — GameManager
// Central game-state FSM. Entry point for all major state changes.
// Ported and extended from the 2D JS GameEngine.js concept.
// ═══════════════════════════════════════════════════════════════
using UnityEngine;
using MindShift.Storage;
using MindShift.Profile;
using MindShift.Audio;
using MindShift.UI;

namespace MindShift.Core
{
    public enum GameState
    {
        Boot,
        MainMenu,
        Lobby,
        PreChallenge,
        InChallenge,
        PostChallenge,
        Results,
        Profile,
        Achievements,
        Settings,
        Paused
    }

    public class GameManager : Singleton<GameManager>
    {
        // ── State ────────────────────────────────────────────────
        public GameState CurrentState { get; private set; } = GameState.Boot;
        private GameState _stateBeforePause;

        // ── References (assign in Inspector or via code) ─────────
        [Header("Scene Names")]
        public string mainMenuScene    = "MainMenu";
        public string lobbyScene       = "Lobby";
        public string resultsScene     = "Results";

        // ── Events ───────────────────────────────────────────────
        public System.Action<GameState> OnStateChanged;

        // ── Active Player ────────────────────────────────────────
        public PlayerProfile ActiveProfile { get; private set; }

        // ─────────────────────────────────────────────────────────
        protected override void Awake()
        {
            base.Awake();
            Application.targetFrameRate = 60;
        }

        private void Start()
        {
            TransitionTo(GameState.MainMenu);
        }

        // ── State Machine ─────────────────────────────────────────
        public void TransitionTo(GameState newState)
        {
            Debug.Log($"[GameManager] {CurrentState} → {newState}");
            CurrentState = newState;
            OnStateChanged?.Invoke(newState);
            HandleStateEntry(newState);
        }

        private void HandleStateEntry(GameState state)
        {
            switch (state)
            {
                case GameState.MainMenu:
                    SceneLoader.Instance.LoadScene(mainMenuScene);
                    break;

                case GameState.Lobby:
                    SceneLoader.Instance.LoadScene(lobbyScene);
                    break;

                case GameState.Results:
                    SceneLoader.Instance.LoadScene(resultsScene);
                    break;

                case GameState.Paused:
                    Time.timeScale = 0f;
                    UIManager.Instance.ShowPauseMenu(true);
                    break;
            }
        }

        // ── Profile Management ────────────────────────────────────
        public void SetActiveProfile(PlayerProfile profile)
        {
            ActiveProfile = profile;
            Debug.Log($"[GameManager] Active profile: {profile.playerName} (Lv {profile.level})");
        }

        public void LoadOrCreateProfile(string playerName)
        {
            var saveLoad = SaveLoadManager.Instance;
            var profile  = saveLoad.LoadProfile();

            if (profile == null || profile.playerName != playerName)
            {
                profile = new PlayerProfile
                {
                    id         = System.Guid.NewGuid().ToString(),
                    playerName = playerName,
                    level      = 1,
                    xp         = 0
                };
                saveLoad.SaveProfile(profile);
            }

            SetActiveProfile(profile);
        }

        // ── Pause ─────────────────────────────────────────────────
        public void PauseGame()
        {
            if (CurrentState == GameState.InChallenge || CurrentState == GameState.Lobby)
            {
                _stateBeforePause = CurrentState;
                TransitionTo(GameState.Paused);
            }
        }

        public void ResumeGame()
        {
            if (CurrentState == GameState.Paused)
            {
                Time.timeScale = 1f;
                UIManager.Instance.ShowPauseMenu(false);
                CurrentState = _stateBeforePause;
                OnStateChanged?.Invoke(CurrentState);
            }
        }

        public void QuitToMenu()
        {
            Time.timeScale = 1f;
            TransitionTo(GameState.MainMenu);
        }

        public void QuitGame()
        {
#if UNITY_EDITOR
            UnityEditor.EditorApplication.isPlaying = false;
#else
            Application.Quit();
#endif
        }
    }
}
