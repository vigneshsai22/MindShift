/* ═══════════════════════════════════════════════════════════════
   terminal-hack.js — Level Definitions (1–30 + Level 0 Practice)
   Cognitive Domain: Logical Deduction & Cryptanalysis
   ═══════════════════════════════════════════════════════════════ */

export function getTerminalHackLevel(level) {
  if (level === 0) {
    return {
      level: 0,
      name: 'Cybernetic Decryption (Practice)',
      isPractice: true,
      rounds: 1,
      lives: 99,
      perRoundTime: 45,
      parTime: 45,
      difficulty: 500,
      wordLength: 4,
      candidateCount: 4,
      attemptsAllowed: 4,
      instructions: 'Analyze likeness feedback and find the access password.'
    };
  }

  const isBoss = (level % 5 === 0);
  const baseRounds = Math.min(10, Math.floor(5 + (level - 1) * (5 / 29)));
  const rounds = isBoss ? Math.min(10, baseRounds + 1) : baseRounds;
  const difficulty = 600 + 30 * (level - 1);

  let perRoundTime = 15;
  if (level > 20) perRoundTime = 12;
  else if (level > 10) perRoundTime = 13.5;

  const wordLength = Math.min(8, 4 + Math.floor((level - 1) * 0.15));
  const candidateCount = Math.min(10, 5 + Math.floor((level - 1) * 0.18));
  const parTime = Math.round(rounds * (perRoundTime * 0.8));

  return {
    level,
    name: isBoss ? `Root Citadel: Boss Level ${level}` : `Terminal Hack Level ${level}`,
    isBoss,
    rounds,
    lives: 3,
    perRoundTime,
    parTime,
    difficulty,
    wordLength,
    candidateCount,
    attemptsAllowed: 4,
    passAccuracy: 0.60
  };
}

export const terminalHackLevels = Array.from({ length: 31 }, (_, i) => getTerminalHackLevel(i));
