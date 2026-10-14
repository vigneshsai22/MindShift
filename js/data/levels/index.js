/* ═══════════════════════════════════════════════════════════════
   index.js — Unified Level Configuration Registry (Levels 0–30)
   ═══════════════════════════════════════════════════════════════ */

import { getLumenPondLevel }      from './lumen-pond.js';
import { getTerminalHackLevel }   from './terminal-hack.js';
import { getHologramMatrixLevel } from './hologram-matrix.js';
import { getRotationCoreLevel }   from './rotation-core.js';
import { getReflexArenaLevel }    from './reflex-arena.js';
import { getAnomalyRoomsLevel }   from './anomaly-rooms.js';

const GETTERS = {
  'lumen-pond':      getLumenPondLevel,
  'terminal-hack':   getTerminalHackLevel,
  'hologram-matrix': getHologramMatrixLevel,
  'rotation-core':   getRotationCoreLevel,
  'reflex-arena':    getReflexArenaLevel,
  'anomaly-rooms':   getAnomalyRoomsLevel
};

export function getLevelConfig(gameId, level = 1) {
  const getter = GETTERS[gameId];
  if (getter) {
    return getter(level);
  }
  // Generic fallback
  const isBoss = (level % 5 === 0);
  const rounds = isBoss ? Math.min(10, Math.floor(6 + level * 0.15)) : Math.min(10, Math.floor(5 + (level - 1) * (5 / 29)));
  return {
    level,
    rounds,
    lives: 3,
    perRoundTime: 14,
    parTime: rounds * 11,
    difficulty: 600 + 30 * (level - 1),
    passAccuracy: 0.60
  };
}
