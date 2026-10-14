/* ═══════════════════════════════════════════════════════════════
   anomaly-rooms.js — Level Definitions (1–30 + Level 0 Practice)
   Cognitive Domain: Visual Observation & Structural Discrepancy
   ═══════════════════════════════════════════════════════════════ */

export function getAnomalyRoomsLevel(level) {
  if (level === 0) {
    return {
      level: 0,
      name: 'Anomaly Scan (Practice)',
      isPractice: true,
      rounds: 1,
      lives: 99,
      perRoundTime: 40,
      parTime: 40,
      difficulty: 500,
      anomalyCount: 1,
      instructions: 'Compare the twin chambers and identify the mutated object.'
    };
  }

  const isBoss = (level % 5 === 0);
  const baseRounds = Math.min(10, Math.floor(5 + (level - 1) * (5 / 29)));
  const rounds = isBoss ? Math.min(10, baseRounds + 1) : baseRounds;
  const difficulty = 600 + 30 * (level - 1);

  let perRoundTime = 15;
  if (level > 20) perRoundTime = 12;
  else if (level > 10) perRoundTime = 13.5;

  const anomalyCount = Math.min(4, 1 + Math.floor((level - 1) * 0.12));
  const parTime = Math.round(rounds * (perRoundTime * 0.8));

  return {
    level,
    name: isBoss ? `Mirror Paradox: Boss Level ${level}` : `Anomaly Rooms Level ${level}`,
    isBoss,
    rounds,
    lives: 3,
    perRoundTime,
    parTime,
    difficulty,
    anomalyCount,
    passAccuracy: 0.60
  };
}

export const anomalyRoomsLevels = Array.from({ length: 31 }, (_, i) => getAnomalyRoomsLevel(i));
