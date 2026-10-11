/* ═══════════════════════════════════════════════════════════════
   UIOverlay3D.js
   HTML HUD layer that sits on top of the Three.js canvas.
   Score, streak, timer, lab name, hint button, quality/volume controls.
   ═══════════════════════════════════════════════════════════════ */

export class UIOverlay3D {
  constructor({ adaptive, session, onHint, onExit }) {
    this.adaptive = adaptive;
    this.session  = session;
    this.onHint   = onHint;
    this.onExit   = onExit;
    this._el      = null;
    this._timerInterval = null;
  }

  init() {
    this._el = document.createElement('div');
    this._el.id = 'hud-3d';
    this._el.style.cssText = `
      position:fixed;inset:0;pointer-events:none;z-index:400;
      font-family:'JetBrains Mono',monospace;user-select:none;`;

    this._el.innerHTML = `
      <!-- Top HUD bar -->
      <div id="hud3-top" style="
        position:absolute;top:0;left:0;right:0;
        display:flex;align-items:center;justify-content:space-between;
        padding:10px 20px;background:rgba(0,10,20,0.75);
        border-bottom:1px solid rgba(0,100,180,0.4);pointer-events:all">

        <div style="display:flex;gap:20px;align-items:center">
          <div>
            <div style="font-size:10px;color:#6699aa">SCORE</div>
            <div id="hud3-score" style="font-size:22px;font-weight:bold;color:#00eeff">0</div>
          </div>
          <div>
            <div style="font-size:10px;color:#6699aa">STREAK</div>
            <div id="hud3-streak" style="font-size:22px;font-weight:bold;color:#ffaa00">0🔥</div>
          </div>
        </div>

        <div style="text-align:center">
          <div id="hud3-lab" style="font-size:14px;color:#88ccff;letter-spacing:2px;text-transform:uppercase"></div>
          <div id="hud3-diff" style="font-size:11px;color:#4488aa;margin-top:2px">CALM</div>
        </div>

        <div style="display:flex;gap:16px;align-items:center">
          <div id="hud3-timer-wrap" style="text-align:right">
            <div style="font-size:10px;color:#6699aa">TIME</div>
            <div id="hud3-timer" style="font-size:28px;font-weight:bold;color:#00ff88">—</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button id="hud3-hint" style="
              background:rgba(0,60,120,0.8);color:#ffcc00;border:1px solid #0066aa;
              border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px;
              font-family:monospace">💡 Hint</button>
            <button id="hud3-exit" style="
              background:rgba(60,0,30,0.8);color:#ff8888;border:1px solid #660033;
              border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px;
              font-family:monospace">✕ Exit</button>
          </div>
        </div>
      </div>

      <!-- Crosshair -->
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:20px;height:20px;pointer-events:none">
        <div style="position:absolute;top:9px;left:0;right:0;height:2px;background:rgba(0,200,255,0.6)"></div>
        <div style="position:absolute;left:9px;top:0;bottom:0;width:2px;background:rgba(0,200,255,0.6)"></div>
      </div>

      <!-- Flash overlay for correct/wrong -->
      <div id="hud3-flash" style="
        position:absolute;inset:0;pointer-events:none;opacity:0;
        transition:opacity 0.15s;background:transparent"></div>

      <!-- Lab name banner (center bottom) -->
      <div id="hud3-labname" style="
        position:absolute;bottom:90px;left:50%;transform:translateX(-50%);
        background:rgba(0,20,40,0.9);color:#00eeff;font-size:18px;font-weight:bold;
        padding:10px 30px;border-radius:8px;border:1px solid #004466;
        letter-spacing:3px;text-transform:uppercase;opacity:0;
        transition:opacity 0.4s;pointer-events:none">
      </div>

      <!-- Controls bar bottom-left -->
      <div style="position:absolute;bottom:14px;left:14px;
        display:flex;gap:10px;align-items:center;pointer-events:all">
        <label style="color:#6699aa;font-size:11px">VOL
          <input id="hud3-vol" type="range" min="0" max="1" step="0.05" value="0.7" style="width:70px;margin-left:4px">
        </label>
        <label style="color:#6699aa;font-size:11px">QUALITY
          <select id="hud3-quality" style="background:#021020;color:#88aacc;border:1px solid #003355;border-radius:4px;margin-left:4px;font-size:11px">
            <option value="high" selected>High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
      </div>

      <!-- Pointer lock hint -->
      <div id="hud3-lockHint" style="
        position:absolute;bottom:14px;right:14px;
        color:#334455;font-size:11px;pointer-events:none">
        Click to lock cursor | ESC to unlock
      </div>
    `;

    document.body.appendChild(this._el);

    // Wire buttons
    document.getElementById('hud3-hint')?.addEventListener('click', this.onHint);
    document.getElementById('hud3-exit')?.addEventListener('click', this.onExit);

    document.getElementById('hud3-vol')?.addEventListener('input', (e) => {
      window.__mindshift3d__?.spatialAudio?.setVolume(parseFloat(e.target.value));
      window.__mindshift3d__?.music && (window.__mindshift3d__.music._volume = parseFloat(e.target.value));
    });

    document.getElementById('hud3-quality')?.addEventListener('change', (e) => {
      window.__mindshift3d__?.postFX?.setQuality(e.target.value);
    });

    // Update score/streak every second
    this._timerInterval = setInterval(() => {
      document.getElementById('hud3-score').textContent  = this.session._totalScore ?? 0;
      document.getElementById('hud3-streak').textContent = (this.session._currentStreak ?? 0) + '🔥';
    }, 500);
  }

  showTimer(seconds) {
    const el = document.getElementById('hud3-timer');
    if (el) el.textContent = seconds;
  }

  updateTimer(seconds) {
    const el = document.getElementById('hud3-timer');
    if (!el) return;
    el.textContent = seconds;
    el.style.color = seconds <= 5 ? '#ff4400' : seconds <= 10 ? '#ffaa00' : '#00ff88';
  }

  updateHints(remaining) {
    const btn = document.getElementById('hud3-hint');
    if (btn) btn.textContent = `💡 Hint (${remaining})`;
  }

  showLabName(name) {
    const el = document.getElementById('hud3-labname');
    const lab = document.getElementById('hud3-lab');
    if (el) { el.textContent = name; el.style.opacity = '1'; }
    if (lab) lab.textContent = name;
    const timer = document.getElementById('hud3-timer');
    if (timer) timer.textContent = '—';
  }

  hideLabName() {
    const el = document.getElementById('hud3-labname');
    if (el) el.style.opacity = '0';
    const lab = document.getElementById('hud3-lab');
    if (lab) lab.textContent = '';
    const timer = document.getElementById('hud3-timer');
    if (timer) timer.textContent = '—';
  }

  flashResult(correct) {
    const el = document.getElementById('hud3-flash');
    if (!el) return;
    el.style.background = correct ? 'rgba(0,255,100,0.15)' : 'rgba(255,30,0,0.15)';
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 350);
  }

  setDifficultyTheme(diff, label) {
    const el = document.getElementById('hud3-diff');
    if (el) el.textContent = `LEVEL ${diff} — ${label.toUpperCase()}`;
  }

  showError(msg) {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;inset:0;background:#000;color:#ff4444;display:flex;align-items:center;justify-content:center;font-size:1.3rem;z-index:9999;text-align:center;padding:2rem;font-family:monospace';
    div.textContent = msg;
    document.body.appendChild(div);
  }

  dispose() {
    clearInterval(this._timerInterval);
    this._el?.remove();
  }
}
