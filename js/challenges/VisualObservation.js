/* ═══════════════════════════════════════════════
   MindShift — Visual Observation Challenge
   Spot the differences between two scenes
   ═══════════════════════════════════════════════ */
import { ChallengeBase } from './ChallengeBase.js';
import { calcScore } from '../data/challengePool.js';

// ── Scene Definitions ────────────────────────────
// Each scene is a function that draws objects on a canvas half.
// Differences are specific draw modifications between left and right.

function drawParkScene(ctx, W, H, variant = 'left') {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1a1a3e');
  sky.addColorStop(1, '#0f172a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  // Ground
  ctx.fillStyle = '#1a3a1a'; ctx.fillRect(0, H * 0.65, W, H * 0.35);

  // Moon
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath(); ctx.arc(W * 0.8, H * 0.12, 18, 0, Math.PI * 2); ctx.fill();

  // Stars
  [[0.1,0.08],[0.25,0.15],[0.5,0.05],[0.65,0.18],[0.4,0.1]].forEach(([x,y])=>{
    ctx.fillStyle = '#fff'; ctx.beginPath();
    ctx.arc(W*x, H*y, 1.5, 0, Math.PI*2); ctx.fill();
  });

  // Tree 1
  ctx.fillStyle = '#2d4a1e';
  ctx.beginPath(); ctx.moveTo(W*0.15,H*0.65); ctx.lineTo(W*0.08,H*0.3); ctx.lineTo(W*0.22,H*0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1a2e10';
  ctx.beginPath(); ctx.moveTo(W*0.15,H*0.5); ctx.lineTo(W*0.07,H*0.25); ctx.lineTo(W*0.23,H*0.25); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3d2b1f';
  ctx.fillRect(W*0.135,H*0.65,W*0.03,H*0.1);

  // Tree 2 — DIFFERENCE: colour or size
  const tree2Color = (variant === 'right' && this?.diff0) ? '#4a1e1e' : '#2d4a1e';
  ctx.fillStyle = tree2Color;
  ctx.beginPath(); ctx.moveTo(W*0.7,H*0.65); ctx.lineTo(W*0.63,H*0.35); ctx.lineTo(W*0.77,H*0.35); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1a2e10';
  ctx.beginPath(); ctx.moveTo(W*0.7,H*0.5); ctx.lineTo(W*0.62,H*0.3); ctx.lineTo(W*0.78,H*0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3d2b1f';
  ctx.fillRect(W*0.685,H*0.65,W*0.03,H*0.1);

  // Bench
  ctx.fillStyle = '#8b5e3c';
  ctx.fillRect(W*0.35, H*0.68, W*0.22, H*0.03);
  ctx.fillRect(W*0.37, H*0.71, W*0.04, H*0.05);
  ctx.fillRect(W*0.51, H*0.71, W*0.04, H*0.05);

  // Lamp post
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W*0.5,H*0.65); ctx.lineTo(W*0.5,H*0.35); ctx.stroke();
  // DIFFERENCE: lamp colour
  const lampCol = (variant === 'right') ? '#60a5fa' : '#fbbf24';
  ctx.fillStyle = lampCol;
  ctx.beginPath(); ctx.arc(W*0.5, H*0.32, 8, 0, Math.PI*2); ctx.fill();
}

function drawSpaceScene(ctx, W, H, variant = 'left') {
  // Space background
  ctx.fillStyle = '#030712'; ctx.fillRect(0,0,W,H);

  // Stars
  for (let i=0;i<40;i++) {
    const sx = (i*137.5) % W;
    const sy = (i*97.3)  % H;
    ctx.fillStyle = `rgba(255,255,255,${0.3+Math.sin(i)*0.3})`;
    ctx.beginPath(); ctx.arc(sx,sy,0.8,0,Math.PI*2); ctx.fill();
  }

  // Planet 1
  const p1r = (variant==='right') ? 38 : 35;
  const p1grad = ctx.createRadialGradient(W*0.2,H*0.3,0,W*0.2,H*0.3,p1r);
  p1grad.addColorStop(0,'#7c3aed'); p1grad.addColorStop(1,'#4c1d95');
  ctx.fillStyle = p1grad;
  ctx.beginPath(); ctx.arc(W*0.2,H*0.3,p1r,0,Math.PI*2); ctx.fill();

  // Planet 2
  const p2grad = ctx.createRadialGradient(W*0.75,H*0.6,0,W*0.75,H*0.6,28);
  p2grad.addColorStop(0,'#06b6d4'); p2grad.addColorStop(1,'#0e7490');
  ctx.fillStyle = p2grad;
  ctx.beginPath(); ctx.arc(W*0.75,H*0.6,28,0,Math.PI*2); ctx.fill();

  // Ring on planet 2 — DIFFERENCE: present/absent
  if (variant !== 'right') {
    ctx.strokeStyle = 'rgba(6,182,212,0.5)'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(W*0.75,H*0.6,42,10,0.3,0,Math.PI*2); ctx.stroke();
  }

  // Rocket — DIFFERENCE: colour
  const rocketCol = (variant==='right') ? '#ef4444' : '#f59e0b';
  ctx.fillStyle = rocketCol;
  ctx.beginPath();
  ctx.moveTo(W*0.5,H*0.15); ctx.lineTo(W*0.54,H*0.45);
  ctx.lineTo(W*0.46,H*0.45); ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(W*0.45,H*0.43,W*0.1,H*0.15);

  // Flame
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(W*0.47,H*0.58); ctx.lineTo(W*0.5,H*0.7); ctx.lineTo(W*0.53,H*0.58); ctx.closePath(); ctx.fill();

  // Asteroids
  [[0.3,0.7,6],[0.85,0.15,5],[0.6,0.25,7]].forEach(([x,y,r])=>{
    ctx.fillStyle='#374151';
    ctx.beginPath(); ctx.arc(W*x,H*y,r,0,Math.PI*2); ctx.fill();
  });
}

function drawOceanScene(ctx, W, H, variant = 'left') {
  // Water
  const water = ctx.createLinearGradient(0,0,0,H);
  water.addColorStop(0,'#0c4a6e'); water.addColorStop(1,'#082f49');
  ctx.fillStyle = water; ctx.fillRect(0,0,W,H);

  // Light rays
  ctx.fillStyle='rgba(6,182,212,0.04)';
  for (let i=0;i<4;i++) {
    ctx.beginPath();
    ctx.moveTo(W*(0.1+i*0.25),0);
    ctx.lineTo(W*(0.05+i*0.25),H);
    ctx.lineTo(W*(0.15+i*0.25),H);
    ctx.closePath(); ctx.fill();
  }

  // Fish 1 — DIFFERENCE: colour
  const f1col = (variant==='right') ? '#f59e0b' : '#ef4444';
  ctx.fillStyle = f1col;
  ctx.beginPath(); ctx.ellipse(W*0.25,H*0.3,20,10,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W*0.05,H*0.25); ctx.lineTo(W*0.15,H*0.3); ctx.lineTo(W*0.05,H*0.35); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(W*0.3,H*0.28,2,0,Math.PI*2); ctx.fill();

  // Fish 2
  ctx.fillStyle='#06b6d4';
  ctx.beginPath(); ctx.ellipse(W*0.7,H*0.55,16,8,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W*0.86,H*0.5); ctx.lineTo(W*0.76,H*0.55); ctx.lineTo(W*0.86,H*0.6); ctx.closePath(); ctx.fill();

  // Coral
  ctx.fillStyle='#ec4899';
  [[0.15,0.85],[0.4,0.9],[0.65,0.82],[0.85,0.88]].forEach(([x,y])=>{
    ctx.beginPath(); ctx.arc(W*x,H*y,8,0,Math.PI*2); ctx.fill();
    ctx.fillRect(W*x-2,H*y,4,H*0.1);
  });

  // Bubbles — DIFFERENCE: count
  const bubCount = (variant==='right') ? 4 : 3;
  ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1;
  for (let i=0;i<bubCount;i++) {
    const bx=W*(0.2+i*0.18), by=H*(0.6-i*0.08);
    ctx.beginPath(); ctx.arc(bx,by,4,0,Math.PI*2); ctx.fill(); ctx.stroke();
  }

  // Treasure chest — DIFFERENCE: open/closed (lid angle)
  ctx.fillStyle='#92400e';
  ctx.fillRect(W*0.45,H*0.78,W*0.12,H*0.1);
  ctx.fillStyle='#78350f';
  const lidOff = (variant==='right') ? -H*0.04 : 0;
  ctx.fillRect(W*0.45,H*0.78+lidOff,W*0.12,H*0.03);
  ctx.fillStyle='#fbbf24';
  ctx.beginPath(); ctx.arc(W*0.51,H*0.84,4,0,Math.PI*2); ctx.fill();
}

const SCENE_DRAWS = {
  park:  drawParkScene,
  space: drawSpaceScene,
  ocean: drawOceanScene
};

export class VisualObservation extends ChallengeBase {
  constructor(data, engine) {
    super(data, engine);
    window._MS_SCORE_MODULE = { calcScore };
    this._found = [];
    this._differences = [];
    this._sceneKey = null;
    this._answered = false;
    this._ripples = [];
    this._onPointerDownBound = null;
  }

  setup() {
    // Pick a scene from available draws; fallback to park
    const available = Object.keys(SCENE_DRAWS);
    this._sceneKey = available[Math.floor(Math.random() * available.length)];
    const count = this.data.diffCount || 3;
    // Define hotspot positions for differences (normalised 0–1 coords)
    this._differences = this._generateDiffs(count);
    this._drawScene();
  }

  start() {
    super.start();
    this._renderInstructions();
    this.startTimer(
      this.data.timeLimitSec,
      (t) => this.engine.hud.setTimer(t, this.data.timeLimitSec),
      () => { if (!this._answered) this._timeUp(); }
    );
    // Non-blocking overlay so all touch/click events reach canvas
    this.setOverlayInteractive(false);
    if (this.overlay) {
      this.overlay.style.pointerEvents = 'none';
    }
  }

  teardown() {
    super.teardown();
    this._stopAnim();
    this._cleanInputListeners();
  }

  _cleanInputListeners() {
    if (this._onPointerDownBound && this.canvas) {
      this.canvas.removeEventListener('pointerdown', this._onPointerDownBound);
      this.canvas.removeEventListener('touchstart', this._onPointerDownBound);
      this._onPointerDownBound = null;
    }
    if (this.canvas) {
      this.canvas.onclick = null;
    }
  }

  // ── Generation ─────────────────────────────────
  _generateDiffs(count) {
    const diffs = [];
    // Right half of canvas contains diffs; hotspot x in 0.5–1.0
    const spots = [
      { nx:0.55, ny:0.3  },
      { nx:0.7,  ny:0.55 },
      { nx:0.6,  ny:0.7  },
      { nx:0.9,  ny:0.25 },
      { nx:0.8,  ny:0.8  }
    ];
    return spots.slice(0, count);
  }

  // ── Canvas Drawing ─────────────────────────────
  _drawScene() {
    const { width: W, height: H } = this.canvas;
    const ctx = this.ctx;

    ctx.fillStyle = '#06060f'; ctx.fillRect(0, 0, W, H);

    const halfW = W / 2 - 4;

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();

    // Draw LEFT scene
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, halfW, H); ctx.clip();
    const drawFn = SCENE_DRAWS[this._sceneKey] || drawParkScene;
    drawFn.call(this, ctx, halfW, H, 'left');
    ctx.restore();

    // Draw RIGHT scene (with differences)
    ctx.save();
    ctx.translate(W/2 + 4, 0);
    ctx.beginPath(); ctx.rect(0, 0, halfW, H); ctx.clip();
    drawFn.call(this, ctx, halfW, H, 'right');
    ctx.restore();

    // Labels
    ctx.fillStyle = 'rgba(148,163,184,0.5)';
    ctx.font = '11px Inter,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCENE A', W/4, 16);
    ctx.fillText('SCENE B', W*3/4, 16);

    // Draw found circles on BOTH Scene A and Scene B
    this._found.forEach(f => {
      const halfW = W / 2 - 4;
      const leftX = f.xLeft !== undefined ? f.xLeft : (f.x - (W / 2 + 4));
      const rightX = f.xRight !== undefined ? f.xRight : f.x;
      const y = f.y;

      [leftX, rightX].forEach(xPos => {
        ctx.strokeStyle = '#10b981'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(xPos, y, 24, 0, Math.PI * 2); ctx.stroke();
        // Glow
        ctx.strokeStyle = 'rgba(16,185,129,0.35)'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(xPos, y, 28, 0, Math.PI * 2); ctx.stroke();
      });
    });

    // Draw active tap ripples
    if (this._ripples && this._ripples.length > 0) {
      for (let rIdx = this._ripples.length - 1; rIdx >= 0; rIdx--) {
        const rip = this._ripples[rIdx];
        rip.r += 2.0;
        rip.alpha -= 0.05;
        if (rip.alpha <= 0) {
          this._ripples.splice(rIdx, 1);
        } else {
          ctx.strokeStyle = `rgba(0, 242, 254, ${rip.alpha})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }

  _renderInstructions() {
    this.clearOverlay();
    if (this.overlay) {
      this.overlay.style.pointerEvents = 'none';
    }

    const info = document.createElement('div');
    info.style.cssText = `
      position:absolute;top:20px;left:50%;transform:translateX(-50%);
      background:rgba(6,6,15,0.92);border:1px solid rgba(0,242,254,0.35);
      box-shadow:0 0 20px rgba(0,242,254,0.18);
      border-radius:24px;padding:8px 24px;
      font-size:0.85rem;color:#f8fafc;font-weight:500;
      pointer-events:none;white-space:nowrap;z-index:10;
    `;
    info.id = 'visual-info';
    info.innerHTML = `🔍 Spot <b>${this.data.diffCount}</b> differences — tap or click either scene`;
    this.overlay.appendChild(info);

    const prog = document.createElement('div');
    prog.style.cssText = `
      position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
      background:rgba(6,6,15,0.92);border:1px solid rgba(16,185,129,0.4);
      box-shadow:0 0 20px rgba(16,185,129,0.18);
      border-radius:24px;padding:8px 24px;
      font-family:'Outfit',sans-serif;font-size:0.9rem;color:#10b981;font-weight:600;
      pointer-events:none;z-index:10;
    `;
    prog.id = 'visual-prog';
    prog.textContent = `Found: 0 / ${this.data.diffCount}`;
    this.overlay.appendChild(prog);

    // Responsive cursor and touch styling
    this.canvas.style.cursor = 'crosshair';
    this.canvas.style.touchAction = 'none';
    this.canvas.style.userSelect = 'none';

    this._cleanInputListeners();
    this._onPointerDownBound = (e) => this._onPointerInput(e);

    this.canvas.addEventListener('pointerdown', this._onPointerDownBound, { passive: false });
    this.canvas.addEventListener('touchstart', this._onPointerDownBound, { passive: false });
    this.canvas.onclick = (e) => this._onPointerInput(e);

    this.startAnim(() => this._drawScene());
  }

  _onPointerInput(e) {
    if (this._answered || this._resolved) return;
    if (e.cancelable && (e.type === 'touchstart' || e.type === 'pointerdown')) {
      e.preventDefault();
    }

    const rect = this.canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if (e.clientX !== undefined && e.clientY !== undefined) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }

    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;

    const W = this.canvas.width;
    const H = this.canvas.height;
    const scaleX = rect.width / W;
    const scaleY = rect.height / H;

    const canvasX = cssX / scaleX;
    const canvasY = cssY / scaleY;

    const halfW = W / 2 - 4;

    // Generous touch threshold in screen/CSS pixels (54px for comfortable fingertip accuracy)
    const touchThresholdCss = 54;

    let found = false;
    this._differences.forEach((diff, i) => {
      if (this._found.some(f => f.diffIdx === i)) return;

      // Hotspot on Left scene and Right scene
      const hxLeft = diff.nx * halfW;
      const hxRight = W / 2 + 4 + diff.nx * halfW;
      const hy = diff.ny * H;

      // Distances in screen/CSS pixels
      const distLeft = Math.hypot(cssX - (hxLeft * scaleX), cssY - (hy * scaleY));
      const distRight = Math.hypot(cssX - (hxRight * scaleX), cssY - (hy * scaleY));

      if (distLeft <= touchThresholdCss || distRight <= touchThresholdCss) {
        this._found.push({
          xLeft: hxLeft,
          xRight: hxRight,
          x: hxRight,
          y: hy,
          diffIdx: i
        });
        found = true;
        this.audio?.playCorrect?.() || this.audio?.playClick?.();
      }
    });

    if (!found) {
      this.audio?.playClick?.();
      this._ripples.push({
        x: canvasX,
        y: canvasY,
        r: 6,
        alpha: 0.85
      });
    }

    const prog = document.getElementById('visual-prog');
    if (prog) prog.textContent = `Found: ${this._found.length} / ${this.data.diffCount}`;

    if (this._found.length >= this.data.diffCount) {
      this._answered = true;
      this.canvas.style.cursor = 'default';
      this._cleanInputListeners();
      setTimeout(() => this.resolve(true), 800);
    }
  }

  _timeUp() {
    this._answered = true;
    this.canvas.style.cursor = 'default';
    this._cleanInputListeners();
    // Show remaining hotspots on both scenes
    this._differences.forEach((diff, i) => {
      if (this._found.some(f => f.diffIdx === i)) return;
      const W = this.canvas.width, H = this.canvas.height;
      const halfW = W / 2 - 4;
      const hxLeft = diff.nx * halfW;
      const hxRight = W / 2 + 4 + diff.nx * halfW;
      const hy = diff.ny * H;

      [hxLeft, hxRight].forEach(xPos => {
        this.ctx.strokeStyle = '#ef4444'; this.ctx.lineWidth = 3;
        this.ctx.beginPath(); this.ctx.arc(xPos, hy, 24, 0, Math.PI*2); this.ctx.stroke();
      });
    });
    this.audio?.playWrong?.();
    const correct = this._found.length >= this.data.diffCount;
    setTimeout(() => this.resolve(correct), 1000);
  }
}
