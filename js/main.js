/* ═══════════════════════════════════════════════
   MindShift — main.js
   ES6 Module entry point
   ═══════════════════════════════════════════════ */
import { GameEngine } from './engine/GameEngine.js';

document.addEventListener('DOMContentLoaded', () => {
  const engine = new GameEngine();
  engine.init();

  // Expose globally for debugging if needed
  window.__mindshift__ = engine;
});
