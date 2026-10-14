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

  let perRoundTime = 12;
  if (level > 20) perRoundTime = 9.5;
  else if (level > 10) perRoundTime = 10.5;

  const targetCount = Math.min(8, 3 + Math.floor((level - 1) * 0.18));
  const hasDecoys = (level >= 4);
  const spawnWindow = Math.max(0.65, 1.8 - (level - 1) * 0.04);
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
