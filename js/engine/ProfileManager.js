/* ═══════════════════════════════════════════════
   MindShift — ProfileManager (LocalStorage)
   ═══════════════════════════════════════════════ */

const STORAGE_KEY = 'mindshift_profiles';

export class ProfileManager {
  constructor() {
    this._cache = null;
  }

  // ── Private ───────────────────────────────────
  _load() {
    if (this._cache) return this._cache;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this._cache = raw ? JSON.parse(raw) : { profiles: [] };
    } catch {
      this._cache = { profiles: [] };
    }
    return this._cache;
  }

  _save(data) {
    this._cache = data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('ProfileManager: could not save to localStorage', e);
    }
  }

  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ── Public API ────────────────────────────────

  /** Get all profiles */
  getProfiles() {
    return this._load().profiles;
  }

  /** Get single profile by id */
  getProfile(id) {
    return this._load().profiles.find(p => p.id === id) || null;
  }

  /**
   * Create a new profile.
   * @param {string} name
   * @param {number} avatarIndex  0–5
   * @returns {object} new profile
   */
  createProfile(name, avatarIndex = 0) {
    const data = this._load();
    const profile = {
      id:           this._uuid(),
      name:         name.trim(),
      avatar:       avatarIndex,
      created:      Date.now(),
      gamesPlayed:  0,
      totalScore:   0,
      bestScore:    0,
      achievements: [],
      sessions:     [],
      categoryBests: {
        logical: 0, pattern: 0, memory: 0,
        visual: 0, reaction: 0, audio: 0
      }
    };
    data.profiles.push(profile);
    this._save(data);
    return profile;
  }

  /** Update top-level fields on a profile */
  updateProfile(id, updates) {
    const data = this._load();
    const idx  = data.profiles.findIndex(p => p.id === id);
    if (idx < 0) return null;
    data.profiles[idx] = { ...data.profiles[idx], ...updates };
    this._save(data);
    return data.profiles[idx];
  }

  /** Delete profile */
  deleteProfile(id) {
    const data = this._load();
    data.profiles = data.profiles.filter(p => p.id !== id);
    this._save(data);
  }

  /**
   * Record a completed session on a profile.
   * @param {string} profileId
   * @param {object} sessionSummary
   */
  saveSession(profileId, sessionSummary) {
    const data = this._load();
    const idx  = data.profiles.findIndex(p => p.id === profileId);
    if (idx < 0) return;

    const p = data.profiles[idx];
    // Keep last 20 sessions
    p.sessions = [sessionSummary, ...p.sessions].slice(0, 20);
    p.gamesPlayed += 1;
    p.totalScore  += sessionSummary.totalScore || 0;
    if ((sessionSummary.totalScore || 0) > p.bestScore) {
      p.bestScore = sessionSummary.totalScore;
    }

    // Update category bests
    Object.keys(p.categoryBests).forEach(cat => {
      const sc = sessionSummary.categoryScores?.[cat] ?? 0;
      if (sc > p.categoryBests[cat]) p.categoryBests[cat] = sc;
    });

    this._save(data);
    return p;
  }

  /** Unlock achievement for a profile (idempotent) */
  unlockAchievement(profileId, achievementId) {
    const data = this._load();
    const p    = data.profiles.find(p => p.id === profileId);
    if (!p) return false;
    if (p.achievements.find(a => a.id === achievementId)) return false; // already unlocked
    p.achievements.push({ id: achievementId, date: Date.now() });
    this._save(data);
    return true;
  }

  /** Check if achievement is unlocked */
  hasAchievement(profileId, achievementId) {
    const p = this.getProfile(profileId);
    return p ? !!p.achievements.find(a => a.id === achievementId) : false;
  }

  /** Get last N sessions for a profile */
  getRecentSessions(profileId, n = 5) {
    const p = this.getProfile(profileId);
    return p ? p.sessions.slice(0, n) : [];
  }

  /** Clear ALL data (dev/reset) */
  clearAll() {
    this._cache = { profiles: [] };
    localStorage.removeItem(STORAGE_KEY);
  }
}
