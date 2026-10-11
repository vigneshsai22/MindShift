// ═══════════════════════════════════════════════════════════════
// MindShift 3D — SaveLoadManager
// JSON file persistence for PlayerProfile + session history.
// Ported from ProfileManager.js (localStorage) → C# File I/O.
// Path: Application.persistentDataPath (cross-platform)
// ═══════════════════════════════════════════════════════════════
using System;
using System.IO;
using UnityEngine;
using MindShift.Profile;
using MindShift.Core;

namespace MindShift.Storage
{
    public class SaveLoadManager : Singleton<SaveLoadManager>
    {
        // ── File paths ────────────────────────────────────────────
        private string ProfilePath    => Path.Combine(Application.persistentDataPath, "player_profile.json");
        private string SettingsPath   => Path.Combine(Application.persistentDataPath, "settings.json");
        private string AchievePath    => Path.Combine(Application.persistentDataPath, "achievements.json");

        // ── Player Profile ────────────────────────────────────────
        // Mirrors _save() / _load() from ProfileManager.js
        public void SaveProfile(PlayerProfile profile)
        {
            try
            {
                profile.lastPlayed = DateTime.Now.ToString("yyyy-MM-dd");
                string json = JsonUtility.ToJson(profile, true);
                File.WriteAllText(ProfilePath, json);
                Debug.Log($"[SaveLoad] Profile saved: {ProfilePath}");
            }
            catch (Exception e)
            {
                Debug.LogError($"[SaveLoad] Failed to save profile: {e.Message}");
            }
        }

        public PlayerProfile LoadProfile()
        {
            try
            {
                if (!File.Exists(ProfilePath)) return null;
                string json = File.ReadAllText(ProfilePath);
                return JsonUtility.FromJson<PlayerProfile>(json);
            }
            catch (Exception e)
            {
                Debug.LogError($"[SaveLoad] Failed to load profile: {e.Message}");
                return null;
            }
        }

        /// <summary>Creates a new profile with defaults — mirrors createProfile() from JS.</summary>
        public PlayerProfile CreateDefaultProfile(string playerName)
        {
            var profile = new PlayerProfile
            {
                id          = Guid.NewGuid().ToString(),
                playerName  = playerName,
                level       = 1,
                xp          = 0,
                gamesPlayed = 0,
                totalScore  = 0,
                bestScore   = 0,
                createdAt   = DateTime.Now.ToString("yyyy-MM-dd"),
                lastPlayed  = DateTime.Now.ToString("yyyy-MM-dd")
            };
            SaveProfile(profile);
            return profile;
        }

        /// <summary>Appends a session to the profile's history (keeps last 20 — mirrors JS slice(0,20)).</summary>
        public void SaveSession(PlayerProfile profile, SessionData session)
        {
            // Insert at front, keep last 20
            profile.sessions.Insert(0, session);
            if (profile.sessions.Count > 20)
                profile.sessions.RemoveAt(20);

            profile.gamesPlayed++;
            profile.totalScore += session.totalScore;
            if (session.totalScore > profile.bestScore)
                profile.bestScore = session.totalScore;

            SaveProfile(profile);
        }

        // ── Achievements ──────────────────────────────────────────
        public void UnlockAchievement(PlayerProfile profile, string achievementId)
        {
            if (profile.achievements.Contains(achievementId)) return;
            profile.achievements.Add(achievementId);
            SaveProfile(profile);
        }

        public bool HasAchievement(PlayerProfile profile, string achievementId) =>
            profile.achievements.Contains(achievementId);

        // ── Settings ──────────────────────────────────────────────
        public void SaveSetting(string key, float value) =>
            PlayerPrefs.SetFloat($"MindShift_{key}", value);

        public float LoadSetting(string key, float defaultValue = 1f) =>
            PlayerPrefs.GetFloat($"MindShift_{key}", defaultValue);

        public void SaveSetting(string key, int value) =>
            PlayerPrefs.SetInt($"MindShift_{key}", value);

        public int LoadSetting(string key, int defaultValue = 0) =>
            PlayerPrefs.GetInt($"MindShift_{key}", defaultValue);

        // ── Debug ─────────────────────────────────────────────────
        public void ClearAll()
        {
            if (File.Exists(ProfilePath))  File.Delete(ProfilePath);
            if (File.Exists(SettingsPath)) File.Delete(SettingsPath);
            if (File.Exists(AchievePath))  File.Delete(AchievePath);
            PlayerPrefs.DeleteAll();
            Debug.Log("[SaveLoad] All data cleared.");
        }
    }
}
