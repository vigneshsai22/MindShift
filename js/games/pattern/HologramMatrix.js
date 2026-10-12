/* ═══════════════════════════════════════════════════════════════
   HologramMatrix.js — Tier 1 Pattern Recognition Game (3D)
   Cognitive Domain: Inductive pattern analysis, Raven's matrices, spatial geometry.
   3x3 Holographic projection with missing cell; 4 candidate glyphs.
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
      tags: ['matrix-reasoning', 'spatial-pattern', 'inductive-logic'],
      palette: { primary: '#a855f7', secondary: '#3b0764', accent: '#c084fc' }
    });

    this.matrixCells = [];
    this.candidates = [];
    this.correctCandidateIndex = 0;
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this.matrixGroup = null;
    this.candGroup = null;
  }

  build(scene, camera) {
    super.build(scene, camera);

    camera.position.set(0, 0.5, 5.5);
    camera.lookAt(0, 0.5, 0);

    this.matrixGroup = new THREE.Group();
    this.addObject(this.matrixGroup);

    this.candGroup = new THREE.Group();
    this.candGroup.position.set(0, -2.2, 0);
    this.addObject(this.candGroup);

    // Matrix background holographic plane
    const planeGeom = new THREE.PlaneGeometry(6.5, 6.5);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x1e1035,
      transparent: true,
      opacity: 0.6,
      wireframe: true
    });
    const holoGrid = new THREE.Mesh(planeGeom, planeMat);
    holoGrid.position.set(0, 1.2, -0.2);
    this.matrixGroup.add(holoGrid);

    // Ambient cyan-magenta hologram light
    const light1 = new THREE.PointLight(0xa855f7, 2, 15);
    light1.position.set(-3, 3, 3);
    this.addObject(light1);

    const light2 = new THREE.PointLight(0x06b6d4, 1.5, 15);
    light2.position.set(3, -1, 3);
    this.addObject(light2);

    const canvas = document.querySelector('#three-canvas') || window;
    this.listen(canvas, 'pointerdown', (e) => this._onPointerDown(e));
  }

  start(levelParams) {
    super.start(levelParams);

    if (this.camera) {
      this.camera.position.set(0, 0.4, 6.8);
      this.camera.lookAt(0, 0.4, 0);
    }

    this._generateMatrix();
  }

  _generateMatrix() {
    // Clear old children
    while (this.matrixGroup.children.length > 1) {
      const c = this.matrixGroup.children[this.matrixGroup.children.length - 1];
      this.matrixGroup.remove(c);
    }
    while (this.candGroup.children.length > 0) {
      const c = this.candGroup.children[this.candGroup.children.length - 1];
      this.candGroup.remove(c);
    }
    this.matrixCells = [];
    this.candidates = [];

    // Shapes: 0=Cube, 1=Sphere, 2=Cylinder
    const shapes = [
      () => new THREE.BoxGeometry(0.7, 0.7, 0.7),
      () => new THREE.SphereGeometry(0.45, 16, 16),
      () => new THREE.CylinderGeometry(0.35, 0.35, 0.7, 16)
    ];

    const colors = [0xa855f7, 0x06b6d4, 0xec4899];

    // Progression rule:
    // Row r (0..2), Col c (0..2).
    // shapeIndex = (r + c) % 3
    // scale = 0.8 + c * 0.25
    // color = colors[(r) % 3]

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const x = (c - 1) * 1.8;
        const y = 1.2 + (1 - r) * 1.8;

        if (r === 2 && c === 2) {
          // The Missing Cell (Target to deduce)
          const targetFrameGeom = new THREE.BoxGeometry(1.4, 1.4, 0.1);
          const targetFrameMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true
          });
          const targetFrame = new THREE.Mesh(targetFrameGeom, targetFrameMat);
          targetFrame.position.set(x, y, 0);
          this.matrixGroup.add(targetFrame);
          this._targetFrame = targetFrame;
          continue;
        }

        const shapeIdx = (r + c) % 3;
        const geom = shapes[shapeIdx]();
        const mat = new THREE.MeshStandardMaterial({
          color: colors[r % 3],
          roughness: 0.2,
          metalness: 0.7,
          emissive: colors[r % 3],
          emissiveIntensity: 0.3
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(x, y, 0);
        const sc = 0.8 + c * 0.2;
        mesh.scale.set(sc, sc, sc);
        mesh.rotation.x = r * 0.3;
        mesh.rotation.y = c * 0.5;

        this.matrixGroup.add(mesh);
        this.matrixCells.push(mesh);
      }
    }

    // Build 4 candidate answers for missing cell (r=2, c=2)
    // Correct answer has shapeIdx = (2 + 2) % 3 = 1 (Sphere), color = colors[2] (Pink), scale = 0.8 + 2 * 0.2 = 1.2
    this.correctCandidateIndex = Math.floor(Math.random() * 4);

    const candStartX = -((4 - 1) * 1.6) / 2;
    for (let i = 0; i < 4; i++) {
      const isCorrect = (i === this.correctCandidateIndex);

      let shapeIdx = isCorrect ? ((2 + 2) % 3) : ((2 + 2 + i + 1) % 3);
      let colIdx = isCorrect ? 2 : (i % 3);
      let sc = isCorrect ? 1.2 : (0.7 + (i % 2) * 0.3);

      const geom = shapes[shapeIdx]();
      const mat = new THREE.MeshStandardMaterial({
        color: colors[colIdx],
        roughness: 0.2,
        metalness: 0.7,
        emissive: colors[colIdx],
        emissiveIntensity: 0.2
      });

      const candMesh = new THREE.Mesh(geom, mat);
      const posX = candStartX + i * 1.6;
      candMesh.position.set(posX, 0, 0);
      candMesh.scale.set(sc, sc, sc);

      candMesh.userData = {
        index: i,
        isCorrect,
        mat,
        origPos: new THREE.Vector3(posX, 0, 0)
      };

      this.candGroup.add(candMesh);
      this.candidates.push(candMesh);
    }

    EventBus.emit('hud:subtitle', {
      text: 'Inductive Analysis: Deduce the relational law and select the missing glyph.'
    });
  }

  _onPointerDown(e) {
    if (this.paused || this.finished) return;

    const canvas = document.querySelector('#three-canvas');
    const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches?.[0]?.clientX ?? 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches?.[0]?.clientY ?? 0);

    this._mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, this.camera);
    const hits = this._raycaster.intersectObjects(this.candidates, false);

    if (hits.length > 0) {
      const hit = hits[0].object;
      const data = hit.userData;

      if (data.isCorrect) {
        // Correct candidate!
        SFXLib.playSuccess();
        const targetPos = new THREE.Vector3(1.8, 1.2 - 1.8, 0); // r=2, c=2 position

        Tween.to(hit.position, { x: 1.8, y: -0.6 + 2.2, z: 0 }, 0.4, 'easeInOutQuad')
          .onComplete(() => {
            hit.userData.mat.emissiveIntensity = 2.0;
            EventBus.emit('hud:subtitle', { text: 'Pattern verified! Hologram matrix locked.' });
            this.completeTrial(true, 1.0);
          }).start();
      } else {
        // Wrong candidate
        SFXLib.playError();
        this.recordResponse(false);
        hit.userData.mat.emissive.setHex(0xff0044);
        hit.userData.mat.emissiveIntensity = 1.5;
        Tween.to(hit.position, { y: -0.4 }, 0.1, 'easeOutQuad')
          .onComplete(() => {
            Tween.to(hit.position, { y: 0 }, 0.2).start();
            hit.userData.mat.emissive.setHex(hit.userData.mat.color.getHex());
            hit.userData.mat.emissiveIntensity = 0.2;
          }).start();
        EventBus.emit('hud:subtitle', { text: 'Relational dissonance detected.' });
      }
    }
  }

  hint(type) {
    super.hint(type);
    if (type === 'reveal' || type === 'aria_clue') {
      // Discard wrong candidate
      for (const cand of this.candidates) {
        if (!cand.userData.isCorrect && cand.visible) {
          cand.visible = false;
          EventBus.emit('hud:subtitle', { text: 'ARIA: Eliminated non-compliant transformation glyph.' });
          break;
        }
      }
    } else if (type === 'slow_time') {
      EventBus.emit('hud:subtitle', { text: 'Matrix decay suspended.' });
    }
  }

  update(dt) {
    super.update(dt);
    // Holographic idle spinning
    for (const cell of this.matrixCells) {
      cell.rotation.y += dt * 0.6;
    }
    for (const cand of this.candidates) {
      cand.rotation.y += dt * 0.8;
    }
    if (this._targetFrame) {
      this._targetFrame.rotation.z += dt * 0.4;
    }
  }
}
