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

    camera.position.set(0, 1.8, 7.0);
    camera.lookAt(0, 1.45, 0);

    // Hologram projector base ring — lowered so options float cleanly above it
    const baseGeom = new THREE.CylinderGeometry(4.8, 5.2, 0.4, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x090f1d,
      metalness: 0.9,
      roughness: 0.3
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.set(0, -1.35, 0);
    this.addObject(base);

    // Glowing emitter ring
    const ringGeom = new THREE.TorusGeometry(4.85, 0.06, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -1.15, 0);
    this.addObject(ring);

    // Lighting
    const pLight = new THREE.PointLight(0xc084fc, 2.5, 18);
    pLight.position.set(0, 3.2, 3);
    this.addObject(pLight);

    const hemiLight = new THREE.HemisphereLight(0xf3e8ff, 0x0f172a, 1.3);
    this.addObject(hemiLight);

    this.matrixGroup = new THREE.Group();
    this.matrixGroup.position.set(0, 2.35, 0);
    this.addObject(this.matrixGroup);

    const canvas = document.querySelector('#three-canvas') || window;
    this.listen(canvas, 'pointerdown', (e) => this._onPointerDown(e));
    this.listen(canvas, 'touchstart', (e) => {
      if (e.cancelable) e.preventDefault();
      this._onPointerDown(e);
    }, { passive: false });
  }

  start(levelParams) {
    if (this.camera) {
      this.camera.position.set(0, 1.8, 7.0);
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
    const correctColorIdx = (2 + 2) % colors.length;
    const correctColor = colors[correctColorIdx];
    const correctScale = 1.15;

    // Build 4 strictly unique candidates:
    // 1. Correct target
    // 2. Distractor 1: Same shape, different color (tests color pattern)
    // 3. Distractor 2: Same color, different shape (tests shape pattern)
    // 4. Distractor 3: Different shape AND different color
    const candidateDefs = [
      {
        isCorrect: true,
        sIdx: correctShapeIdx,
        col: correctColor,
        sc: correctScale
      },
      {
        isCorrect: false,
        sIdx: correctShapeIdx,
        col: colors[(correctColorIdx + 1) % colors.length],
        sc: correctScale
      },
      {
        isCorrect: false,
        sIdx: (correctShapeIdx + 1) % shapes.length,
        col: correctColor,
        sc: correctScale
      },
      {
        isCorrect: false,
        sIdx: (correctShapeIdx + 2) % shapes.length,
        col: colors[(correctColorIdx + 2) % colors.length],
        sc: correctScale
      }
    ];

    // Shuffle candidate positions randomly so correct option can be any of 1..4
    for (let j = candidateDefs.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [candidateDefs[j], candidateDefs[k]] = [candidateDefs[k], candidateDefs[j]];
    }

    this.correctCandidateIndex = candidateDefs.findIndex(c => c.isCorrect);
    const candSpacing = 1.45;
    const candStartX = -((4 - 1) * candSpacing) / 2;
    const candY = 0.08; // High enough to float completely clear of the floor and bottom dock

    for (let i = 0; i < 4; i++) {
      const cDef = candidateDefs[i];
      const isCorrect = cDef.isCorrect;
      const sIdx = cDef.sIdx;
      const col = cDef.col;
      const sc = cDef.sc;

      const candGroup = new THREE.Group();
      candGroup.position.set(candStartX + i * candSpacing, candY, 0.2);

      // High-contrast translucent dark backing disc
      const backGeom = new THREE.CircleGeometry(0.56, 32);
      const backMat = new THREE.MeshBasicMaterial({
        color: 0x090d16,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide
      });
      const backDisc = new THREE.Mesh(backGeom, backMat);
      backDisc.position.z = -0.06;
      candGroup.add(backDisc);

      // Glowing card boundary ring
      const ringG = new THREE.RingGeometry(0.52, 0.58, 32);
      const ringM = new THREE.MeshBasicMaterial({ color: 0x64748b, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringG, ringM);
      ring.position.z = -0.05;
      candGroup.add(ring);

      // The 3D geometric glyph
      const geom = shapes[sIdx]();
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.2,
        metalness: 0.7,
        emissive: col,
        emissiveIntensity: 0.45
      });
      const glyphMesh = new THREE.Mesh(geom, mat);
      glyphMesh.scale.set(sc, sc, sc);
      candGroup.add(glyphMesh);

      // Number badge sprite [1], [2], [3], [4]
      const badgeCanvas = document.createElement('canvas');
      badgeCanvas.width = 64;
      badgeCanvas.height = 64;
      const bctx = badgeCanvas.getContext('2d');
      bctx.fillStyle = '#c084fc';
      bctx.font = 'bold 36px Inter, sans-serif';
      bctx.textAlign = 'center';
      bctx.textBaseline = 'middle';
      bctx.fillText(String(i + 1), 32, 32);
      const badgeTex = new THREE.CanvasTexture(badgeCanvas);
      const badgeMat = new THREE.SpriteMaterial({ map: badgeTex, transparent: true, opacity: 0.95 });
      const badgeSprite = new THREE.Sprite(badgeMat);
      badgeSprite.position.set(0, -0.74, 0.05);
      badgeSprite.scale.set(0.42, 0.42, 1);
      candGroup.add(badgeSprite);

      // Generous invisible hit proxy for fingertip and mouse clicks
      const hitProxyGeom = new THREE.CylinderGeometry(0.72, 0.72, 1.4, 16);
      const hitProxyMat = new THREE.MeshBasicMaterial({ visible: false, transparent: true, opacity: 0 });
      const hitProxy = new THREE.Mesh(hitProxyGeom, hitProxyMat);
      hitProxy.rotation.x = Math.PI / 2;
      candGroup.add(hitProxy);

      const propData = {
        index: i,
        isCorrect,
        candGroup,
        glyph: glyphMesh,
        mat,
        ringM,
        basePos: candGroup.position.clone()
      };
      candGroup.userData = propData;
      glyphMesh.userData = propData;
      hitProxy.userData = propData;

      this.addObject(candGroup);
      this.candidates.push(candGroup);

      // Register target with InputManager
      this.registerTarget(`matrix_cand_${i}`, candGroup, {
        hitRadius: 1.35,
        key: String(i + 1),
        onHover: (hovered) => {
          if (hovered) {
            mat.emissiveIntensity = 1.1;
            ringM.color.setHex(0xc084fc);
            candGroup.position.y = candY + 0.08;
          } else {
            mat.emissiveIntensity = 0.45;
            ringM.color.setHex(0x64748b);
            candGroup.position.y = candY;
          }
        },
        onPress: () => {
          if (this.paused || this.finished || !this.roundActive) return;
          this._chooseCandidate(candGroup);
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

      EventBus.emit('hud:subtitle', {
        text: `✗ Non-compliant glyph: Candidate [${data.index + 1}] breaks symmetry.`
      });

      this.setTimeout(() => {
        this.endRound(false, `Transformation mismatch on Candidate [${data.index + 1}]`);
      }, 650);
    }
  }

  _onPointerDown(e) {
    if (this.paused || this.finished || !this.roundActive) return;

    const canvas = document.querySelector('#three-canvas');
    const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

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

    this._mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, this.camera);
    const hits = this._raycaster.intersectObjects(this.candidates, true);

    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj && (!obj.userData || obj.userData.index === undefined)) {
        obj = obj.parent;
      }
      if (obj && obj.userData && obj.userData.index !== undefined) {
        this._chooseCandidate(obj.userData.candGroup || obj);
      }
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

    // Subtle rotational hovering of matrix cells (scales with level difficulty)
    const rotSpeed = 0.25 + Math.min(0.65, (this.level - 1) * 0.022);
    for (const cell of this.matrixCells) {
      cell.rotation.y += dt * rotSpeed;
    }
    // Rotate only the glyph inside each candidate pod, keeping the backplate & badge facing camera
    for (const cand of this.candidates) {
      if (cand.userData.glyph) {
        cand.userData.glyph.rotation.y += dt * 0.75;
      }
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
