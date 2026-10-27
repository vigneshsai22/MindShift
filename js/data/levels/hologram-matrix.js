/* ═══════════════════════════════════════════════════════════════
   hologram-matrix.js — Level Definitions (1–30 + Level 0 Practice)
   Cognitive Domain: Pattern Induction & Matrix Completion
   ═══════════════════════════════════════════════════════════════ */

export function getHologramMatrixLevel(level) {
  if (level === 0) {
    return {
      level: 0,
      name: 'Matrix Induction (Practice)',
      isPractice: true,
      rounds: 1,
      lives: 99,
      perRoundTime: 40,
      parTime: 40,
      difficulty: 500,
      gridSize: 2,
      ruleComplexity: 1,
      choiceCount: 4,
      instructions: 'Identify the pattern in the matrix and choose the missing tile.'
    };
  }

  const isBoss = (level % 5 === 0);
  const baseRounds = Math.min(10, Math.floor(5 + (level - 1) * (5 / 29)));
  const rounds = isBoss ? Math.min(10, baseRounds + 1) : baseRounds;
  const difficulty = 600 + 30 * (level - 1);

  const perRoundTime = Math.max(8.5, Math.round((18 - (level - 1) * 0.33) * 10) / 10);

  const gridSize = (level >= 12) ? 3 : 2;
  const ruleComplexity = Math.min(4, 1 + Math.floor((level - 1) * 0.12));
  const parTime = Math.round(rounds * (perRoundTime * 0.8));

  return {
    level,
    name: isBoss ? `Holo-Nexus: Boss Level ${level}` : `Hologram Matrix Level ${level}`,
    isBoss,
    rounds,
    lives: 3,
    perRoundTime,
    parTime,
    difficulty,
    gridSize,
    ruleComplexity,
    choiceCount: 4,
    passAccuracy: 0.60
  };
}

export const hologramMatrixLevels = Array.from({ length: 31 }, (_, i) => getHologramMatrixLevel(i));
