/* ═══════════════════════════════════════════════════════════════
   RotationCore.js — Tier 1 Spatial Reasoning Game (3D)
   Cognitive Domain: Shepard-Metzler mental rotation, 3D chirality, isometric projection.
   Player matches rotated 3D polyhedral isomers from diverse camera angles.
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
      tags: ['mental-rotation', 'shepard-metzler', '3d-perspective'],
      palette: { primary: '#3b82f6', secondary: '#1e3a8a', accent: '#60a5fa' }
    });

    this.referenceGroup = null;
    this.candidates = [];
    this.correctIndex = 0;
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._isDragging = false;
    this._prevPointer = { x: 0, y: 0 };
  }

  build(scene, camera) {
    super.build(scene, camera);

    camera.position.set(0, 1.2, 5.5);
    camera.lookAt(0, 1.2, 0);

    this.referenceGroup = new THREE.Group();
    this.referenceGroup.position.set(-2.4, 1.2, 0);
    this.addObject(this.referenceGroup);

    // Reference pedestal and hologram beacon
    const refBaseGeom = new THREE.CylinderGeometry(1.4, 1.6, 0.2, 24);
    const refBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const refBase = new THREE.Mesh(refBaseGeom, refBaseMat);
    refBase.position.y = -1.6;
    this.referenceGroup.add(refBase);

    // Reference ring
    const ringGeom = new THREE.TorusGeometry(1.6, 0.05, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.5;
    this.referenceGroup.add(ring);

    // Blue & Indigo lights
    const l1 = new THREE.PointLight(0x3b82f6, 2, 12);
    l1.position.set(-2.4, 3, 3);
    this.addObject(l1);

    const l2 = new THREE.PointLight(0x60a5fa, 1.5, 12);
    l2.position.set(2.4, 3, 3);
    this.addObject(l2);

    const canvas = document.querySelector('#three-canvas') || window;
    this.listen(canvas, 'pointerdown', (e) => this._onPointerDown(e));
    this.listen(canvas, 'pointermove', (e) => this._onPointerMove(e));
    this.listen(canvas, 'pointerup', () => { this._isDragging = false; });
  }

  start(levelParams) {
    super.start(levelParams);

    if (this.camera) {
      this.camera.position.set(0, 1.4, 6.5);
      this.camera.lookAt(0, 1.0, 0);
    }

    this._generateTrial();
  }

  _createPolyhedron(isChiral = false) {
    const group = new THREE.Group();
    const cubeGeom = new THREE.BoxGeometry(0.65, 0.65, 0.65);
    const edgesGeom = new THREE.EdgesGeometry(cubeGeom);

    // Asymmetric 3D block cluster (Shepard-Metzler arm)
    const blocks = [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [2, 1, 0],
      [2, 1, isChiral ? -1 : 1] // Enantiomer (mirrored reflection)
    ];

    const mat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.6,
      roughness: 0.2,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.3
    });

    const edgeMat = new THREE.LineBasicMaterial({ color: 0x93c5fd });

    for (const [bx, by, bz] of blocks) {
      const mesh = new THREE.Mesh(cubeGeom, mat);
      mesh.position.set((bx - 1) * 0.7, (by - 0.5) * 0.7, bz * 0.7);
      group.add(mesh);

      const wire = new THREE.LineSegments(edgesGeom, edgeMat);
      wire.position.copy(mesh.position);
      group.add(wire);
    }

    return group;
  }

  _generateTrial() {
    // Clear old objects
    while (this.referenceGroup.children.length > 2) {
      const c = this.referenceGroup.children[this.referenceGroup.children.length - 1];
      this.referenceGroup.remove(c);
    }
    for (const cand of this.candidates) {
      if (cand.mesh && cand.mesh.parent) cand.mesh.parent.remove(cand.mesh);
    }
    this.candidates = [];

    // Reference model rotated randomly
    const refModel = this._createPolyhedron(false);
    refModel.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    this.referenceGroup.add(refModel);
    this._refModel = refModel;

    // 3 Candidate options on the right side
    const candPositions = [
      [1.5, 2.5, 0],
      [3.2, 1.2, 0],
      [1.5, -0.1, 0]
    ];

    this.correctIndex = Math.floor(Math.random() * 3);

    for (let i = 0; i < 3; i++) {
      const isMatch = (i === this.correctIndex);
      // If not match, make it an enantiomer/chiral inverted shape
      const candModel = this._createPolyhedron(!isMatch);

      // Rotated arbitrarily in 3D
      candModel.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      const candHolder = new THREE.Group();
      candHolder.position.set(candPositions[i][0], candPositions[i][1], candPositions[i][2]);
      candHolder.add(candModel);

      // Selection ring
      const ringGeom = new THREE.RingGeometry(0.85, 0.95, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x64748b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.z = -0.5;
      candHolder.add(ring);

      candHolder.userData = {
        index: i,
        isMatch,
        model: candModel,
        ringMat
      };

      this.addObject(candHolder);
      this.candidates.push({ mesh: candHolder, data: candHolder.userData });
    }

    EventBus.emit('hud:subtitle', {
      text: 'Mental Rotation: Identify which candidate is identical to the reference core.'
    });
  }

  _onPointerDown(e) {
    if (this.paused || this.finished) return;

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

    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj.parent && (!obj.userData || obj.userData.index === undefined)) {
        obj = obj.parent;
      }

      if (obj.userData && obj.userData.index !== undefined) {
        const { isMatch, ringMat } = obj.userData;
        if (isMatch) {
          SFXLib.playSuccess();
          ringMat.color.setHex(0x10b981);
          ringMat.opacity = 1.0;
          EventBus.emit('hud:subtitle', { text: 'Spatial congruence verified! Core synchronized.' });
          this.completeTrial(true, 1.0);
        } else {
          SFXLib.playError();
          this.recordResponse(false);
          ringMat.color.setHex(0xef4444);
          ringMat.opacity = 0.9;
          EventBus.emit('hud:subtitle', { text: 'Chiral reflection detected. Non-isomorphic.' });
        }
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

    // Interactive rotation of the reference polyhedron
    this._refModel.rotation.y += dx * 0.01;
    this._refModel.rotation.x += dy * 0.01;
  }

  hint(type) {
    super.hint(type);
    if (type === 'reveal' || type === 'aria_clue') {
      // Eliminate one non-matching candidate
      for (const cand of this.candidates) {
        if (!cand.data.isMatch && cand.mesh.visible) {
          cand.mesh.visible = false;
          EventBus.emit('hud:subtitle', { text: 'ARIA: Chiral inversion filtered.' });
          break;
        }
      }
    } else if (type === 'slow_time') {
      EventBus.emit('hud:subtitle', { text: 'Rotational inertia stabilized.' });
    }
  }

  update(dt) {
    super.update(dt);
    // Subtle idle spin of candidates
    for (const cand of this.candidates) {
      if (cand.data.model) {
        cand.data.model.rotation.y += dt * 0.4;
      }
    }
  }
}
