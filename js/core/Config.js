/* ═══════════════════════════════════════════════════════════════
   Config.js — Game balance constants, graphics tokens, audio presets
   Central source of truth for every tunable value in the game.
   All formulas referenced here can be defended in a viva.
   ═══════════════════════════════════════════════════════════════ */

export const Config = Object.freeze({

  /* ── Elo / Glicko Rating System ────────────────────────────── */
  ELO: {
    INITIAL_RATING:   1200,
    INITIAL_RD:       350,
    MIN_RD:           30,
    MAX_RD:           350,
    TRIAL_SIGMA:      65,       // uncertainty per single trial observation
    K_MAX:            48,       // maximum sensitivity when RD is max
    K_MIN:            16,       // minimum sensitivity when RD is min
    INACTIVITY_C:     8,        // RD growth constant per idle hour
    FLOW_TARGET_P:    0.70,     // target predicted success for flow zone
    RATING_FLOOR:     400,
    RATING_CEILING:   2400,
  },

  ADAPTIVE: {
    ELO: {
      INITIAL_RATING: 1200,
      INITIAL_RD:     350,
      MIN_RD:         30,
      MAX_RD:         350,
      TRIAL_SIGMA:    65,
      K_MAX:          48,
      K_MIN:          16,
      INACTIVITY_C:   8,
      FLOW_TARGET_P:  0.70,
      RATING_FLOOR:   400,
      RATING_CEILING: 2400,
    },
    FLOW_TARGET_P:    0.70,
    HINT_PENALTY_S:   0.15,
    PERK_PENALTY_S:   0.10,
    DIRECTOR: {
      FRUSTRATION_STREAK: 2,
      PEAK_STREAK: 3,
      RECOVER_FAIL_STREAK: 2,
      PEAK_STREAK_THRESHOLD: 3,
    }
  },

  /* ── AI Director FSM ───────────────────────────────────────── */
  DIRECTOR: {
    STATES: ['BUILD', 'PEAK', 'RELIEF', 'RECOVER'],
    PEAK_STREAK_THRESHOLD:        3,     // consecutive wins with S >= 0.75
    PEAK_S_THRESHOLD:             0.75,
    PEAK_DIFFICULTY_BOOST:        100,
    RELIEF_DIFFICULTY_DROP:       120,
    RECOVER_DIFFICULTY_DROP:      200,
    RECOVER_FAIL_STREAK:          2,     // consecutive rapid failures
    RECOVER_RAPID_FAIL_TIME:      2.0,   // seconds — failure < this is "rapid"
    RECOVER_IDLE_MULTIPLIER:      1.8,   // idle > par * this triggers recover
    RELIEF_DURATION_TRIALS:       1,     // trials to stay in RELIEF
    RECOVER_DURATION_TRIALS:      2,     // trials to stay in RECOVER
  },

  /* ── Scoring ───────────────────────────────────────────────── */
  SCORING: {
    SPEED_WEIGHT:     0.40,   // S = 0.60 + 0.40 * speedFactor (when correct)
    BASE_WEIGHT:      0.60,
    HINT_PENALTY:     0.15,   // per hint used, subtracted from S
    MIN_S_CORRECT:    0.10,   // floor for S when correct
    STREAK_BONUS_THRESHOLD: 2,  // streak > this earns bonus
    STREAK_BONUS_PER: 10,     // bonus points per streak count
    XP_PER_TRIAL:     25,
    XP_PER_CORRECT:   50,
    XP_PER_BOSS:      100,
    LEVEL_XP_BASE:    200,    // xp for level 1; each level needs base * level
  },

  /* ── Perks (Neural Upgrades) ───────────────────────────────── */
  PERK_MULTIPLIER_COST: {
    'slow_time':      0.10,   // timer +15%, but score multiplier -10%
    'echo':           0.12,
    'second_chance':  0.08,
    'magnet':         0.06,
    'scanner':        0.10,
  },

  /* ── Sector & Trial Timing ─────────────────────────────────── */
  TRIALS_PER_SECTOR:    3,
  BOSS_TRIALS:          1,
  SECTOR_COUNT:         6,
  TRIAL_BASE_TIME:      30,    // seconds for a normal trial at baseline D
  BOSS_TIME_MULTIPLIER: 1.5,
  PAR_TIME_BY_SKILL: {
    memory:       20,
    audio:        25,
    pattern:      22,
    observation:  18,
    reflex:       8,
    spatial:      25,
    logic:        30,
  },

  /* ── Graphics & PostFX ─────────────────────────────────────── */
  GRAPHICS: {
    BLOOM_STRENGTH:   0.6,
    BLOOM_RADIUS:     0.4,
    BLOOM_THRESHOLD:  0.85,
    VIGNETTE_OFFSET:  1.0,
    VIGNETTE_DARKNESS: 1.2,
    CHROMA_MAX:       0.008,
    SCANLINE_DENSITY: 800,
    FILM_GRAIN:       0.06,
    TONE_MAPPING_EXPOSURE: 0.9,
    MAX_PIXEL_RATIO:  2,
    FOV_DEFAULT:      75,
    FOV_PUNCH:        82,       // on correct answer
    SHAKE_INTENSITY:  0.15,
    SHAKE_DECAY:      4.0,
  },

  /* ── Difficulty Theme Colours ──────────────────────────────── */
  DIFF_THEMES: {
    1: { ambient: 0x001133, fog: 0x000a1a, fogDensity: 0.018, accent: 0x0077ff, label: 'Calm' },
    2: { ambient: 0x002233, fog: 0x001020, fogDensity: 0.022, accent: 0x00cccc, label: 'Focused' },
    3: { ambient: 0x1a0033, fog: 0x0d0020, fogDensity: 0.026, accent: 0xaa00ff, label: 'Intense' },
    4: { ambient: 0x331100, fog: 0x200800, fogDensity: 0.032, accent: 0xff6600, label: 'Critical' },
    5: { ambient: 0x330000, fog: 0x1a0000, fogDensity: 0.040, accent: 0xff2200, label: 'Expert' },
  },

  /* ── Audio ─────────────────────────────────────────────────── */
  AUDIO: {
    MASTER_VOLUME:    0.7,
    MUSIC_BASE_BPM:   75,
    BPM_PER_DIFF:     12,
    BPM_PER_STREAK:   4,
    MAX_STREAK_BPM:   5,     // cap streak contribution at 5
    COMBO_PITCH_STEP: 0.04,  // semitone fraction per combo
    STINGER_VOLUME:   0.5,
  },

  /* ── Accessibility ─────────────────────────────────────────── */
  A11Y: {
    REDUCED_MOTION:   false,
    COLOUR_BLIND_MODE: 'none',   // 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia'
    CAPTION_FONT_SIZE: 16,
  },

  /* ── Debug / Demo ──────────────────────────────────────────── */
  DEBUG: {
    SHOW_OVERLAY:     false,    // F3 toggle
    SHOW_FPS:         true,
    LOG_EVENTS:       false,
  },
});

export const CONFIG = Config;
