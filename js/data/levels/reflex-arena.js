/* ═══════════════════════════════════════════════════════════════
   reflex-arena.js — Level Definitions (1–30 + Level 0 Practice)
   Cognitive Domain: Psychomotor Speed & Impulse Control
   ═══════════════════════════════════════════════════════════════ */

export function getReflexArenaLevel(level) {
  if (level === 0) {
    return {
      level: 0,
      name: 'Reflex Calibration (Practice)',
      isPractice: true,
      rounds: 1,
      lives: 99,
      perRoundTime: 30,
      parTime: 30,
      difficulty: 500,
      targetCount: 3,
      hasDecoys: false,
      instructions: 'Click the active energy targets before they fade. Avoid red decoys.'
    };
  }

  const isBoss = (level % 5 === 0);
  const baseRounds = Math.min(10, Math.floor(5 + (level - 1) * (5 / 29)));
  const rounds = isBoss ? Math.min(10, baseRounds + 1) : baseRounds;
  const difficulty = 600 + 30 * (level - 1);

  const perRoundTime = Math.max(8, Math.round((15 - (level - 1) * 0.24) * 10) / 10);
  const targetCount = Math.min(8, 3 + Math.floor((level - 1) * 0.18));
  const hasDecoys = (level >= 3);
  const spawnWindow = Math.max(0.65, Math.round((1.6 - (level - 1) * 0.033) * 100) / 100);
  const parTime = Math.round(rounds * (perRoundTime * 0.8));

  return {
    level,
    name: isBoss ? `Pulse Tempest: Boss Level ${level}` : `Reflex Arena Level ${level}`,
    isBoss,
    rounds,
    lives: 3,
    perRoundTime,
    parTime,
    difficulty,
    targetCount,
    hasDecoys,
    spawnWindow,
    passAccuracy: 0.60
  };
}

export const reflexArenaLevels = Array.from({ length: 31 }, (_, i) => getReflexArenaLevel(i));
