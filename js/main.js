/* ═══════════════════════════════════════════════
   MindShift 3D — main.js
   ES6 Module entry point.
   The default entry (no query) shows the MindShift 3D home screen.
   ?3d=1      → alias for home screen (no auto-launch, user clicks a button)
   ?game=ID   → deep-link directly into a specific game
   ?legacy=1  → shows classic 2D mode select
   ═══════════════════════════════════════════════ */
import { GameEngine } from './engine/GameEngine.js?v=20261012';
import { App }        from './App.js?v=20261012';

document.addEventListener('DOMContentLoaded', async () => {
  const engine = new GameEngine();
  try {
    engine.init();
  } catch (e) {
    console.error('[GameEngine] init error:', e);
  }

  const app = new App();
  // Expose globally immediately so button handlers can always access them
  window.__mindshift__ = engine;
  window.__app__ = app;

  try {
    await app.init();
  } catch (e) {
    console.error('[App] init error:', e);
  }

  const params = new URLSearchParams(window.location.search);

  if (params.has('game')) {
    // Deep-link: ?game=lumen-pond&level=3 → skip home, go straight to game
    const g  = params.get('game');
    const lv = parseInt(params.get('level'), 10) || 1;
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) {}
    setTimeout(() => {
      app.start3D().then(() => app.loadGame(g, lv));
    }, 400);

  } else if (params.has('legacy')) {
    // Legacy 2D mode selector
    setTimeout(() => {
      engine.navigate('game-mode-select');
    }, 400);

  }
  // ?3d=1 and no params → stay on home screen; user clicks a button to start
});
