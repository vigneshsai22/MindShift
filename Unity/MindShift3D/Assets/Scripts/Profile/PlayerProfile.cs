// ═══════════════════════════════════════════════════════════════
// MindShift 3D — PlayerProfile + SessionData (Data Models)
// Serializable data classes. Direct port of the JSON structures
// from ProfileManager.js and SessionManager.js.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections.Generic;

namespace MindShift.Profile
{
    // ── Player Profile ────────────────────────────────────────────
    // Maps to the profile object in ProfileManager.js
    [Serializable]
    public class PlayerProfile
    {
        public string id;
        public string playerName;
        public int    level        = 1;
        public int    xp           = 0;
        public int    gamesPlayed  = 0;
        public int    totalScore   = 0;
        public int    bestScore    = 0;
        public string createdAt;
        public string lastPlayed;

        // Per-category cognitive scores (0–100)
        public CognitiveCategoryScores cognitiveScores = new CognitiveCategoryScores();

        // Unlocked achievement IDs
        public List<string> achievements = new List<string>();

        // Session history (last 20)
        public List<SessionData> sessions = new List<SessionData>();
    }

    // ── Cognitive Category Scores ─────────────────────────────────
    [Serializable]
    public class CognitiveCategoryScores
    {
        // Performance Score 0.0–1.0, stored as int 0–100 for serialization
        public int memory      = 55;
        public int logic       = 55;
        public int observation = 55;
        public int reaction    = 55;
        public int spatial     = 55;
        public int audio       = 55;
        public int pattern     = 55;
    }

    // ── Session Data ──────────────────────────────────────────────
    // Maps to getSummary() in SessionManager.js
    [Serializable]
    public class SessionData
    {
        public int    sessionNumber;
        public string date;
        public int    duration;             // seconds
        public int    totalScore;
        public float  percentage;
        public int    challengesCompleted;
        public float  overallAccuracy;      // 0–100
        public float  avgResponseTime;      // seconds
        public int    bestStreak;
        public int    hintsUsed;

        // Category breakdown
        public CategorySessionResult memory;
        public CategorySessionResult logic;
        public CategorySessionResult observation;
        public CategorySessionResult reaction;
        public CategorySessionResult spatial;
        public CategorySessionResult audio;
        public CategorySessionResult pattern;
    }

    [Serializable]
    public class CategorySessionResult
    {
        public int   score;
        public float accuracy;    // 0–100
        public float avgTime;     // seconds
        public int   hints;
    }
}
