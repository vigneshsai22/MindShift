/* ═══════════════════════════════════════════════════════════════
   BrainMap.js
   Final scene: a procedural brain (grouped spheres) whose 6 lobes
   glow by skill score, plus holographic stat panels.
   Also shows Chart.js HTML overlay with print/download buttons.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

const SKILL_COLORS = {
  memory:      0x00aaff,
  logical:     0xaa00ff,
  pattern:     0x00ff88,
  visual:      0xffcc00,
  reaction:    0xff4400,
  'iq-spatial':0x00ffcc,
};

const LOBE_POSITIONS = [
  { cat:'memory',      pos:[-1.5, 0.6,  0.2],  label:'Memory' },
  { cat:'logical',     pos:[1.5,  0.6,  0.2],  label:'Logic' },
  { cat:'pattern',     pos:[0,    1.2,  0.4],  label:'Pattern' },
  { cat:'visual',      pos:[-0.8, 0,   -0.6],  label:'Visual' },
  { cat:'reaction',    pos:[0.8,  0,   -0.6],  label:'Reaction' },
  { cat:'iq-spatial',  pos:[0,    0.3,  1.0],  label:'Spatial' },
];

export class BrainMap {
  constructor({ scene3d, summary, catPerf, profile, adaptive, onRestart }) {
    this.scene3d   = scene3d;
    this.summary   = summary;
    this.catPerf   = catPerf;
    this.profile   = profile;
    this.adaptive  = adaptive;
    this.onRestart = onRestart;
    this._group    = new THREE.Group();
    this._lobes    = [];
    this._time     = 0;
    this._overlay  = null;
  }

  init() {
    // Clear previous scene objects (keep lights)
    const { scene, camera } = this.scene3d;
    scene.add(this._group);

    // Position camera for brain view
    camera.position.set(0, 2, 6);
    camera.lookAt(0, 0.5, 0);

    this._buildBrain();
    this._buildPanels();
    this._buildHTMLOverlay();
  }

  _buildBrain() {
    // Central brain mass
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1a0033, roughness: 0.6, metalness: 0.3,
      emissive: 0x100022, emissiveIntensity: 0.4 });
    const base = new THREE.Mesh(new THREE.SphereGeometry(1.8, 32, 32), baseMat);
    base.castShadow = true;
    this._group.add(base);

    // Lobes = smaller spheres with glow driven by skill score
    LOBE_POSITIONS.forEach(({ cat, pos, label }) => {
      const score = this.catPerf[cat] ?? 0; // 0-100
      const color = SKILL_COLORS[cat] ?? 0x4488ff;
      const mat   = new THREE.MeshStandardMaterial({
        color,
        emissive: new THREE.Color(color),
        emissiveIntensity: score / 40,   // 100% → 2.5 intensity
        roughness: 0.3,
        metalness: 0.5,
        transparent: true,
        opacity: 0.7 + score / 333,
      });
      const radius = 0.45 + score / 200;
      const mesh   = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), mat);
      mesh.position.set(...pos);
      mesh.castShadow = true;
      this._group.add(mesh);
      this._lobes.push({ mesh, mat, label, score, cat });
    });

    // Particle network between lobes
    const pts = [];
    LOBE_POSITIONS.forEach(a => {
      LOBE_POSITIONS.forEach(b => {
        if (a === b) return;
        pts.push(...a.pos, ...b.pos);
      });
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x4444aa, transparent: true, opacity: 0.2 });
    const lines = new THREE.LineSegments(geo, lineMat);
    this._group.add(lines);

    // Ambient glow light at center
    const glow = new THREE.PointLight(0x8800ff, 2, 10);
    glow.position.set(0, 0.5, 0);
    this._group.add(glow);
    this._glowLight = glow;

    this._group.position.set(0, 0, 0);
    this._group.rotation.y = 0;
  }

  _buildPanels() {
    const panelData = [
      { label:'TOTAL SCORE',    value: String(this.summary.totalScore ?? 0),    x:-4 },
      { label:'ACCURACY',       value: (this.summary.overallAccuracy ?? 0)+'%', x:-1.3 },
      { label:'AVG RESPONSE',   value: (this.summary.avgResponseTime ?? 0)+'s', x:1.3 },
      { label:'BEST STREAK',    value: String(this.summary.bestStreak ?? 0),    x:4 },
    ];

    panelData.forEach(({ label, value, x }) => {
      const cv  = document.createElement('canvas');
      cv.width  = 256; cv.height = 160;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#020d1a';
      ctx.fillRect(0, 0, 256, 160);
      ctx.strokeStyle = '#0066aa';
      ctx.lineWidth = 3;
      ctx.strokeRect(4, 4, 248, 152);
      ctx.fillStyle = '#0099cc';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, 128, 40);
      ctx.fillStyle = '#00eeff';
      ctx.font = 'bold 52px monospace';
      ctx.fillText(value, 128, 110);
      const tex  = new THREE.CanvasTexture(cv);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 1.4),
        new THREE.MeshStandardMaterial({ map: tex, emissive: 0x001122, emissiveIntensity: 0.5 })
      );
      mesh.position.set(x, 4, -1);
      this._group.add(mesh);
    });

    // Strongest / weakest
    const entries = Object.entries(this.catPerf).filter(([,v]) => v !== null);
    entries.sort((a,b) => b[1]-a[1]);
    const strongest = entries[0]?.[0] ?? '—';
    const weakest   = entries[entries.length-1]?.[0] ?? '—';

    const swCv = document.createElement('canvas');
    swCv.width = 512; swCv.height = 100;
    const swCtx = swCv.getContext('2d');
    swCtx.fillStyle = '#010c16'; swCtx.fillRect(0,0,512,100);
    swCtx.fillStyle = '#00ff88'; swCtx.font = 'bold 22px monospace'; swCtx.textAlign = 'left';
    swCtx.fillText(`💪 Strongest: ${strongest}`, 20, 40);
    swCtx.fillStyle = '#ff8800';
    swCtx.fillText(`📈 Improve: ${weakest}`, 20, 80);
    const swTex  = new THREE.CanvasTexture(swCv);
    const swMesh = new THREE.Mesh(new THREE.PlaneGeometry(5, 1),
      new THREE.MeshStandardMaterial({ map: swTex, emissive: 0x001122, emissiveIntensity:0.4 }));
    swMesh.position.set(0, 2.5, 3);
    this._group.add(swMesh);
  }

  _buildHTMLOverlay() {
    this._overlay = document.createElement('div');
    this._overlay.id = 'brain-map-overlay';
    this._overlay.style.cssText = `
      position:fixed;right:0;top:0;width:360px;height:100vh;
      background:rgba(2,10,20,0.92);border-left:1px solid #003355;
      overflow-y:auto;padding:20px;z-index:600;font-family:'JetBrains Mono',monospace;
      color:#cce8ff;`;

    const s = this.summary;
    const catPerf = this.catPerf;

    this._overlay.innerHTML = `
      <h2 style="color:#00ccff;margin-top:0">🧠 Session Report</h2>
      <p style="color:#888;font-size:11px">Player: ${this.profile?.name ?? 'Unknown'}</p>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${[['Score',s.totalScore],['Accuracy',s.overallAccuracy+'%'],['Avg Time',s.avgResponseTime+'s'],['Streak',s.bestStreak]]
          .map(([l,v])=>`<div style="background:#071a2e;border:1px solid #004466;border-radius:6px;padding:8px 12px;flex:1;min-width:70px">
            <div style="font-size:10px;color:#6699aa">${l}</div>
            <div style="font-size:22px;font-weight:bold;color:#00eeff">${v}</div>
          </div>`).join('')}
      </div>

      <canvas id="bm-radar" width="300" height="300" style="width:100%"></canvas>
      <canvas id="bm-bar"   width="300" height="200" style="width:100%;margin-top:12px"></canvas>

      <div style="margin-top:16px;display:flex;gap:8px">
        <button id="bm-print" style="flex:1;padding:10px;background:#003355;color:#00eeff;border:1px solid #0066aa;border-radius:6px;cursor:pointer;font-size:12px">🖨 Print / PDF</button>
        <button id="bm-restart" style="flex:1;padding:10px;background:#330020;color:#ff88aa;border:1px solid #660033;border-radius:6px;cursor:pointer;font-size:12px">▶ Play Again</button>
      </div>

      <style>
        @media print {
          body > *:not(#brain-map-overlay){ display:none!important; }
          #brain-map-overlay { position:static;width:100%;height:auto;border:none; }
        }
      </style>
    `;

    document.body.appendChild(this._overlay);

    document.getElementById('bm-print')?.addEventListener('click', () => window.print());
    document.getElementById('bm-restart')?.addEventListener('click', () => {
      this._overlay.remove();
      this.onRestart?.();
    });

    // Chart.js radar & bar (Chart.js loaded globally in index.html)
    setTimeout(() => this._drawCharts(catPerf), 100);
  }

  _drawCharts(catPerf) {
    if (!window.Chart) return;

    const labels = Object.keys(catPerf).filter(k => catPerf[k] !== null);
    const values = labels.map(k => catPerf[k]);
    const colors = labels.map(l => '#' + (SKILL_COLORS[l] ?? 0x4488ff).toString(16).padStart(6,'0'));

    // Radar
    const radarCtx = document.getElementById('bm-radar')?.getContext('2d');
    if (radarCtx) new Chart(radarCtx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{ label: 'Performance', data: values, borderColor: '#00ccff',
          backgroundColor: 'rgba(0,180,255,0.15)', pointBackgroundColor: colors }]
      },
      options: { scales: { r: { min:0, max:100,
        grid:{ color:'#003355' }, ticks:{ color:'#6699aa' },
        pointLabels:{ color:'#88bbcc', font:{ size:9 } } } },
        plugins: { legend: { labels:{ color:'#cce8ff' } } } }
    });

    // Bar
    const barCtx = document.getElementById('bm-bar')?.getContext('2d');
    if (barCtx) new Chart(barCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Score %', data: values, backgroundColor: colors }]
      },
      options: { scales: { y: { min:0, max:100,
        grid:{color:'#002233'}, ticks:{color:'#6699aa'} },
        x: { ticks:{color:'#88aacc', font:{size:9}} } },
        plugins: { legend:{ labels:{color:'#cce8ff'} } } }
    });
  }

  update(delta) {
    this._time += delta;
    // Slowly rotate brain
    this._group.rotation.y = this._time * 0.15;
    // Pulse glow
    if (this._glowLight) this._glowLight.intensity = 1.5 + Math.sin(this._time * 2) * 0.5;
    // Pulse lobes
    this._lobes.forEach((l, i) => {
      const p = 1 + Math.sin(this._time * 1.2 + i * 0.8) * 0.04;
      l.mesh.scale.setScalar(p);
    });
  }

  dispose() {
    this._overlay?.remove();
    this._group.traverse(o => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); });
    this.scene3d.scene.remove(this._group);
  }
}
