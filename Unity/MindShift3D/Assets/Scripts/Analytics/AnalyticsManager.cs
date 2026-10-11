// ═══════════════════════════════════════════════════════════════
// MindShift 3D — AnalyticsManager
// Accumulates session data, generates textual insights.
// Ported from SessionManager.js — getSummary(), categoryScores(),
// rollingAccuracy(), avgResponseTime() all reproduced here.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections.Generic;
using UnityEngine;
using MindShift.Challenges;
using MindShift.Core;
using MindShift.Profile;

namespace MindShift.Analytics
{
    public class AnalyticsManager : Singleton<AnalyticsManager>
    {
        // ── Session State ─────────────────────────────────────────
        private List<ChallengeResult> _sessionResults = new List<ChallengeResult>();
        private DateTime              _sessionStartTime;
        private int                   _currentStreak;
        private int                   _bestStreak;
        private int                   _totalScore;
        private int                   _totalHints;

        // ─────────────────────────────────────────────────────────
        public void StartSession()
        {
            _sessionResults.Clear();
            _sessionStartTime = DateTime.Now;
            _currentStreak = 0;
            _bestStreak    = 0;
            _totalScore    = 0;
            _totalHints    = 0;
        }

        // ── Record one completed challenge ────────────────────────
        // Mirrors record() from SessionManager.js
        public void RecordChallenge(ChallengeResult result)
        {
            _sessionResults.Add(result);
            _totalScore += result.rawScore;
            _totalHints += result.hintsUsed;

            // Streak
            if (result.correct)
            {
                _currentStreak++;
                if (_currentStreak > _bestStreak) _bestStreak = _currentStreak;
            }
            else
            {
                _currentStreak = 0;
            }

            Debug.Log($"[Analytics] Recorded {result.type}: score={result.rawScore} correct={result.correct}");
        }

        // ── Build Session Summary ─────────────────────────────────
        // Mirrors getSummary() from SessionManager.js
        public SessionData BuildSessionSummary(int sessionNumber)
        {
            double duration = (DateTime.Now - _sessionStartTime).TotalSeconds;

            var summary = new SessionData
            {
                sessionNumber      = sessionNumber,
                date               = DateTime.Now.ToString("yyyy-MM-dd"),
                duration           = (int)duration,
                totalScore         = _totalScore,
                challengesCompleted = _sessionResults.Count,
                overallAccuracy    = OverallAccuracy(),
                avgResponseTime    = AvgResponseTime(),
                bestStreak         = _bestStreak,
                hintsUsed          = _totalHints
            };

            // Category results
            summary.memory      = BuildCategoryResult(CognitiveCategory.Memory);
            summary.logic       = BuildCategoryResult(CognitiveCategory.Logic);
            summary.observation = BuildCategoryResult(CognitiveCategory.Observation);
            summary.reaction    = BuildCategoryResult(CognitiveCategory.Reaction);
            summary.spatial     = BuildCategoryResult(CognitiveCategory.Spatial);
            summary.audio       = BuildCategoryResult(CognitiveCategory.Audio);
            summary.pattern     = BuildCategoryResult(CognitiveCategory.Pattern);

            return summary;
        }

        // ── Category breakdown ────────────────────────────────────
        private CategorySessionResult BuildCategoryResult(CognitiveCategory cat)
        {
            var results = _sessionResults.FindAll(r => r.category == cat);
            if (results.Count == 0) return new CategorySessionResult();

            int   totalScore = 0;
            float totalAcc   = 0f;
            float totalTime  = 0f;
            int   totalHints = 0;

            foreach (var r in results)
            {
                totalScore += r.rawScore;
                totalAcc   += r.Accuracy * 100f;
                totalTime  += r.timeTaken;
                totalHints += r.hintsUsed;
            }

            return new CategorySessionResult
            {
                score    = totalScore,
                accuracy = totalAcc   / results.Count,
                avgTime  = totalTime  / results.Count,
                hints    = totalHints
            };
        }

        // ── Statistics ────────────────────────────────────────────
        // Mirrors overallAccuracy() from SessionManager.js
        public float OverallAccuracy()
        {
            if (_sessionResults.Count == 0) return 0f;
            float sum = 0f;
            foreach (var r in _sessionResults) sum += r.Accuracy;
            return (sum / _sessionResults.Count) * 100f;
        }

        // Mirrors avgResponseTime() from SessionManager.js
        public float AvgResponseTime()
        {
            if (_sessionResults.Count == 0) return 0f;
            float sum = 0f;
            foreach (var r in _sessionResults) sum += r.timeTaken;
            return sum / _sessionResults.Count;
        }

        public int TotalScore => _totalScore;
        public int BestStreak => _bestStreak;

        // ── Textual Insights ──────────────────────────────────────
        // Generates human-readable performance insights from session data
        // Mirrors the ResultsScreen.js insight generation logic
        public List<string> GenerateInsights(SessionData current, SessionData previous)
        {
            var insights = new List<string>();
            if (current == null) return insights;

            // Strongest and developing areas
            string strongest  = FindBestCategory(current);
            string developing = FindWorstCategory(current);

            if (!string.IsNullOrEmpty(strongest))
                insights.Add($"Strongest area: {strongest}");

            if (!string.IsNullOrEmpty(developing))
                insights.Add($"Developing area: {developing}");

            // Response time improvement
            if (previous != null && previous.avgResponseTime > 0f)
            {
                float improvement = ((previous.avgResponseTime - current.avgResponseTime)
                                    / previous.avgResponseTime) * 100f;
                if (improvement > 5f)
                    insights.Add($"Response speed improved {improvement:F0}% vs. last session");
                else if (improvement < -5f)
                    insights.Add($"Response time increased — try to stay focused");
            }

            // Hint usage advice
            if (current.hintsUsed >= 3)
                insights.Add($"Used {current.hintsUsed} hints — try tackling challenges without hints for higher scores");
            else if (current.hintsUsed == 0)
                insights.Add("Excellent! No hints used this session — maximum score potential");

            // Streak insight
            if (current.bestStreak >= 3)
                insights.Add($"Best streak: {current.bestStreak} correct in a row!");

            return insights;
        }

        private string FindBestCategory(SessionData s)
        {
            (string name, float acc) best = ("", 0f);
            CheckCategory("Memory",      s.memory,      ref best);
            CheckCategory("Logic",       s.logic,       ref best);
            CheckCategory("Observation", s.observation, ref best);
            CheckCategory("Reaction",    s.reaction,    ref best);
            CheckCategory("Spatial",     s.spatial,     ref best);
            CheckCategory("Audio",       s.audio,       ref best);
            CheckCategory("Pattern",     s.pattern,     ref best);
            return best.acc > 0f ? $"{best.name} ({best.acc:F0}%)" : "";
        }

        private string FindWorstCategory(SessionData s)
        {
            (string name, float acc) worst = ("", 101f);
            CheckWorst("Memory",      s.memory,      ref worst);
            CheckWorst("Logic",       s.logic,       ref worst);
            CheckWorst("Observation", s.observation, ref worst);
            CheckWorst("Reaction",    s.reaction,    ref worst);
            CheckWorst("Spatial",     s.spatial,     ref worst);
            CheckWorst("Audio",       s.audio,       ref worst);
            CheckWorst("Pattern",     s.pattern,     ref worst);
            return worst.acc < 100f ? $"{worst.name} ({worst.acc:F0}%)" : "";
        }

        private void CheckCategory(string name, CategorySessionResult cat, ref (string, float) best)
        {
            if (cat != null && cat.accuracy > best.Item2)
                best = (name, cat.accuracy);
        }

        private void CheckWorst(string name, CategorySessionResult cat, ref (string, float) worst)
        {
            if (cat != null && cat.score > 0 && cat.accuracy < worst.Item2)
                worst = (name, cat.accuracy);
        }
    }
}
