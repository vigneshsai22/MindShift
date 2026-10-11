/* ═══════════════════════════════════════════════
   MindShift — Achievement Definitions
   ═══════════════════════════════════════════════ */

export const ACHIEVEMENTS = [
  {
    id:    'fastest_solver',
    icon:  '⚡',
    name:  'Fastest Solver',
    desc:  'Complete a Reaction challenge in under 350ms',
    rarity:'gold'
  },
  {
    id:    'memory_master',
    icon:  '🧠',
    name:  'Memory Master',
    desc:  'Perfect score on a Memory challenge at Hard or Expert',
    rarity:'gold'
  },
  {
    id:    'pattern_expert',
    icon:  '🔮',
    name:  'Pattern Expert',
    desc:  'Answer 4 consecutive Pattern challenges correctly',
    rarity:'silver'
  },
  {
    id:    'perfect_round',
    icon:  '⭐',
    name:  'Perfect Round',
    desc:  '100% accuracy in a full game session',
    rarity:'gold'
  },
  {
    id:    'on_fire',
    icon:  '🔥',
    name:  'On Fire',
    desc:  'Achieve a 7× answer streak',
    rarity:'silver'
  },
  {
    id:    'audiophile',
    icon:  '🎵',
    name:  'Audiophile',
    desc:  'Perfect score on an Audio challenge',
    rarity:'silver'
  },
  {
    id:    'improver',
    icon:  '📈',
    name:  'Improver',
    desc:  'Score higher than your previous best session',
    rarity:'bronze'
  },
  {
    id:    'first_game',
    icon:  '🎮',
    name:  'First Steps',
    desc:  'Complete your very first game session',
    rarity:'bronze'
  }
];

/** Achievement rarity → CSS class map */
export const RARITY_CLASS = {
  bronze: 'rarity-bronze',
  silver: 'rarity-silver',
  gold:   'rarity-gold'
};

/** Lookup achievement by id */
export function getAchievement(id) {
  return ACHIEVEMENTS.find(a => a.id === id) || null;
}

/**
 * Evaluate which achievements are newly unlocked after a session.
 * @param {object} summary  Session summary from SessionManager
 * @param {object} profile  Player profile from ProfileManager
 * @param {number[]} streakHistory  per-challenge streak snapshots
 * @returns {string[]}  array of newly unlocked achievement ids
 */
export function evaluateAchievements(summary, profile, meta = {}) {
  const newlyUnlocked = [];
  const already = new Set((profile.achievements || []).map(a => a.id));

  const check = (id, condition) => {
    if (!already.has(id) && condition) newlyUnlocked.push(id);
  };

  // first_game
  check('first_game', profile.gamesPlayed === 0);

  // perfect_round — 100% accuracy
  check('perfect_round', summary.overallAccuracy === 100);

  // on_fire — streak ≥ 7
  check('on_fire', summary.bestStreak >= 7);

  // improver — beat previous best score
  check('improver',
    profile.gamesPlayed > 0 &&
    summary.totalScore > profile.bestScore
  );

  // fastest_solver — any reaction challenge < 350ms
  check('fastest_solver', meta.fastestReaction != null && meta.fastestReaction < 0.35);

  // memory_master — perfect memory at hard/expert
  check('memory_master', meta.memoryPerfect === true);

  // audiophile — perfect audio challenge
  check('audiophile', meta.audioPerfect === true);

  // pattern_expert — 4 consecutive pattern correct
  check('pattern_expert', meta.patternStreak >= 4);

  return newlyUnlocked;
}
