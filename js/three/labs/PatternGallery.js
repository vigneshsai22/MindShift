/* ═══════════════════════════════════════════════════════════════
   PatternGallery.js — Sector 3: Hologram Assembly (Pattern Recognition)
   Features:
   - 3×3 holographic grid matrix with missing slot
   - Floating 3D candidate shapes with magnetic snapping and glow
   - Sector Climax / Boss Trial: 2 overlapping rules (shape + color/rotation)
   - Pointer-lock center raycasting & click fallback
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { LabBase } from './LabBase.js';
import { EventBus } from '../../core/EventBus.js';

const SHAPES = ['sphere', 'box', 'torus', 'cone', 'cylinder', 'octahedron'];
const PALETTE = [0x7c3aed, 0x06b6d4, 0x10b981, 0xf59e0b, 0xef4444, 0xa855f7];

function createGeometry(shape) {
  switch (shape) {
    case 'sphere':     return new THREE.SphereGeometry(0.35, 16, 16);
    case 'box':        return new THREE.BoxGeometry(0.6, 0.6, 0.6);
    case 'torus':      return new THREE.TorusGeometry(0.28, 0.1, 12, 24);
    case 'cone':       return new THREE.ConeGeometry(0.35, 0.7, 16);
    case 'cylinder':   return new THREE.CylinderGeometry(0.24, 0.24, 0.7, 16);
    case 'octahedron': return new THREE.OctahedronGeometry(0.38);
    default:           return new THREE.SphereGeometry(0.35, 16, 16);
  }
}

export class PatternGallery extends LabBase {
  constructor(ctx) {
    super(ctx);
    this._category      = 'pattern';
    this._title         = 'SECTOR 3: HOLOGRAM ASSEMBLY';
    this._gridMeshes    = [];
    this._candidateList = [];
    this._correctIdx    = 0;
    this._isBoss        = false;
    this._blankSlot     = 8; // bottom-right slot

    this._onInteract    = this._onInteract.bind(this);
    this._onCanvasClick = this._onCanvasClick.bind(this);
  }

  _buildScene() {
    this._group.position.set(0, 0, -15);

    // Grid backdrop wall
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(11, 7.5, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x07111e, roughness: 0.9 })
    );
    wall.position.set(0, 3.5, -8.6);
    this._group.add(wall);

    // 3x3 Holographic Frames
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 1.4, 0.08),
          new THREE.MeshStandardMaterial({
            color: 0x162638,
            emissive: 0x003355,
            emissiveIntensity: 0.4
          })
        );
        frame.position.set((c - 1) * 2.2, 4.8 - r * 2.2, -8.4);
        this._group.add(frame);
        this._gridMeshes.push({ frame, pos: frame.position.clone(), mesh: null, r, c });
      }
    }
  }

  _onEnter(params) {
    this._isBoss = !!params.isBoss;
    this._clearEntities();

    const shapeIdx = Math.floor(Math.random() * SHAPES.length);
    const colorIdx = Math.floor(Math.random() * PALETTE.length);

    // Setup rules: Single rule (same shape, cycling color) vs Boss (overlapping: shape cycle + color cycle)
    const shapeList = this._isBoss
      ? ['sphere', 'box', 'torus', 'sphere', 'box', 'torus', 'sphere', 'box', 'torus']
      : Array(9).fill(SHAPES[shapeIdx]);

    const colorList = this._isBoss
      ? [0x7c3aed, 0x06b6d4, 0x10b981, 0x06b6d4, 0x10b981, 0x7c3aed, 0x10b981, 0x7c3aed, 0x06b6d4]
      : Array.from({ length: 9 }, (_, i) => PALETTE[(colorIdx + i) % PALETTE.length]);

    const correctShape = shapeList[this._blankSlot];
    const correctColor = colorList[this._blankSlot];

    // Build 8 grid shapes (excluding blankSlot 8)
    for (let i = 0; i < 9; i++) {
      if (i === this._blankSlot) continue;
      const geo = createGeometry(shapeList[i]);
      const mat = new THREE.MeshStandardMaterial({
        color: colorList[i],
        emissive: colorList[i],
        emissiveIntensity: 0.6,
        metalness: 0.8,
        roughness: 0.2
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(this._gridMeshes[i].pos).add(new THREE.Vector3(0, 0, 0.3));
      this._group.add(mesh);
      this._gridMeshes[i].mesh = mesh;
    }

    // Build candidate shapes on the selection podium
    const candidateCount = 4;
    this._correctIdx = Math.floor(Math.random() * candidateCount);
    this._candidateList = [];

    const spacing = 1.6;
    const startX = -((candidateCount - 1) * spacing) / 2;

    for (let i = 0; i < candidateCount; i++) {
      const isCorrect = (i === this._correctIdx);
      const cShape = isCorrect ? correctShape : SHAPES[(shapeIdx + i + 1) % SHAPES.length];
      const cColor = isCorrect ? correctColor : PALETTE[(colorIdx + i + 2) % PALETTE.length];

      const geo = createGeometry(cShape);
      const mat = new THREE.MeshStandardMaterial({
        color: cColor,
        emissive: cColor,
        emissiveIntensity: 0.8,
        metalness: 0.85,
        roughness: 0.2
      });
      const mesh = new THREE.Mesh(geo, mat);
      const x = startX + i * spacing;
      mesh.position.set(x, 1.2, -6.5);
      mesh.userData = { candidateIdx: i, isCorrect };
      this._group.add(mesh);
      this._candidateList.push({ mesh, isCorrect, x });
    }

    if (this._isBoss) {
      this.aria?.speak("Sector 3 Boss: Overlapping Matrix Rules. Analyze both shape progression and chromatic frequency.", 'urgent');
      this.spatialAudio?.playStinger('boss_start');
    } else {
      this.aria?.speak("Analyze the 3x3 holographic sequence. Select the missing candidate shape to complete the matrix.", 'instruction');
    }

    this._bindControls();
  }

  _bindControls() {
    EventBus.on('player:interact', this._onInteract);
    this.scene3d.renderer.domElement.addEventListener('click', this._onCanvasClick);
  }

  _unbindControls() {
    EventBus.off('player:interact', this._onInteract);
    this.scene3d.renderer.domElement.removeEventListener('click', this._onCanvasClick);
  }

  _onInteract() {
    const hits = this.raycastCenter(this._candidateList.map(c => c.mesh));
    if (hits.length > 0) this._selectCandidate(hits[0].object);
  }

  _onCanvasClick(e) {
    const candidateMeshes = this._candidateList.map(c => c.mesh);
    if (document.pointerLockElement) {
      const hits = this.raycastCenter(candidateMeshes);
      if (hits.length > 0) this._selectCandidate(hits[0].object);
      return;
    }

    const rect = this.scene3d.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this._raycaster.setFromCamera(mouse, this.camera);
    const hits = this._raycaster.intersectObjects(candidateMeshes);
    if (hits.length > 0) this._selectCandidate(hits[0].object);
  }

  _selectCandidate(mesh) {
    this._attempts++;
    const isCorrect = mesh.userData.isCorrect;

    // Magnetic snap animation toward blankSlot
    const targetPos = this._gridMeshes[this._blankSlot].pos.clone().add(new THREE.Vector3(0, 0, 0.3));
    mesh.position.lerp(targetPos, 0.85);

    if (isCorrect) {
      mesh.material.emissive.setHex(0x00ff88);
      mesh.material.emissiveIntensity = 3.0;
      this.spatialAudio?.playTone(659.25, 0.25, 'sine', 0.3);
      this._unbindControls();
      const winTimer = setTimeout(() => this._complete(true, { isBoss: this._isBoss }), 600);
      this._timeouts.add(winTimer);
    } else {
      mesh.material.emissive.setHex(0xff3344);
      mesh.material.emissiveIntensity = 2.5;
      this.spatialAudio?.playTone(164.81, 0.35, 'sawtooth', 0.3);
      this._unbindControls();
      const failTimer = setTimeout(() => this._complete(false, { isBoss: this._isBoss }), 700);
      this._timeouts.add(failTimer);
    }
  }

  _render(delta) {
    // Gentle rotation of candidates
    this._candidateList.forEach(c => {
      c.mesh.rotation.y += delta * 1.5;
      c.mesh.rotation.x += delta * 0.8;
    });
  }

  _clearEntities() {
    this._gridMeshes.forEach(slot => {
      if (slot.mesh) {
        this._group.remove(slot.mesh);
        slot.mesh.geometry.dispose();
        slot.mesh.material.dispose();
        slot.mesh = null;
      }
    });

    this._candidateList.forEach(c => {
      this._group.remove(c.mesh);
      c.mesh.geometry.dispose();
      c.mesh.material.dispose();
    });
    this._candidateList = [];
  }

  _giveHint() {
    // Eliminate one incorrect candidate by dimming it
    const wrong = this._candidateList.filter(c => !c.isCorrect && c.mesh.visible);
    if (wrong.length > 0) {
      wrong[0].mesh.visible = false;
      EventBus.emit('juice:popup', { text: 'CANDIDATE DISCARDED', color: '#fbbf24' });
    }
  }

  _onExit() {
    this._unbindControls();
    this._clearEntities();
  }
}
