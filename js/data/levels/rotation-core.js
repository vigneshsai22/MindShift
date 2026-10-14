/* ═══════════════════════════════════════════════════════════════
   rotation-core.js — Level Definitions (1–30 + Level 0 Practice)
   Cognitive Domain: Spatial Rotation & 3D Mental Transform
   ═══════════════════════════════════════════════════════════════ */

export function getRotationCoreLevel(level) {
  if (level === 0) {
    return {
      level: 0,
      name: 'Spatial Alignment (Practice)',
      isPractice: true,
      rounds: 1,
      lives: 99,
      perRoundTime: 40,
      parTime: 40,
      difficulty: 500,
      complexity: 2,
      axes: 1,
      instructions: 'Mentally rotate the 3D core to find the matching orientation.'
    };
  }

  const isBoss = (level % 5 === 0);
  const baseRounds = Math.min(10, Math.floor(5 + (level - 1) * (5 / 29)));
  const rounds = isBoss ? Math.min(10, baseRounds + 1) : baseRounds;
  const difficulty = 600 + 30 * (level - 1);

  let perRoundTime = 14;
  if (level > 20) perRoundTime = 11;
  else if (level > 10) perRoundTime = 12.5;

  const complexity = Math.min(6, 2 + Math.floor((level - 1) * 0.15));
  const axes = (level >= 15) ? 3 : (level >= 6 ? 2 : 1);
  const parTime = Math.round(rounds * (perRoundTime * 0.8));

  return {
    level,
    name: isBoss ? `Hyper-Chamber: Boss Level ${level}` : `Rotation Core Level ${level}`,
    isBoss,
    rounds,
    lives: 3,
    perRoundTime,
    parTime,
    difficulty,
    complexity,
    axes,
    passAccuracy: 0.60
  };
}

export const rotationCoreLevels = Array.from({ length: 31 }, (_, i) => getRotationCoreLevel(i));
