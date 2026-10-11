/* ═══════════════════════════════════════════════════════════════
   PatternGallery.js
   3×3 wall of 3D glowing objects with shape/colour rule; one slot
   missing; player clicks the correct shape from a rack of 4 options.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { LabBase } from './LabBase.js';

const SHAPES = ['sphere','box','torus','cone','cylinder','octahedron'];
const PALETTE = [0x7c3aed, 0x06b6d4, 0x10b981, 0xf59e0b, 0xef4444, 0xa855f7];

function makeGeo(shape) {
  switch (shape) {
    case 'sphere':     return new THREE.SphereGeometry(0.35, 16, 16);
    case 'box':        return new THREE.BoxGeometry(0.65, 0.65, 0.65);
    case 'torus':      return new THREE.TorusGeometry(0.3, 0.12, 12, 24);
    case 'cone':       return new THREE.ConeGeometry(0.35, 0.75, 12);
    case 'cylinder':   return new THREE.CylinderGeometry(0.25, 0.25, 0.7, 12);
    case 'octahedron': return new THREE.OctahedronGeometry(0.4);
    default:           return new THREE.SphereGeometry(0.35, 16, 16);
  }
}

export class PatternGallery extends LabBase {
  constructor(ctx) {
    super(ctx);
    this._category = 'pattern';
    this._gridMeshes = [];
    this._optionMeshes = [];
    this._correctIdx   = 0;
    this._clickHandler = null;
  }

  _buildScene() {
    this._group.position.set(0, 0, -15);

    // Overhead accent
    const light = new THREE.PointLight(0xaa00ff, 1.8, 22);
    light.position.set(0, 5, -5);
    this._group.add(light);

    // Grid backdrop wall (3×3 slots)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x080e1a, roughness: 0.9 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(12, 7, 0.2), wallMat);
    wall.position.set(0, 3, -8.6);
    this._group.add(wall);

    // Grid slot frames
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(1.3, 1.3, 0.05),
          new THREE.MeshStandardMaterial({ color:0x1a2a3a, emissive:0x003355, emissiveIntensity:0.4 })
        );
        frame.position.set((col - 1) * 2, 4.2 - row * 2, -8.4);
        this._group.add(frame);
        this._gridMeshes.push({ frame, shape: null, mesh: null, row, col });
      }
    }

    // Instruction text
    const ic = document.createElement('canvas');
    ic.width = 512; ic.height = 80;
    const ictx = ic.getContext('2d');
    ictx.fillStyle = '#000'; ictx.fillRect(0,0,512,80);
    ictx.fillStyle = '#aa88ff';
    ictx.font = 'bold 22px monospace';
    ictx.textAlign = 'center';
    ictx.fillText('Find the missing pattern — click the correct shape below', 256, 50);
    const iTex = new THREE.CanvasTexture(ic);
    const ip = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4),
      new THREE.MeshStandardMaterial({ map: iTex, emissive: 0x220044, emissiveIntensity: 0.4 }));
    ip.position.set(0, 1.2, -8.4);
    this._group.add(ip);
  }

  _onEnter(diff) {
    this._clearShapes();

    // Pick a shape rule based on difficulty
    const shapeIdx = Math.floor(Math.random() * SHAPES.length);
    const colorIdx = Math.floor(Math.random() * PALETTE.length);
    const rule     = diff <= 2 ? 'same-shape' : diff <= 4 ? 'color-rotate' : 'shape-rotate';

    // Build 3x3 grid with rule; blank out slot 8 (bottom-right)
    const blankSlot = 8;
    this._correctShape  = SHAPES[shapeIdx];
    this._correctColor  = PALETTE[(colorIdx + blankSlot) % PALETTE.length];

    for (let i = 0; i < 9; i++) {
      if (i === blankSlot) continue;
      let shape, color;
      if (rule === 'same-shape') {
        shape = SHAPES[shapeIdx];
        color = PALETTE[(colorIdx + i) % PALETTE.length];
        if (i === blankSlot - 1) {
          // store what correct should be
        }
      } else if (rule === 'color-rotate') {
        shape = SHAPES[(shapeIdx + Math.floor(i / 3)) % SHAPES.length];
        color = PALETTE[(colorIdx + i) % PALETTE.length];
      } else {
        shape = SHAPES[(shapeIdx + i) % SHAPES.length];
        color = PALETTE[(colorIdx + Math.floor(i / 3)) % PALETTE.length];
      }
      this._placeGridShape(i, shape, color);
    }

    // Compute correct answer for blank slot using the rule
    if (rule === 'same-shape') {
      this._correctShape = SHAPES[shapeIdx];
      this._correctColor = PALETTE[(colorIdx + blankSlot) % PALETTE.length];
    } else if (rule === 'color-rotate') {
      this._correctShape = SHAPES[(shapeIdx + Math.floor(blankSlot / 3)) % SHAPES.length];
      this._correctColor = PALETTE[(colorIdx + blankSlot) % PALETTE.length];
    } else {
      this._correctShape = SHAPES[(shapeIdx + blankSlot) % SHAPES.length];
      this._correctColor = PALETTE[(colorIdx + Math.floor(blankSlot / 3)) % PALETTE.length];
    }

    // Build answer rack (4 options, 1 correct)
    this._buildOptions(diff);
    this.aria?.speak('Find the shape that completes the 3 by 3 pattern on the wall.', 'instruction');

    this._clickHandler = (e) => this._onCanvasClick(e);
    this.scene3d.renderer.domElement.addEventListener('click', this._clickHandler);
  }

  _placeGridShape(slot, shape, color) {
    const row = Math.floor(slot / 3);
    const col = slot % 3;
    const x = (col - 1) * 2;
    const y = 4.2 - row * 2;
    const geo  = makeGeo(shape);
    const mat  = new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(0.3), roughness: 0.3, metalness: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, -8.0);
    mesh.castShadow = true;
    this._group.add(mesh);
    this._gridMeshes[slot].mesh  = mesh;
    this._gridMeshes[slot].shape = shape;
    this._gridMeshes[slot].color = color;
  }

  _buildOptions(diff) {
    this._optionMeshes.forEach(m => { m.geometry?.dispose(); m.material?.dispose(); this._group.remove(m); });
    this._optionMeshes = [];

    const wrongShapes = SHAPES.filter(s => s !== this._correctShape);
    const wrongColors = PALETTE.filter(c => c !== this._correctColor);
    const opts = [{ shape: this._correctShape, color: this._correctColor, correct: true }];

    // Generate 3 distinct distractors
    const used = new Set();
    while (opts.length < 4) {
      const ws = diff <= 2
        ? this._correctShape   // same shape, wrong color
        : wrongShapes[Math.floor(Math.random() * wrongShapes.length)];
      const wc = wrongColors[Math.floor(Math.random() * wrongColors.length)];
      const key = ws + ':' + wc;
      if (!used.has(key)) {
        used.add(key);
        opts.push({ shape: ws, color: wc, correct: false });
      }
    }

    // Shuffle
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }

    opts.forEach((opt, i) => {
      const x = (i - 1.5) * 2.5;
      const geo  = makeGeo(opt.shape);
      const mat  = new THREE.MeshStandardMaterial({ color: opt.color, emissive: new THREE.Color(opt.color).multiplyScalar(0.2), roughness: 0.3, metalness: 0.4 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 0.8, -3.5);
      mesh.castShadow = true;
      mesh.userData = { correct: opt.correct };
      this._group.add(mesh);
      this._optionMeshes.push(mesh);

      // Pedestal
      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.6, 0.1, 12),
        new THREE.MeshStandardMaterial({ color: 0x1a2233, metalness: 0.7, roughness: 0.3 })
      );
      ped.position.set(x, 0.05, -3.5);
      this._group.add(ped);
    });
  }

  _onCanvasClick(e) {
    const rect  = this.scene3d.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width)  * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray  = new THREE.Raycaster();
    ray.setFromCamera(mouse, this.scene3d.camera);
    const hits = ray.intersectObjects(this._optionMeshes);
    if (!hits.length) return;

    const hit = hits[0].object;
    this._attempts++;
    this.scene3d.renderer.domElement.removeEventListener('click', this._clickHandler);

    if (hit.userData.correct) {
      hit.material.emissive.setHex(0x00ff88);
      hit.material.emissiveIntensity = 2;
      this.spatialAudio?.playTone(660, 0.2, 'sine', 0.4);
      setTimeout(() => this._complete(true, this._attempts), 500);
    } else {
      hit.material.emissive.setHex(0xff2200);
      hit.material.emissiveIntensity = 2;
      this.spatialAudio?.playTone(110, 0.3, 'sawtooth', 0.35);
      setTimeout(() => this._complete(false, this._attempts), 500);
    }
  }

  _onExit() {
    if (this._clickHandler) {
      this.scene3d.renderer.domElement.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
  }

  _clearShapes() {
    this._gridMeshes.forEach(slot => {
      if (slot.mesh) { slot.mesh.geometry?.dispose(); slot.mesh.material?.dispose(); this._group.remove(slot.mesh); slot.mesh = null; }
    });
    this._optionMeshes.forEach(m => { m.geometry?.dispose(); m.material?.dispose(); this._group.remove(m); });
    this._optionMeshes = [];
  }

  _giveHint() {
    // Glow the correct option
    const correct = this._optionMeshes.find(m => m.userData.correct);
    if (correct) { correct.material.emissiveIntensity = 1.5; }
  }

  _render(delta) {
    // Slowly rotate all option objects
    this._optionMeshes.forEach((m, i) => { m.rotation.y += delta * (0.5 + i * 0.1); });
    this._gridMeshes.forEach(s => { if (s.mesh) s.mesh.rotation.y += delta * 0.2; });
  }
}
