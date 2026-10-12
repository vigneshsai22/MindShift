/* ═══════════════════════════════════════════════════════════════
   perks.js — Neural Upgrade Definitions
   Trade off gameplay assistance for score multiplier penalties.
   Formula is transparent and defensible for viva.
   ═══════════════════════════════════════════════════════════════ */

export const PERKS = [
  {
    id: 'slow_time',
    name: 'Temporal Dilation',
    icon: '⏳',
    description: 'Increases challenge timers by +15%.',
    penaltyDesc: 'Score Multiplier -10%',
    multiplierPenalty: 0.10,
    apply: (gameState) => {
      gameState.timerMultiplier = (gameState.timerMultiplier || 1.0) * 1.15;
    }
  },
  {
    id: 'echo',
    name: 'Cognitive Echo',
    icon: '🔁',
    description: 'Enables one free sequence replay in memory & rhythm trials.',
    penaltyDesc: 'Score Multiplier -12%',
    multiplierPenalty: 0.12,
    apply: (gameState) => {
      gameState.echoCharges = (gameState.echoCharges || 0) + 1;
    }
  },
  {
    id: 'second_chance',
    name: 'Neural Backup',
    icon: '🛡️',
    description: 'Forgives one mistake per sector without resetting streak.',
    penaltyDesc: 'Score Multiplier -15%',
    multiplierPenalty: 0.15,
    apply: (gameState) => {
      gameState.secondChanceCharges = (gameState.secondChanceCharges || 0) + 1;
    }
  },
  {
    id: 'magnet',
    name: 'Flux Magnet',
    icon: '🧲',
    description: 'Widens 3D click, grab, and holographic snap tolerances by +25%.',
    penaltyDesc: 'Score Multiplier -8%',
    multiplierPenalty: 0.08,
    apply: (gameState) => {
      gameState.snapTolerance = (gameState.snapTolerance || 1.0) * 1.25;
    }
  },
  {
    id: 'scanner',
    name: 'Anomaly Sweep',
    icon: '🔍',
    description: 'ARIA automatically highlights one anomaly in observation trials.',
    penaltyDesc: 'Score Multiplier -10%',
    multiplierPenalty: 0.10,
    apply: (gameState) => {
      gameState.autoScanner = true;
    }
  }
];

export function getRandomPerks(count = 3, excludeIds = []) {
  const available = PERKS.filter(p => !excludeIds.includes(p.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
