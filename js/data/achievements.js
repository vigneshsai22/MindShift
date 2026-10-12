/* ═══════════════════════════════════════════════════════════════
   achievements.js — 12 Comprehensive Cognitive Achievements
   ═══════════════════════════════════════════════════════════════ */

export const ACHIEVEMENTS = [
  {
    id:    'first_game',
    icon:  '🎮',
    name:  'First Steps',
    desc:  'Complete your very first cognitive benchmark session.',
    rarity:'bronze'
  },
  {
    id:    'improver',
    icon:  '📈',
    name:  'Adaptive Growth',
    desc:  'Score higher than your previous run record.',
    rarity:'bronze'
  },
  {
    id:    'fastest_solver',
    icon:  '⚡',
    name:  'Sub-Millisecond Reflex',
    desc:  'Eliminate a Reaction target in under 350ms.',
    rarity:'silver'
  },
  {
    id:    'audiophile',
    icon:  '🎵',
    name:  'Harmonic Resonance',
    desc:  'Achieve 100% accuracy in the Resonance Tunnel sector.',
    rarity:'silver'
  },
  {
    id:    'pattern_expert',
    icon:  '🔮',
    name:  'Invariant Seeker',
    desc:  'Solve 4 consecutive Hologram Assembly pattern trials without error.',
    rarity:'silver'
  },
  {
    id:    'anomaly_purger',
    icon:  '🔍',
    name:  'Forensic Vision',
    desc:  'Discover all anomalies in Anomaly Chamber before scanner sweep.',
    rarity:'silver'
  },
  {
    id:    'spatial_architect',
    icon:  '🔄',
    name:  'Isometric Mind',
    desc:  'Match the 3D target silhouette with zero angular deviation.',
    rarity:'silver'
  },
  {
    id:    'on_fire',
    icon:  '🔥',
    name:  'Neural Overdrive',
    desc:  'Achieve a 7× answer streak across sectors.',
    rarity:'gold'
  },
  {
    id:    'memory_master',
    icon:  '🧠',
    name:  'Total Recall',
    desc:  'Conquer the Memory Vault boss with zero mistaken tiles.',
    rarity:'gold'
  },
  {
    id:    'flow_state',
    icon:  '🌊',
    name:  'The Flow Zone',
    desc:  'Maintain predicted success rate p within 0.65–0.75 for 5 trials.',
    rarity:'gold'
  },
  {
    id:    'perfect_round',
    icon:  '⭐',
    name:  'Flawless Breach',
    desc:  'Achieve 100% overall accuracy in a full facility run.',
    rarity:'gold'
  },
  {
    id:    'final_breach',
    icon:  '🚪',
    name:  'Neural Freedom',
    desc:  'Decrypt the Final Core terminal and achieve the Freedom ending.',
    rarity:'gold'
  }
];

export const RARITY_CLASS = {
  bronze: 'rarity-bronze',
  silver: 'rarity-silver',
  gold:   'rarity-gold'
};

export function getAchievement(id) {
  return ACHIEVEMENTS.find(a => a.id === id) || null;
}

export function evaluateAchievements(summary, profile, meta = {}) {
  const newlyUnlocked = [];
  const already = new Set((profile?.achievements || []).map(a => a.id));

  const check = (id, condition) => {
    if (!already.has(id) && condition) newlyUnlocked.push(id);
  };

  check('first_game', (profile?.gamesPlayed ?? 0) === 0);
  check('perfect_round', summary.overallAccuracy === 100);
  check('on_fire', (summary.bestStreak ?? 0) >= 7);
  check('improver', (summary.totalScore ?? 0) > (profile?.bestScore ?? 0) && (profile?.gamesPlayed ?? 0) > 0);

  if (summary.challenges && Array.isArray(summary.challenges)) {
    const rChallenges = summary.challenges.filter(c => c.category === 'reaction');
    check('fastest_solver', rChallenges.some(c => c.responseTime < 0.35 && c.correct));

    const mChallenges = summary.challenges.filter(c => c.category === 'memory');
    check('memory_master', mChallenges.some(c => c.correct && c.difficulty >= 4));

    const aChallenges = summary.challenges.filter(c => c.category === 'audio');
    check('audiophile', aChallenges.some(c => c.correct));
  }

  return newlyUnlocked;
}
