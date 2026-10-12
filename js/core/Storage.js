/* ═══════════════════════════════════════════════════════════════
   Storage.js — localStorage wrapper for profiles, runs, ghosts,
   leaderboard, and telemetry logs.
   Handles JSON serialisation, quota limits, and versioning.
   ═══════════════════════════════════════════════════════════════ */

const KEYS = {
  PROFILES:    'ms_profiles_v2',
  RUNS:        'ms_runs_v2',
  LEADERBOARD: 'ms_leaderboard_v2',
  SETTINGS:    'ms_settings_v2',
  TRIAL_LOG:   'ms_trial_log_v2',
};

const MAX_RUNS_PER_PROFILE = 30;
const MAX_LEADERBOARD = 50;
const MAX_TRIAL_LOG = 2000;

function _get(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function _set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[Storage] Write failed (quota?)', e);
  }
}

export const Storage = {

  /* ── Generic Key-Value Storage ─────────────────────────────── */
  get(key, defaultValue = null) {
    const val = _get(key);
    return val !== null && val !== undefined ? val : defaultValue;
  },

  set(key, value) {
    _set(key, value);
  },

  /* ── Profiles ──────────────────────────────────────────────── */
  getProfiles() {
    return _get(KEYS.PROFILES) || [];
  },

  saveProfiles(profiles) {
    _set(KEYS.PROFILES, profiles);
  },

  getProfile(id) {
    return this.getProfiles().find(p => p.id === id) || null;
  },

  upsertProfile(profile) {
    const all = this.getProfiles();
    const idx = all.findIndex(p => p.id === profile.id);
    if (idx >= 0) all[idx] = profile;
    else all.push(profile);
    this.saveProfiles(all);
  },

  deleteProfile(id) {
    this.saveProfiles(this.getProfiles().filter(p => p.id !== id));
    // Also clean up runs
    const runs = this.getRuns().filter(r => r.profileId !== id);
    _set(KEYS.RUNS, runs);
  },

  /* ── Run History & Ghost ───────────────────────────────────── */
  getRuns(profileId) {
    const all = _get(KEYS.RUNS) || [];
    return profileId ? all.filter(r => r.profileId === profileId) : all;
  },

  saveRun(runSummary) {
    const all = _get(KEYS.RUNS) || [];
    all.unshift(runSummary);
    // Cap per profile
    const byProfile = {};
    const kept = [];
    for (const r of all) {
      byProfile[r.profileId] = (byProfile[r.profileId] || 0) + 1;
      if (byProfile[r.profileId] <= MAX_RUNS_PER_PROFILE) kept.push(r);
    }
    _set(KEYS.RUNS, kept);
  },

  getGhostRun(profileId) {
    const runs = this.getRuns(profileId);
    return runs.length > 0 ? runs[0] : null;
  },

  /* ── Leaderboard ───────────────────────────────────────────── */
  getLeaderboard() {
    return _get(KEYS.LEADERBOARD) || [];
  },

  addLeaderboardEntry(entry) {
    // entry: { name, score, date, seed, profileId }
    const lb = this.getLeaderboard();
    lb.push(entry);
    lb.sort((a, b) => b.score - a.score);
    _set(KEYS.LEADERBOARD, lb.slice(0, MAX_LEADERBOARD));
  },

  /* ── Settings (volume, quality, accessibility) ─────────────── */
  getSettings() {
    return _get(KEYS.SETTINGS) || {
      masterVolume: 0.7,
      musicVolume: 0.5,
      sfxVolume: 0.7,
      quality: 'high',
      reducedMotion: false,
      colourBlindMode: 'none',
      captionSize: 16,
      adaptiveMode: 'elo',   // 'elo' | 'classic'
    };
  },

  saveSettings(settings) {
    _set(KEYS.SETTINGS, settings);
  },

  /* ── Trial Telemetry Log (for CSV export) ──────────────────── */
  getTrialLog() {
    return _get(KEYS.TRIAL_LOG) || [];
  },

  appendTrialLog(entry) {
    const log = this.getTrialLog();
    log.push(entry);
    if (log.length > MAX_TRIAL_LOG) log.splice(0, log.length - MAX_TRIAL_LOG);
    _set(KEYS.TRIAL_LOG, log);
  },

  exportTrialLogCSV() {
    const log = this.getTrialLog();
    if (!log.length) return '';
    const headers = Object.keys(log[0]);
    const rows = log.map(row => headers.map(h => {
      const v = row[h];
      return typeof v === 'string' ? `"${v}"` : v;
    }).join(','));
    return [headers.join(','), ...rows].join('\n');
  },

  exportTrialsCSV() {
    return this.exportTrialLogCSV();
  },

  /* ── Daily Seed ────────────────────────────────────────────── */
  getDailySeed() {
    const now = new Date();
    // Deterministic seed from date: YYYYMMDD as integer
    return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  },

  /* ── Full Reset ────────────────────────────────────────────── */
  clearAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  },
};
