/* ═══════════════════════════════════════════════════════════════
   RotationCore.js — Tier 1 Spatial Reasoning Game (3D)
   Cognitive Domain: 3D mental rotation, spatial perspective taking, chiral discrimination.
   Multi-Round Mission: Player inspects complex 3D polyhedra across
   sequential rounds to identify the isomorphic matching orientation.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GameBase } from '../../kit/GameBase.js';
import { Tween }    from '../../kit/TweenLib.js';
import { SFXLib }   from '../../audio/SFXLib.js';
import { EventBus } from '../../core/EventBus.js';

export class RotationCore extends GameBase {
  constructor() {
    super({
      id: 'rotation-core',
      name: 'Rotation Core',
      skill: 'spatial',
      tags: ['mental-rotation', 'spatial-transform', '3d-orientation'],
      palette: { primary: '#38bdf8', secondary: '#0c4a6e', accent: '#0284c7' },
      goalText: 'Mentally rotate the 3D core to find the matching orientation.'
    });

    this.candidates = [];
    this.correctIndex = -1;
    this._refModel = null;
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._isDragging = false;
    this._prevPointer = { x: 0, y: 0 };
    this._time = 0;
  }

  build(scene, camera) {
    super.build(scene, camera);

    camera.position.set(0, 1.8, 6.2);
    camera.lookAt(0, 1.4, 0);

    // Chamber Pedestal Platform
    const platGeom = new THREE.CylinderGeometry(5.2, 5.6, 0.4, 48);
    const platMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8
    });
    const platform = new THREE.Mesh(platGeom, platMat);
    platform.position.set(0, -0.4, 0);
    this.addObject(platform);

    // Cyan Concentric Energy Rings
    for (let i = 0; i < 2; i++) {
      const ringG = new THREE.TorusGeometry(3.2 + i * 1.8, 0.05, 16, 64);
      const ringM = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const ring = new THREE.Mesh(ringG, ringM);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, -0.18, 0);
      this.addObject(ring);
    }

    // Reference Core Inspection Stand on left
    const standGeom = new THREE.CylinderGeometry(1.2, 1.4, 0.25, 32);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const stand = new THREE.Mesh(standGeom, standMat);
    stand.position.set(-2.4, 0.4, 0);
    this.addObject(stand);

    // Ambient Lighting
    const sLight = new THREE.PointLight(0x38bdf8, 2.4, 18);
    sLight.position.set(-2, 3.5, 3);
    this.addObject(sLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 1.3);
    this.addObject(hemiLight);

    const canvas = document.querySelector('#three-canvas') || window;
    this.listen(canvas, 'pointerdown', (e) => this._onPointerDown(e));
    this.listen(canvas, 'pointermove', (e) => this._onPointerMove(e));
    this.listen(window, 'pointerup', () => { this._isDragging = false; });

    // Keyboard accessibility: Arrow keys & WASD rotate reference model
    this.listen(window, 'keydown', (e) => {
      if (!this._refModel || this.paused || this.finished) return;
      const step = 0.15;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this._refModel.rotation.y -= step;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this._refModel.rotation.y += step;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this._refModel.rotation.x -= step;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this._refModel.rotation.x += step;
      }
    });
  }

  start(levelParams) {
    if (this.camera) {
      this.camera.position.set(0, 1.8, 6.2);
      this.camera.lookAt(0, 1.4, 0);
    }
    super.start(levelParams);
  }

  _createPolyhedron(isChiral = false) {
    const group = new THREE.Group();

    // Central geometric hub
    const hubGeom = new THREE.IcosahedronGeometry(0.55, 0);
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.2,
      metalness: 0.85,
      emissive: 0x0369a1,
      emissiveIntensity: 0.4
    });
    const hub = new THREE.Mesh(hubGeom, hubMat);
    group.add(hub);

    // Multi-color asymmetrical appendage probes
    const colors = [0x38bdf8, 0xf59e0b, 0x10b981, 0xec4899];
    const armCoords = [
      [0.85, 0.35, 0],
      [0, 0.95, 0.3],
      [-0.45, -0.75, 0.55],
      [0.3, -0.4, -0.85]
    ];

    armCoords.forEach((coord, idx) => {
      let [x, y, z] = coord;
      // Invert one coordinate for chiral enantiomer
      if (isChiral && idx === 0) x = -x;

      const armG = new THREE.CylinderGeometry(0.12, 0.12, 0.75, 16);
      const armM = new THREE.MeshStandardMaterial({
        color: colors[idx % colors.length],
        roughness: 0.2,
        metalness: 0.7,
        emissive: colors[idx % colors.length],
        emissiveIntensity: 0.5
      });
      const arm = new THREE.Mesh(armG, armM);
      arm.position.set(x, y, z);
      arm.lookAt(0, 0, 0);
      group.add(arm);

      // Node cap
      const capG = new THREE.SphereGeometry(0.2, 16, 16);
      const cap = new THREE.Mesh(capG, armM);
      cap.position.set(x * 1.35, y * 1.35, z * 1.35);
      group.add(cap);
    });

    return group;
  }

  setupRound(roundIndex, ramp, levelParams = {}) {
    if (this.finished) return;

    this._clearScene();

    // 1. Reference Model on the left (-2.4, 1.6, 0)
    this._refModel = this._createPolyhedron(false);
    this._refModel.position.set(-2.4, 1.6, 0);
    this._refModel.rotation.set(0.3, 0.5, 0);
    this.addObject(this._refModel);

    // 2. Build 3 candidate options on the right side
    const candPositions = [
      [1.5, 2.5, 0],
      [3.3, 1.3, 0],
      [1.5, 0.1, 0]
    ];

    this.correctIndex = Math.floor(Math.random() * 3);

    for (let i = 0; i < 3; i++) {
      const isMatch = (i === this.correctIndex);
      const candModel = this._createPolyhedron(!isMatch);

      // Rotate arbitrarily in 3D
      candModel.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      const candHolder = new THREE.Group();
      candHolder.position.set(candPositions[i][0], candPositions[i][1], candPositions[i][2]);
      candHolder.add(candModel);

      // Selection card ring
      const ringGeom = new THREE.RingGeometry(0.85, 0.95, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x475569,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.z = -0.4;
      candHolder.add(ring);

      const candData = {
        index: i,
        isMatch,
        model: candModel,
        ringMat,
        mesh: candHolder
      };
      candHolder.userData = candData;

      this.addObject(candHolder);
      this.candidates.push(candData);

      // Register with InputManager
      this.registerTarget(`rotation_cand_${i}`, candHolder, {
        hitRadius: 1.45,
        key: String(i + 1),
        onHover: (hovered) => {
          if (hovered) {
            ringMat.opacity = 1.0;
            ringMat.color.setHex(0x38bdf8);
          } else {
            ringMat.opacity = 0.6;
            ringMat.color.setHex(0x475569);
          }
        },
        onPress: () => {
          if (this.paused || this.finished || !this.roundActive) return;
          this._selectCandidate(candData);
        }
      });
    }

    if (this.isPractice) {
      EventBus.emit('hud:subtitle', {
        text: '🟢 PRACTICE: Drag left to rotate core. Select matching orientation (1–3).'
      });
    } else {
      EventBus.emit('hud:subtitle', {
        text: `🧭 Round ${roundIndex} / ${this.totalRounds}: Mentally rotate reference core & select the matching orientation.`
      });
    }
  }

  teardownRound(correct, reason) {
    this._clearScene();
  }

  _clearScene() {
    if (this._refModel && this._refModel.parent) {
      this._refModel.parent.remove(this._refModel);
      this._refModel = null;
    }

    for (const c of this.candidates) {
      if (this.inputManager) {
        this.inputManager.unregisterTarget(`rotation_cand_${c.index}`);
      }
      if (c.mesh && c.mesh.parent) {
        c.mesh.parent.remove(c.mesh);
      }
    }
    this.candidates = [];
  }

  _selectCandidate(userData) {
    if (!this.roundActive || this.finished) return;
    this.registerPlayerAction();

    const { isMatch, ringMat, index } = userData;
    if (isMatch) {
      // Correct!
      SFXLib.playSuccess?.() || SFXLib.levelStart?.();
      ringMat.color.setHex(0x10b981);
      ringMat.opacity = 1.0;

      EventBus.emit('hud:subtitle', { text: '✨ Spatial congruence locked! Core synchronized.' });
      this.setTimeout(() => {
        this.endRound(true);
      }, 500);
    } else {
      // Chiral mismatch
      SFXLib.playError?.();
      ringMat.color.setHex(0xef4444);
      ringMat.opacity = 1.0;

      EventBus.emit('hud:subtitle', {
        text: `✗ Chiral mismatch: Candidate [${index + 1}] is an inverted enantiomer.`
      });

      this.setTimeout(() => {
        this.endRound(false, `Chiral reflection error on Candidate [${index + 1}]`);
      }, 650);
    }
  }

  _onPointerDown(e) {
    if (this.paused || this.finished || !this.roundActive) return;

    const clientX = e.clientX !== undefined ? e.clientX : (e.touches?.[0]?.clientX ?? 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches?.[0]?.clientY ?? 0);

    this._isDragging = true;
    this._prevPointer.x = clientX;
    this._prevPointer.y = clientY;

    const canvas = document.querySelector('#three-canvas');
    const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    this._mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, this.camera);
    const meshes = this.candidates.map(c => c.mesh);
    const hits = this._raycaster.intersectObjects(meshes, true);

    if (hits.length > 0 && !this.inputManager) {
      let obj = hits[0].object;
      while (obj.parent && (!obj.userData || obj.userData.index === undefined)) {
        obj = obj.parent;
      }
      if (obj.userData && obj.userData.index !== undefined) {
        this._selectCandidate(obj.userData);
      }
    }
  }

  _onPointerMove(e) {
    if (!this._isDragging || !this._refModel) return;

    const clientX = e.clientX !== undefined ? e.clientX : (e.touches?.[0]?.clientX ?? this._prevPointer.x);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches?.[0]?.clientY ?? this._prevPointer.y);

    const dx = clientX - this._prevPointer.x;
    const dy = clientY - this._prevPointer.y;
    this._prevPointer.x = clientX;
    this._prevPointer.y = clientY;

    this._refModel.rotation.y += dx * 0.012;
    this._refModel.rotation.x += dy * 0.012;
  }

  botPlayRound(willWin = true) {
    if (!this.roundActive || this.finished) return;

    if (willWin && this.correctIndex >= 0 && this.candidates[this.correctIndex]) {
      this.setTimeout(() => {
        if (!this.finished && this.roundActive) {
          this._selectCandidate(this.candidates[this.correctIndex]);
        }
      }, 500);
    } else {
      const wrong = (this.correctIndex + 1) % this.candidates.length;
      this.setTimeout(() => {
        if (!this.finished && this.roundActive && this.candidates[wrong]) {
          this._selectCandidate(this.candidates[wrong]);
        }
      }, 500);
    }
  }

  hint(type) {
    super.hint(type);
    if (type === 'reveal' || type === 'aria_clue') {
      for (const cand of this.candidates) {
        if (!cand.isMatch && cand.mesh.visible) {
          cand.mesh.visible = false;
          EventBus.emit('hud:subtitle', { text: `🤖 ARIA: Eliminated chiral enantiomer [${cand.index + 1}].` });
          break;
        }
      }
    } else if (type === 'slow_time') {
      EventBus.emit('hud:subtitle', { text: '⏳ Rotational inertia locked.' });
    }
  }

  update(dt) {
    super.update(dt);
    this._time += dt;

    // Gentle idle spin of candidates
    for (const cand of this.candidates) {
      if (cand.model) {
        cand.model.rotation.y += dt * 0.45;
      }
    }
  }

  exit() {
    this._clearScene();
    super.exit();
  }
}
