/* ═══════════════════════════════════════════════════════════════
   lumen-pond.js — Level Definitions (1–30 + Level 0 Practice)
   Cognitive Domain: Working Memory & Auditory/Visual Sequencing
   Level duration target:
     Levels 1–10:  45–75 s
     Levels 11–20: 60–100 s
     Levels 21–30: 75–120 s
   ═══════════════════════════════════════════════════════════════ */

export function getLumenPondLevel(level) {
  if (level === 0) {
    return {
      level: 0,
      name: 'Neural Calibration (Practice)',
      isPractice: true,
      rounds: 1,
      lives: 99,
      perRoundTime: 40,
      parTime: 40,
      difficulty: 500,
      seqLengthMin: 2,
      seqLengthMax: 2,
      stepDuration: 0.60,
      interval: 0.30,
      padCount: 7,
      instructions: 'Repeat the 2 glowing pads in sequence. Take your time!'
    };
  }

  const isBoss = (level % 5 === 0);
  const baseRounds = Math.min(10, Math.floor(5 + (level - 1) * (5 / 29)));
  const rounds = isBoss ? Math.min(10, baseRounds + 1) : baseRounds;

  // Base difficulty Elo rating (600 - 1500)
  const difficulty = 600 + 30 * (level - 1);

  // Time limits scaled per round
  let perRoundTime = 14;
  if (level > 20) perRoundTime = 11;
  else if (level > 10) perRoundTime = 13;

  // Sequence length progression
  const seqLengthMin = Math.min(6, Math.floor(3 + (level - 1) * 0.12));
  const seqLengthMax = Math.min(8, seqLengthMin + (isBoss ? 2 : 1));

  // Playback pace increases slightly as level rises
  const stepDuration = Math.max(0.35, 0.55 - (level - 1) * 0.007);
  const interval = Math.max(0.14, 0.25 - (level - 1) * 0.004);

  // Target par duration scaled to rounds (average 9.5-12s per round)
  const parTime = Math.round(rounds * (perRoundTime * 0.8));

  return {
    level,
    name: isBoss ? `Memory Overdrive: Boss Level ${level}` : `Lumen Pond Level ${level}`,
    isBoss,
    rounds,
    lives: 3,
    perRoundTime,
    parTime,
    difficulty,
    seqLengthMin,
    seqLengthMax,
    stepDuration,
    interval,
    padCount: 7,
    passAccuracy: 0.60
  };
}

export const lumenPondLevels = Array.from({ length: 31 }, (_, i) => getLumenPondLevel(i));
