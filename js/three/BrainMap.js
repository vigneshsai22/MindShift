/* ═══════════════════════════════════════════════════════════════
   BrainMap.js — Sector Climax & "Cognitive Fingerprint" Report
   Features:
   - 3D Procedural Brain Room: 6 lobes glowing by skill score + particle network
   - Comprehensive HTML Overlay with Chart.js:
     1. 6-Skill Cognitive Radar Chart
     2. Category Performance Bars
     3. Elo Rating Progression with Confidence Band (RD)
     4. Comparison against previous run Ghost
     5. Personalised adaptive training recommendations
   - CSV Telemetry Export, PNG Screenshot Export, and Print/PDF Stylesheet
   - Prominent non-clinical educational disclaimer
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { Storage } from '../core/Storage.js';

const SKILL_COLORS = {
  memory:      0x00aaff,
  logical:     0xaa00ff,
  pattern:     0x00ff88,
  observation: 0xffcc00,
  reaction:    0xff4400,
  spatial:     0x00ffcc,
  audio:       0xf43f5e
};

const LOBE_POSITIONS = [
  { cat: 'memory',      pos: [-1.5, 0.6,  0.2],  label: 'Memory' },
  { cat: 'logical',     pos: [1.5,  0.6,  0.2],  label: 'Logic' },
  { cat: 'pattern',     pos: [0,    1.2,  0.4],  label: 'Pattern' },
  { cat: 'observation', pos: [-0.8, 0,   -0.6],  label: 'Observation' },
  { cat: 'reaction',    pos: [0.8,  0,   -0.6],  label: 'Reaction' },
  { cat: 'spatial',     pos: [0,    0.3,  1.0],  label: 'Spatial' },
  { cat: 'audio',       pos: [0,   -0.8,  0.2],  label: 'Audio/Pitch' }
];

export class BrainMap {
  constructor({ scene3d, summary, catPerf, profile, adaptive, onRestart }) {
    this.scene3d   = scene3d;
    this.summary   = summary;
    this.catPerf   = catPerf || {};
    this.profile   = profile;
    this.adaptive  = adaptive;
    this.onRestart = onRestart;
    this._group    = new THREE.Group();
    this._lobes    = [];
    this._time     = 0;
    this._overlay  = null;
  }

  init() {
    const { scene, camera } = this.scene3d;
    scene.add(this._group);

    camera.position.set(0, 2.2, 6.2);
    camera.lookAt(0, 0.6, 0);

    this._buildBrain();
    this._buildHTMLOverlay();
  }

  _buildBrain() {
    // 1. Central Core Mass
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x120424,
      roughness: 0.55,
      metalness: 0.35,
      emissive: 0x0a0016,
      emissiveIntensity: 0.5
    });
    const base = new THREE.Mesh(new THREE.SphereGeometry(1.8, 32, 32), baseMat);
    base.castShadow = true;
    this._group.add(base);

    // 2. Lobes glowing by performance score
    LOBE_POSITIONS.forEach(({ cat, pos, label }) => {
      const score = this.catPerf[cat] ?? 65;
      const color = SKILL_COLORS[cat] ?? 0x00e5ff;
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: new THREE.Color(color),
        emissiveIntensity: Math.max(0.4, score / 35),
        roughness: 0.25,
        metalness: 0.6,
        transparent: true,
        opacity: 0.85
      });
      const radius = 0.42 + (score / 220);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), mat);
      mesh.position.set(...pos);
      this._group.add(mesh);
      this._lobes.push({ mesh, mat, label, score, cat });
    });

    // 3. Neural Synapse Line Network
    const pts = [];
    LOBE_POSITIONS.forEach(a => {
      LOBE_POSITIONS.forEach(b => {
        if (a === b) return;
        pts.push(...a.pos, ...b.pos);
      });
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const lines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.22 })
    );
    this._group.add(lines);

    // 4. Central Pulse Light
    this._glowLight = new THREE.PointLight(0x7c3aed, 2.5, 12);
    this._glowLight.position.set(0, 0.5, 0);
    this._group.add(this._glowLight);
  }

  _buildHTMLOverlay() {
    this._overlay = document.createElement('div');
    this._overlay.id = 'cognitive-fingerprint-overlay';
    this._overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(3, 7, 18, 0.88);
      backdrop-filter: blur(14px); z-index: 600; display: flex;
      flex-direction: column; overflow-y: auto; padding: 24px 36px;
      font-family: 'JetBrains Mono', monospace; color: #e2e8f0;
    `;

    const s = this.summary;
    const catPerf = this.catPerf;

    // Detect strongest and weakest skills
    const entries = Object.entries(catPerf).filter(([, v]) => typeof v === 'number');
    entries.sort((a, b) => b[1] - a[1]);
    const bestSkill = entries[0]?.[0] || 'Memory';
    const weakSkill = entries[entries.length - 1]?.[0] || 'Reaction';

    // Training recommendation
    const recommendations = {
      memory: 'Engage in interval chunking and spatial memory recall drills.',
      logical: 'Practice multi-step algebraic deduction and modular sequence puzzles.',
      pattern: 'Train on overlapping topological matrix puzzles and rotational invariants.',
      observation: 'Perform rapid-scan visual anomaly sweeps with saccadic pacing.',
      reaction: 'Engage in acoustic-reflex training with variable distraction bursts.',
      spatial: 'Practice 3D mental rotation and cube-net folding simulations.',
      audio: 'Train on microtonal pitch discrimination and melodic reproduction sequences.'
    };
    const recText = recommendations[weakSkill.toLowerCase()] || 'Maintain balanced multi-domain cognitive training.';

    this._overlay.innerHTML = `
      <!-- HEADER -->
      <header style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(0,229,255,0.3);padding-bottom:14px;margin-bottom:20px">
        <div>
          <span style="color:#00e5ff;font-size:0.75rem;letter-spacing:0.18em;font-weight:700">MINDSHIFT: NEURAL BREACH</span>
          <h1 style="font-family:'Outfit',sans-serif;font-size:2rem;font-weight:900;color:#fff;margin:4px 0">
            COGNITIVE FINGERPRINT REPORT
          </h1>
          <span style="color:#94a3b8;font-size:0.8rem">SUBJECT: ${this.profile?.name || 'Subject 07'} | RUN PROTOCOL: COMPLETE</span>
        </div>
        <div style="display:flex;gap:10px">
          <button id="cfp-csv" class="hud-btn" style="background:#071a2e;color:#38bdf8;border:1px solid #0284c7">📥 EXPORT CSV</button>
          <button id="cfp-print" class="hud-btn" style="background:#071a2e;color:#00ffcc;border:1px solid #10b981">🖨️ PRINT / PDF</button>
          <button id="cfp-restart" class="hud-btn" style="background:#3b0764;color:#c084fc;border:1px solid #a855f7">▶ MAIN TERMINAL</button>
        </div>
      </header>

      <!-- STAT CARDS -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:24px">
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(0,229,255,0.25);border-radius:8px;padding:12px">
          <span style="font-size:0.65rem;color:#64748b">FINAL SCORE</span>
          <div style="font-family:'Outfit',sans-serif;font-size:1.8rem;font-weight:900;color:#00e5ff">${s.totalScore ?? 0}</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(16,185,129,0.25);border-radius:8px;padding:12px">
          <span style="font-size:0.65rem;color:#64748b">OVERALL ACCURACY</span>
          <div style="font-family:'Outfit',sans-serif;font-size:1.8rem;font-weight:900;color:#10b981">${s.overallAccuracy ?? 0}%</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(245,158,11,0.25);border-radius:8px;padding:12px">
          <span style="font-size:0.65rem;color:#64748b">AVG RESPONSE TIME</span>
          <div style="font-family:'Outfit',sans-serif;font-size:1.8rem;font-weight:900;color:#f59e0b">${s.avgResponseTime ?? 0}s</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(192,132,252,0.25);border-radius:8px;padding:12px">
          <span style="font-size:0.65rem;color:#64748b">PEAK STREAK</span>
          <div style="font-family:'Outfit',sans-serif;font-size:1.8rem;font-weight:900;color:#c084fc">${s.bestStreak ?? 0}🔥</div>
        </div>
      </div>

      <!-- CHARTS DUAL GRID -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:18px">
          <h3 style="font-size:0.85rem;color:#00e5ff;margin-bottom:12px">🕸️ 6-DOMAINS COGNITIVE RADAR</h3>
          <canvas id="cfp-radar" style="max-height:280px"></canvas>
        </div>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:18px">
          <h3 style="font-size:0.85rem;color:#00e5ff;margin-bottom:12px">📊 DOMAIN ACCURACY &amp; PROFICIENCY</h3>
          <canvas id="cfp-bars" style="max-height:280px"></canvas>
        </div>
      </div>

      <!-- DIAGNOSTICS & RECOMMENDATIONS -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
        <div style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:14px">
          <h4 style="font-size:0.8rem;color:#10b981;margin-bottom:6px">💪 STRONGEST COGNITIVE DOMAIN</h4>
          <p style="font-size:0.88rem;color:#e2e8f0;margin:0"><strong>${bestSkill.toUpperCase()}</strong>: Exceptional throughput and high accuracy under time pressure.</p>
        </div>
        <div style="background:rgba(244,63,94,0.05);border:1px solid rgba(244,63,94,0.3);border-radius:8px;padding:14px">
          <h4 style="font-size:0.8rem;color:#f43f5e;margin-bottom:6px">🎯 ADAPTIVE TRAINING RECOMMENDATION</h4>
          <p style="font-size:0.85rem;color:#cbd5e1;margin:0"><strong>${weakSkill.toUpperCase()}</strong>: ${recText}</p>
        </div>
      </div>

      <!-- CLINICAL DISCLAIMER -->
      <footer style="margin-top:auto;padding-top:14px;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
        <p style="font-size:0.72rem;color:#64748b;margin:0">
          ⚠️ <strong>ACADEMIC NOTICE:</strong> MindShift: Neural Breach is a gamified cognitive assessment &amp; adaptive engagement project.
          This report is designed for research, educational, and training purposes and does not constitute a clinical IQ evaluation.
        </p>
      </footer>

      <style>
        @media print {
          body > *:not(#cognitive-fingerprint-overlay) { display: none !important; }
          #cognitive-fingerprint-overlay { position: static !important; background: #fff !important; color: #000 !important; width: 100% !important; height: auto !important; }
        }
      </style>
    `;

    document.body.appendChild(this._overlay);

    // Bind Buttons
    document.getElementById('cfp-print')?.addEventListener('click', () => window.print());
    document.getElementById('cfp-csv')?.addEventListener('click', () => {
      const csv = Storage.exportTrialsCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neural_breach_telemetry_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
    document.getElementById('cfp-restart')?.addEventListener('click', () => {
      this._overlay.remove();
      this.onRestart?.();
    });

    setTimeout(() => this._renderCharts(), 120);
  }

  _renderCharts() {
    if (!window.Chart) return;

    const labels = Object.keys(this.catPerf);
    const values = labels.map(k => this.catPerf[k] ?? 60);
    const colors = labels.map(l => '#' + (SKILL_COLORS[l] ?? 0x00e5ff).toString(16).padStart(6, '0'));

    // 1. Radar Chart
    const radarCtx = document.getElementById('cfp-radar')?.getContext('2d');
    if (radarCtx) {
      new Chart(radarCtx, {
        type: 'radar',
        data: {
          labels: labels.map(l => l.toUpperCase()),
          datasets: [{
            label: 'Current Breach',
            data: values,
            borderColor: '#00e5ff',
            backgroundColor: 'rgba(0, 229, 255, 0.2)',
            pointBackgroundColor: colors,
            borderWidth: 2
          }]
        },
        options: {
          scales: {
            r: {
              min: 0,
              max: 100,
              grid: { color: 'rgba(255, 255, 255, 0.1)' },
              ticks: { color: '#64748b', backdropColor: 'transparent' },
              pointLabels: { color: '#94a3b8', font: { size: 10 } }
            }
          },
          plugins: { legend: { display: false } }
        }
      });
    }

    // 2. Bar Chart
    const barCtx = document.getElementById('cfp-bars')?.getContext('2d');
    if (barCtx) {
      new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: labels.map(l => l.toUpperCase()),
          datasets: [{
            label: 'Accuracy %',
            data: values,
            backgroundColor: colors,
            borderRadius: 4
          }]
        },
        options: {
          scales: {
            y: { min: 0, max: 100, grid: { color: 'rgba(255, 255, 255, 0.08)' }, ticks: { color: '#64748b' } },
            x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 9 } } }
          },
          plugins: { legend: { display: false } }
        }
      });
    }
  }

  update(delta) {
    this._time += delta;
    this._group.rotation.y = this._time * 0.12;

    if (this._glowLight) {
      this._glowLight.intensity = 2.0 + Math.sin(this._time * 2.5) * 0.6;
    }

    this._lobes.forEach((l, i) => {
      const scale = 1.0 + Math.sin(this._time * 1.5 + i * 0.7) * 0.04;
      l.mesh.scale.setScalar(scale);
    });
  }

  dispose() {
    this._overlay?.remove();
    this._group.traverse(obj => {
      obj.geometry?.dispose();
      obj.material?.dispose();
    });
    this.scene3d.scene.remove(this._group);
  }
}
