// ═══════════════════════════════════════════════════════════════
// MindShift 3D — ResultsUI
// Comprehensive post-session cognitive performance dashboard.
// Displays overall scores, cognitive grade/rank, category breakdown,
// textual insights, and drives RadarChart, BarChart, and LineChart.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MindShift.Analytics;
using MindShift.Core;
using MindShift.Profile;
using MindShift.Challenges;
using MindShift.Storage;

namespace MindShift.UI
{
    public class ResultsUI : MonoBehaviour
    {
        // ── Inspector References ──────────────────────────────────
        [Header("Overview Displays")]
        public Text scoreTotalText;
        public Text rankTitleText;
        public Text accuracyValueText;
        public Text avgTimeValueText;
        public Text bestStreakValueText;
        public Text hintsCountText;

        [Header("Insight Text")]
        public Text insightsBodyText;

        [Header("Chart Visualizers")]
        public RadarChart radarChart;
        public BarChart   barChart;
        public LineChart  lineChart;

        [Header("Action Buttons")]
        public Button playAgainButton;
        public Button lobbyButton;
        public Button mainMenuButton;

        // ── Initialization ────────────────────────────────────────
        private void Awake()
        {
            if (playAgainButton != null)
                playAgainButton.onClick.AddListener(OnPlayAgainClicked);

            if (lobbyButton != null)
                lobbyButton.onClick.AddListener(OnLobbyClicked);

            if (mainMenuButton != null)
                mainMenuButton.onClick.AddListener(OnMainMenuClicked);
        }

        // ── Data Binding ──────────────────────────────────────────
        public void PopulateResults()
        {
            var profile = GameManager.Instance?.ActiveProfile;
            int sessionIndex = (profile != null ? profile.sessionHistory.Count + 1 : 1);

            SessionData currentSession = AnalyticsManager.Instance != null
                ? AnalyticsManager.Instance.BuildSessionSummary(sessionIndex)
                : new SessionData();

            SessionData previousSession = null;
            if (profile != null && profile.sessionHistory.Count > 0)
            {
                previousSession = profile.sessionHistory[profile.sessionHistory.Count - 1];
            }

            // 1. Overview numbers
            if (scoreTotalText != null)
                scoreTotalText.text = $"{currentSession.totalScore:N0}";

            if (accuracyValueText != null)
                accuracyValueText.text = $"{currentSession.overallAccuracy:F0}%";

            if (avgTimeValueText != null)
                avgTimeValueText.text = $"{currentSession.avgResponseTime:F1}s";

            if (bestStreakValueText != null)
                bestStreakValueText.text = $"{currentSession.bestStreak}";

            if (hintsCountText != null)
                hintsCountText.text = $"{currentSession.hintsUsed}";

            // 2. Rank calculation
            string rankTitle = CalculateCognitiveRank(currentSession.overallAccuracy, currentSession.totalScore);
            if (rankTitleText != null)
                rankTitleText.text = rankTitle;

            // 3. Textual insights
            if (insightsBodyText != null && AnalyticsManager.Instance != null)
            {
                var insights = AnalyticsManager.Instance.GenerateInsights(currentSession, previousSession);
                insightsBodyText.text = insights.Count > 0 ? "• " + string.Join("\n• ", insights) : "Session completed. Continue training to uncover deeper cognitive patterns.";
            }

            // 4. Update Charts
            UpdateRadarChart(currentSession);
            UpdateBarChart(currentSession);
            UpdateLineChart(profile, currentSession);

            // 5. Append and persist session to profile
            if (profile != null)
            {
                profile.sessionHistory.Add(currentSession);
                profile.totalScore += currentSession.totalScore;
                SaveLoadManager.Instance?.SaveProfile(profile);
            }
        }

        private void UpdateRadarChart(SessionData session)
        {
            if (radarChart == null || session == null) return;

            // Order: Memory, Observation, Logic, Reaction, Spatial, Audio
            float[] values = new float[]
            {
                Mathf.Clamp01(session.memory.accuracy / 100f),
                Mathf.Clamp01(session.observation.accuracy / 100f),
                Mathf.Clamp01(session.logic.accuracy / 100f),
                Mathf.Clamp01(session.reaction.accuracy / 100f),
                Mathf.Clamp01(session.spatial.accuracy / 100f),
                Mathf.Clamp01(session.audio.accuracy / 100f)
            };

            // Ensure non-zero visual presence for played categories
            for (int i = 0; i < values.Length; i++)
            {
                if (values[i] <= 0f) values[i] = 0.25f;
            }

            radarChart.SetValues(values);
        }

        private void UpdateBarChart(SessionData session)
        {
            if (barChart == null || session == null) return;

            float[] values = new float[]
            {
                Mathf.Clamp01(session.memory.accuracy / 100f),
                Mathf.Clamp01(session.observation.accuracy / 100f),
                Mathf.Clamp01(session.logic.accuracy / 100f),
                Mathf.Clamp01(session.reaction.accuracy / 100f),
                Mathf.Clamp01(session.spatial.accuracy / 100f),
                Mathf.Clamp01(session.audio.accuracy / 100f)
            };

            barChart.SetValues(values);
        }

        private void UpdateLineChart(PlayerProfile profile, SessionData currentSession)
        {
            if (lineChart == null) return;

            var points = new List<float>();

            if (profile != null && profile.sessionHistory != null)
            {
                int maxHistory = Mathf.Min(6, profile.sessionHistory.Count);
                int start = profile.sessionHistory.Count - maxHistory;

                for (int i = start; i < profile.sessionHistory.Count; i++)
                {
                    points.Add(Mathf.Clamp01(profile.sessionHistory[i].overallAccuracy / 100f));
                }
            }

            points.Add(Mathf.Clamp01(currentSession.overallAccuracy / 100f));

            if (points.Count < 2)
            {
                points.Insert(0, 0.5f); // default baseline
            }

            lineChart.SetPoints(points.ToArray());
        }

        private string CalculateCognitiveRank(float accuracy, int score)
        {
            if (accuracy >= 90f && score >= 2000) return "COGNITIVE MASTER (RANK S)";
            if (accuracy >= 80f && score >= 1500) return "EXPERT ANALYST (RANK A)";
            if (accuracy >= 70f)                  return "PROFICIENT OPERATIVE (RANK B)";
            if (accuracy >= 55f)                  return "APPRENTICE (RANK C)";
            return "NOVICE TRAINEE (RANK D)";
        }

        // ── Button Handlers ───────────────────────────────────────
        private void OnPlayAgainClicked()
        {
            GameManager.Instance?.StartNewSession();
            SceneLoader.Instance?.LoadScene(GameManager.SCENE_LOBBY);
        }

        private void OnLobbyClicked()
        {
            SceneLoader.Instance?.LoadScene(GameManager.SCENE_LOBBY);
        }

        private void OnMainMenuClicked()
        {
            SceneLoader.Instance?.LoadScene(GameManager.SCENE_MAIN_MENU);
        }
    }
}
