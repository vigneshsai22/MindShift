/* ═══════════════════════════════════════════════════════════════
   HologramMatrix.js — Tier 1 Pattern Induction Game (3D)
   Cognitive Domain: Inductive reasoning, matrix completion, spatial-geometric patterns.
   Multi-Round Mission: Player deciphers relational rules across
   sequential rounds to choose the missing holographic glyph.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GameBase } from '../../kit/GameBase.js';
import { Tween }    from '../../kit/TweenLib.js';
import { SFXLib }   from '../../audio/SFXLib.js';
import { EventBus } from '../../core/EventBus.js';

export class HologramMatrix extends GameBase {
  constructor() {
    super({
      id: 'hologram-matrix',
      name: 'Hologram Matrix',
      skill: 'pattern',
      tags: ['pattern-induction', 'matrix-reasoning', 'relational-rules'],
      palette: { primary: '#c084fc', secondary: '#2e1065', accent: '#a855f7' },
      goalText: 'Deduce the relational pattern and select the missing glyph.'
    });

    this.matrixCells = [];
    this.candidates = [];
    this.correctCandidateIndex = -1;
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this.matrixGroup = null;
    this._targetFrame = null;
    this._time = 0;
  }

  build(scene, camera) {
    super.build(scene, camera);

    camera.position.set(0, 1.7, 6.2);
    camera.lookAt(0, 1.45, 0);

    // Hologram projector base plate — positioned on floor well below candidates
    const baseGeom = new THREE.CylinderGeometry(3.2, 3.6, 0.3, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0a1128,
      metalness: 0.85,
      roughness: 0.2
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.set(0, -1.25, -0.3);
    this.addObject(base);

    // Glowing emitter ring on floor projector
    const ringGeom = new THREE.TorusGeometry(3.25, 0.06, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -1.1, -0.3);
    this.addObject(ring);

    // Lighting
    const pLight = new THREE.PointLight(0xc084fc, 2.5, 16);
    pLight.position.set(0, 3.2, 3);
    this.addObject(pLight);

    const hemiLight = new THREE.HemisphereLight(0xe9d5ff, 0x1e1b4b, 1.2);
    this.addObject(hemiLight);

    this.matrixGroup = new THREE.Group();
    this.matrixGroup.position.set(0, 2.05, 0);
    this.addObject(this.matrixGroup);

    if (!this.inputManager) {
      const canvas = document.querySelector('#three-canvas') || window;
      this.listen(canvas, 'pointerdown', (e) => this._onPointerDown(e));
    }
  }

  start(levelParams) {
    if (this.camera) {
      this.camera.position.set(0, 1.7, 6.2);
      this.camera.lookAt(0, 1.45, 0);
    }
    super.start(levelParams);
  }

  setupRound(roundIndex, ramp, levelParams = {}) {
    if (this.finished) return;

    this._clearMatrix();

    // Shape generators
    const shapes = [
      () => new THREE.BoxGeometry(0.55, 0.55, 0.55),
      () => new THREE.SphereGeometry(0.35, 16, 16),
      () => new THREE.OctahedronGeometry(0.38),
      () => new THREE.ConeGeometry(0.32, 0.65, 16)
    ];

    const colorPalettes = [
      [0x38bdf8, 0xc084fc, 0xf472b6],
      [0x10b981, 0xf59e0b, 0xef4444],
      [0xa855f7, 0x06b6d4, 0xec4899]
    ];
    const colors = colorPalettes[roundIndex % colorPalettes.length];

    const gridSize = 3;
    const spacing = 1.35;
    const startOffset = -((gridSize - 1) * spacing) / 2;

    // Rule: shape = (r + c + ruleShift) % 3, color = colors[(r + c) % 3]
    const ruleShift = Math.floor(Math.random() * 3);

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const x = startOffset + c * spacing;
        const y = -startOffset - r * spacing;

        // Bottom-right slot (2,2) is the missing target
        if (r === 2 && c === 2) {
          const frameGeom = new THREE.RingGeometry(0.42, 0.48, 32);
          const frameMat = new THREE.MeshBasicMaterial({
            color: 0xc084fc,
            side: THREE.DoubleSide
          });
          const targetFrame = new THREE.Mesh(frameGeom, frameMat);
          targetFrame.position.set(x, y, 0);
          this.matrixGroup.add(targetFrame);
          this._targetFrame = targetFrame;
          continue;
        }

        const shapeIdx = (r + c + ruleShift) % shapes.length;
        const geom = shapes[shapeIdx]();
        const mat = new THREE.MeshStandardMaterial({
          color: colors[(r + c) % colors.length],
          roughness: 0.25,
          metalness: 0.7,
          emissive: colors[(r + c) % colors.length],
          emissiveIntensity: 0.35
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(x, y, 0);
        const sc = 0.85 + (c * 0.15);
        mesh.scale.set(sc, sc, sc);
        this.matrixGroup.add(mesh);
        this.matrixCells.push(mesh);
      }
    }

    // Missing target specification:
    // r=2, c=2 => shapeIdx = (2 + 2 + ruleShift) % shapes.length
    // color = colors[(2 + 2) % colors.length]
    // scale = 0.85 + 2 * 0.15 = 1.15
    const correctShapeIdx = (2 + 2 + ruleShift) % shapes.length;
    const colorIdx = (2 + 2) % colors.length;
    const correctColor = colors[colorIdx];
    const correctScale = 1.15;

    // Build 4 guaranteed-unique candidate configurations (1 correct + 3 distinct foils)
    // No two options will ever share the same shape and color combination!
    const candidateConfigs = [
      {
        sIdx: correctShapeIdx,
        col: correctColor,
        sc: correctScale,
        isCorrect: true,
        reason: ''
      },
      {
        sIdx: (correctShapeIdx + 1) % shapes.length,
        col: correctColor,
        sc: correctScale,
        isCorrect: false,
        reason: 'Incorrect geometric shape'
      },
      {
        sIdx: correctShapeIdx,
        col: colors[(colorIdx + 1) % colors.length],
        sc: correctScale,
        isCorrect: false,
        reason: 'Incorrect color harmonic'
      },
      {
        sIdx: (correctShapeIdx + 2) % shapes.length,
        col: colors[(colorIdx + 2) % colors.length],
        sc: 0.80,
        isCorrect: false,
        reason: 'Incorrect scale and transformation rule'
      }
    ];

    // Fisher-Yates shuffle so correct answer can be at any index (0..3)
    for (let i = candidateConfigs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidateConfigs[i], candidateConfigs[j]] = [candidateConfigs[j], candidateConfigs[i]];
    }

    this.correctCandidateIndex = candidateConfigs.findIndex(c => c.isCorrect);
    const candSpacing = 1.45;
    const candStartX = -((4 - 1) * candSpacing) / 2;

    for (let i = 0; i < 4; i++) {
      const cfg = candidateConfigs[i];
      const sIdx = cfg.sIdx;
      const col = cfg.col;
      const sc = cfg.sc;
      const isCorrect = cfg.isCorrect;

      const posX = candStartX + i * candSpacing;

      // 1. Sleek illuminated selector pedestal underneath
      const pedestal = new THREE.Group();
      pedestal.position.set(posX, -0.34, 0.4);

      const pGeom = new THREE.CylinderGeometry(0.48, 0.52, 0.08, 32);
      const pMat = new THREE.MeshStandardMaterial({
        color: 0x1e1b4b,
        metalness: 0.8,
        roughness: 0.25
      });
      const pMesh = new THREE.Mesh(pGeom, pMat);
      pedestal.add(pMesh);

      // Glowing selector ring
      const ringG = new THREE.RingGeometry(0.40, 0.48, 32);
      const ringM = new THREE.MeshBasicMaterial({ color: 0x64748b, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringG, ringM);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.045;
      pedestal.add(ring);

      // Upward soft point light
      const pLight = new THREE.PointLight(col, 1.0, 2.0);
      pLight.position.set(0, 0.15, 0);
      pedestal.add(pLight);

      // Number badge pill: [1], [2], [3], [4]
      const badgeTex = this._createBadgeTexture(`[${i + 1}]`);
      const badgeMat = new THREE.MeshBasicMaterial({ map: badgeTex, transparent: true });
      const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.22), badgeMat);
      badge.position.set(0, 0.02, 0.46);
      badge.rotation.x = -Math.PI / 6;
      pedestal.add(badge);

      this.addObject(pedestal);

      // 2. Hovering 3D geometric candidate glyph fully above pedestal
      const geom = shapes[sIdx]();
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.2,
        metalness: 0.7,
        emissive: col,
        emissiveIntensity: 0.35
      });
      const candMesh = new THREE.Mesh(geom, mat);
      candMesh.position.set(posX, 0.05, 0.4);
      candMesh.scale.set(sc, sc, sc);

      candMesh.userData = {
        index: i,
        isCorrect,
        reason: cfg.reason,
        mat,
        ringM,
        pedestal,
        pLight,
        basePos: candMesh.position.clone()
      };

      this.addObject(candMesh);
      this.candidates.push(candMesh);

      // Register target with InputManager
      this.registerTarget(`matrix_cand_${i}`, candMesh, {
        hitRadius: 1.35,
        key: String(i + 1),
        onHover: (hovered) => {
          if (hovered) {
            mat.emissiveIntensity = 1.2;
            ringM.color.setHex(0x00f2fe);
            pLight.intensity = 2.0;
          } else {
            mat.emissiveIntensity = 0.35;
            ringM.color.setHex(0x64748b);
            pLight.intensity = 1.0;
          }
        },
        onPress: () => {
          if (this.paused || this.finished || !this.roundActive) return;
          this._chooseCandidate(candMesh);
        }
      });
    }

    if (this.isPractice) {
      EventBus.emit('hud:subtitle', {
        text: '🟢 PRACTICE: Observe shape transformations across rows. Select the matching glyph (1–4).'
      });
    } else {
      EventBus.emit('hud:subtitle', {
        text: `🧩 Round ${roundIndex} / ${this.totalRounds}: Deduce relational pattern & complete the matrix.`
      });
    }
  }

  _createBadgeTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 120, 56, 12);
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 32);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  teardownRound(correct, reason) {
    this._clearMatrix();
  }

  _clearMatrix() {
    for (const cell of this.matrixCells) {
      if (cell.parent) cell.parent.remove(cell);
    }
    this.matrixCells = [];

    if (this._targetFrame && this._targetFrame.parent) {
      this._targetFrame.parent.remove(this._targetFrame);
      this._targetFrame = null;
    }

    for (const cand of this.candidates) {
      if (this.inputManager) {
        this.inputManager.unregisterTarget(`matrix_cand_${cand.userData.index}`);
      }
      if (cand.userData.pedestal && cand.userData.pedestal.parent) {
        cand.userData.pedestal.parent.remove(cand.userData.pedestal);
      }
      if (cand.parent) cand.parent.remove(cand);
    }
    this.candidates = [];
  }

  _chooseCandidate(cand) {
    if (!this.roundActive || this.finished) return;
    this.registerPlayerAction();

    const data = cand.userData;
    if (!data) return;

    if (data.isCorrect) {
      // Correct!
      SFXLib.playSuccess?.() || SFXLib.levelStart?.();
      data.mat.emissive.setHex(0x00ff88);
      data.mat.emissiveIntensity = 2.0;

      // Tween into missing slot
      if (this._targetFrame) {
        const targetWorldPos = new THREE.Vector3();
        this._targetFrame.getWorldPosition(targetWorldPos);
        Tween.to(cand.position, {
          x: targetWorldPos.x,
          y: targetWorldPos.y,
          z: targetWorldPos.z
        }, 0.3, 'easeOutBack').start();
      }

      EventBus.emit('hud:subtitle', { text: '✨ Inductive pattern validated! Matrix symmetry locked.' });
      this.setTimeout(() => {
        this.endRound(true);
      }, 500);
    } else {
      // Incorrect
      SFXLib.playError?.();
      data.mat.emissive.setHex(0xef4444);
      data.mat.emissiveIntensity = 1.8;

      Tween.to(cand.position, { y: data.basePos.y - 0.2 }, 0.1)
        .onComplete(() => {
          Tween.to(cand.position, { y: data.basePos.y }, 0.15).start();
        }).start();

      const failReason = data.reason ? `${data.reason} on Candidate [${data.index + 1}]` : `Transformation mismatch on Candidate [${data.index + 1}]`;
      EventBus.emit('hud:subtitle', {
        text: `✗ Non-compliant glyph: Candidate [${data.index + 1}] (${data.reason || 'breaks symmetry'}).`
      });

      this.setTimeout(() => {
        this.endRound(false, failReason);
      }, 650);
    }
  }

  _onPointerDown(e) {
    if (this.inputManager || this.paused || this.finished || !this.roundActive) return;

    const canvas = document.querySelector('#three-canvas');
    const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches?.[0]?.clientX ?? 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches?.[0]?.clientY ?? 0);

    this._mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, this.camera);
    const hits = this._raycaster.intersectObjects(this.candidates, false);

    if (hits.length > 0) {
      this._chooseCandidate(hits[0].object);
    }
  }

  botPlayRound(willWin = true) {
    if (!this.roundActive || this.finished) return;

    if (willWin && this.correctCandidateIndex >= 0 && this.candidates[this.correctCandidateIndex]) {
      this.setTimeout(() => {
        if (!this.finished && this.roundActive) {
          this._chooseCandidate(this.candidates[this.correctCandidateIndex]);
        }
      }, 500);
    } else {
      const wrong = (this.correctCandidateIndex + 1) % this.candidates.length;
      this.setTimeout(() => {
        if (!this.finished && this.roundActive && this.candidates[wrong]) {
          this._chooseCandidate(this.candidates[wrong]);
        }
      }, 500);
    }
  }

  hint(type) {
    super.hint(type);
    if (type === 'reveal' || type === 'aria_clue') {
      // Eliminate an incorrect candidate
      for (const cand of this.candidates) {
        if (!cand.userData.isCorrect && cand.visible) {
          cand.visible = false;
          if (cand.userData.pedestal) cand.userData.pedestal.visible = false;
          EventBus.emit('hud:subtitle', { text: `🤖 ARIA: Eliminated non-compliant transformation [${cand.userData.index + 1}].` });
          break;
        }
      }
    } else if (type === 'slow_time') {
      EventBus.emit('hud:subtitle', { text: '⏳ Hologram phase drift stabilized.' });
    }
  }

  update(dt) {
    super.update(dt);
    this._time += dt;

    // Subtle rotational hovering of matrix cells
    for (const cell of this.matrixCells) {
      cell.rotation.y += dt * 0.55;
    }
    for (const cand of this.candidates) {
      cand.rotation.y += dt * 0.75;
    }
    if (this._targetFrame) {
      this._targetFrame.rotation.z += dt * 0.5;
    }
  }

  exit() {
    this._clearMatrix();
    super.exit();
  }
}
