/* ═══════════════════════════════════════════════
   MindShift 3D — main.js
   ES6 Module entry point.
   The default entry (no query) shows the MindShift 3D home screen.
   ?3d=1      → alias for home screen (no auto-launch, user clicks a button)
   ?game=ID   → deep-link directly into a specific game
   ?legacy=1  → shows classic 2D mode select
   ═══════════════════════════════════════════════ */
import { GameEngine } from './engine/GameEngine.js?v=20261028_v6';
import { App }        from './App.js?v=20261028_v6';

const bootstrap = async () => {
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
    // Deep-link: ?game=lumen-pond&level=3&autoplay=1
    const g  = params.get('game');
    const lv = parseInt(params.get('level'), 10) || 1;
    const shouldAutoPlay = params.has('autoplay') || params.has('bot');
    const isFast = params.has('fast');
    const roundDelay = parseFloat(params.get('delay')) || null;
    const skill = parseFloat(params.get('skill')) || 0.92;

    setTimeout(() => {
      app.start3D().then(() => {
        app.loadGame(g, lv);
        if (shouldAutoPlay) {
          setTimeout(() => {
            window.__dev?.autoPlay({ fast: isFast, roundDelay, skill });
          }, 700);
        }
      });
    }, 400);

  } else if (params.has('legacy')) {
    // Legacy 2D mode selector
    setTimeout(() => {
      engine.navigate('game-mode-select');
    }, 400);

  } else if (params.has('benchmark') || params.has('duration_test')) {
    // Full duration benchmark runner across levels [1, 5, 10, 15, 20, 25, 30]
    const isFast = params.has('fast');
    const testLevels = params.get('levels') ? params.get('levels').split(',').map(n => parseInt(n, 10)) : [1, 5, 10, 15, 20, 25, 30];
    const games = params.get('games') ? params.get('games').split(',') : undefined;

    setTimeout(async () => {
      console.log('[Benchmark] Launching duration benchmark...');
      const results = await window.__dev?.runDurationBenchmark({ fast: isFast, levels: testLevels, games });

      const panel = document.createElement('div');
      panel.id = 'benchmark-results-panel';
      panel.style.cssText = 'position:fixed;bottom:15px;left:15px;right:15px;max-height:85vh;overflow-y:auto;background:rgba(8,16,32,0.96);border:2px solid #00f2fe;border-radius:12px;padding:20px;z-index:999999;font-family:monospace;color:#f8fafc;box-shadow:0 0 40px rgba(0,242,254,0.4);';
      let tableHtml = '<h2 style="color:#00f2fe;margin:0 0 10px 0;">📊 DURATION BENCHMARK (Levels 1, 5, 10, 15, 20, 25, 30)</h2><table style="width:100%;border-collapse:collapse;font-size:13px;"><tr style="background:#1e293b;color:#00f2fe;"><th style="padding:6px;border:1px solid #334155;text-align:left;">Game</th><th style="padding:6px;border:1px solid #334155;text-align:center;">Level</th><th style="padding:6px;border:1px solid #334155;text-align:center;">Rounds</th><th style="padding:6px;border:1px solid #334155;text-align:center;">Duration (s)</th><th style="padding:6px;border:1px solid #334155;text-align:center;">Target Range</th><th style="padding:6px;border:1px solid #334155;text-align:center;">Result</th></tr>';
      for (const res of results || []) {
        const targetMin = res.level <= 10 ? 45 : (res.level <= 20 ? 60 : 75);
        const targetMax = res.level <= 10 ? 75 : (res.level <= 20 ? 100 : 120);
        const inRange = res.duration >= (targetMin - 5) && res.duration <= (targetMax + 5);
        tableHtml += `<tr><td style="padding:6px;border:1px solid #334155;font-weight:bold;">${res.game}</td><td style="padding:6px;border:1px solid #334155;text-align:center;">Lv ${res.level}</td><td style="padding:6px;border:1px solid #334155;text-align:center;">${res.rounds}</td><td style="padding:6px;border:1px solid #334155;text-align:center;font-weight:bold;color:${inRange ? '#10b981' : '#f59e0b'};">${res.duration}s</td><td style="padding:6px;border:1px solid #334155;text-align:center;color:#94a3b8;">${targetMin}–${targetMax}s</td><td style="padding:6px;border:1px solid #334155;text-align:center;color:${res.pass ? '#10b981' : '#ef4444'};font-weight:bold;">${res.pass ? '✅ PASS' : '❌ FAIL'}</td></tr>`;
      }
      tableHtml += '</table>';
      panel.innerHTML = tableHtml;
      document.body.appendChild(panel);
    }, 500);

  } else if (params.has('autotest') || params.has('test')) {
    // Automated input self-test across all games
    setTimeout(async () => {
      console.log('[AutoTest] Executing window.__dev.testAllGames()...');
      const results = window.__dev ? await window.__dev.testAllGames() : {};

      const panel = document.createElement('div');
      panel.id = 'dev-autotest-panel';
      panel.style.cssText = 'position:fixed;bottom:20px;left:20px;right:20px;max-height:80vh;overflow-y:auto;background:rgba(8,16,32,0.95);border:2px solid #00f2fe;border-radius:12px;padding:20px;z-index:999999;font-family:monospace;color:#f8fafc;box-shadow:0 0 40px rgba(0,242,254,0.4);';
      let tableHtml = '<h2 style="color:#00f2fe;margin:0 0 10px 0;">🎯 STAGE 1: INPUT PIPELINE SELF-TEST REPORT (window.__dev.testAllGames)</h2><table style="width:100%;border-collapse:collapse;font-size:14px;"><tr style="background:#1e293b;color:#00f2fe;"><th style="padding:8px;border:1px solid #334155;text-align:left;">Game ID</th><th style="padding:8px;border:1px solid #334155;text-align:center;">Targets Registered</th><th style="padding:8px;border:1px solid #334155;text-align:center;">Hits Registered</th><th style="padding:8px;border:1px solid #334155;text-align:center;">Missed</th><th style="padding:8px;border:1px solid #334155;text-align:center;">Result</th></tr>';
      for (const [gId, res] of Object.entries(results || {})) {
        tableHtml += `<tr><td style="padding:8px;border:1px solid #334155;font-weight:bold;">${gId}</td><td style="padding:8px;border:1px solid #334155;text-align:center;">${res.totalCount}</td><td style="padding:8px;border:1px solid #334155;text-align:center;color:#10b981;">${res.hitCount}</td><td style="padding:8px;border:1px solid #334155;text-align:center;color:${res.totalCount - res.hitCount > 0 ? '#ef4444' : '#94a3b8'};">${res.totalCount - res.hitCount}</td><td style="padding:8px;border:1px solid #334155;text-align:center;color:${res.success ? '#10b981' : '#ef4444'};font-weight:bold;">${res.success ? '✅ PASSED 100%' : '❌ FAIL'}</td></tr>`;
      }
      tableHtml += '</table>';
      panel.innerHTML = tableHtml;
      document.body.appendChild(panel);
    }, 500);
  }
  // ?3d=1 and no params → stay on home screen; user clicks a button to start
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
