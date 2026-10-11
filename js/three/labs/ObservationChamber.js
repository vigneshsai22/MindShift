/* ═══════════════════════════════════════════════════════════════
   ObservationChamber.js
   Two near-identical 3D scenes side by side; N differences
   (colour/position/missing); player clicks the anomalies.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { LabBase } from './LabBase.js';

const OBJECT_TYPES = ['box','sphere','cylinder','torus','cone'];
const PALETTE = [0x4488ff, 0xff4488, 0x44ff88, 0xffcc00, 0xcc44ff, 0xff8800];

function makeObj(type, color) {
  const geo = type === 'box' ? new THREE.BoxGeometry(0.6,0.6,0.6)
            : type === 'sphere' ? new THREE.SphereGeometry(0.35,12,12)
            : type === 'cylinder' ? new THREE.CylinderGeometry(0.25,0.25,0.7,10)
            : type === 'torus' ? new THREE.TorusGeometry(0.28,0.1,10,20)
            : new THREE.ConeGeometry(0.35,0.7,10);
  const mat = new THREE.MeshStandardMaterial({ color, roughness:0.3, metalness:0.4,
    emissive: new THREE.Color(color).multiplyScalar(0.15) });
  return new THREE.Mesh(geo, mat);
}

export class ObservationChamber extends LabBase {
  constructor(ctx) {
    super(ctx);
    this._category   = 'visual';
    this._leftObjs   = [];
    this._rightObjs  = [];
    this._diffIndices = []; // which right-side objects are different
    this._found       = [];
    this._clickHandler = null;
    this._numDiffs    = 2;
  }

  _buildScene() {
    this._group.position.set(0, 0, -15);

    // Divider wall in center
    const div = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5, 12),
      new THREE.MeshStandardMaterial({ color:0x0a1a2a, emissive:0x002244, emissiveIntensity:0.3 }));
    div.position.set(0, 2.5, -5);
    this._group.add(div);

    // Labels
    ['LEFT SCENE', 'RIGHT SCENE'].forEach((label, idx) => {
      const cv = document.createElement('canvas');
      cv.width = 512; cv.height = 80;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,512,80);
      ctx.fillStyle = '#44aaff';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, 256, 55);
      const tex = new THREE.CanvasTexture(cv);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(4.5,0.7),
        new THREE.MeshStandardMaterial({ map:tex, emissive:0x001122, emissiveIntensity:0.4 }));
      pl.position.set(idx === 0 ? -3.5 : 3.5, 5, -8.4);
      this._group.add(pl);
    });

    // Overhead lights
    [-3.5, 3.5].forEach(x => {
      const l = new THREE.PointLight(0x4488ff, 1.2, 15);
      l.position.set(x, 5, -5);
      this._group.add(l);
    });
  }

  _onEnter(diff) {
    this._clearObjs();
    this._numDiffs = 1 + diff;
    this._found    = [];
    this._diffIndices = [];

    // Generate 6-8 objects on the left
    const count = 6 + Math.floor(diff / 2);
    const specs  = [];
    for (let i = 0; i < count; i++) {
      specs.push({
        type:  OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)],
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        pos:   new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          0.5 + Math.random() * 1.5,
          -4 - Math.random() * 5
        ),
      });
    }

    // Build left side
    specs.forEach((spec, i) => {
      const m = makeObj(spec.type, spec.color);
      m.position.copy(spec.pos).add(new THREE.Vector3(-3.5, 0, 0));
      this._group.add(m);
      this._leftObjs.push(m);
    });

    // Determine which will differ
    const pool = [...Array(count).keys()];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this._diffIndices = pool.slice(0, this._numDiffs);

    // Build right side (with differences)
    specs.forEach((spec, i) => {
      const isDiff = this._diffIndices.includes(i);
      let type = spec.type;
      let color = spec.color;
      if (isDiff) {
        // Change color or type
        if (Math.random() < 0.5) color = PALETTE[(PALETTE.indexOf(color) + 1) % PALETTE.length];
        else type = OBJECT_TYPES[(OBJECT_TYPES.indexOf(type) + 1) % OBJECT_TYPES.length];
      }
      const m = makeObj(type, color);
      m.position.copy(spec.pos).add(new THREE.Vector3(3.5, 0, 0));
      m.userData = { diffIdx: i, isDiff };
      this._group.add(m);
      this._rightObjs.push(m);
    });

    this.aria?.speak(`Spot the ${this._numDiffs} differences between the two scenes. Click each anomaly on the right.`, 'instruction');
    this._clickHandler = (e) => this._onCanvasClick(e);
    this.scene3d.renderer.domElement.addEventListener('click', this._clickHandler);
  }

  _onCanvasClick(e) {
    const rect  = this.scene3d.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray  = new THREE.Raycaster();
    ray.setFromCamera(mouse, this.scene3d.camera);
    const hits = ray.intersectObjects(this._rightObjs);
    if (!hits.length) return;

    const hit = hits[0].object;
    const idx = hit.userData.diffIdx;
    if (this._found.includes(idx)) return;
    this._attempts++;

    if (hit.userData.isDiff) {
      this._found.push(idx);
      hit.material.emissive.setHex(0x00ff88);
      hit.material.emissiveIntensity = 2.5;
      this.spatialAudio?.playTone(520 + this._found.length * 80, 0.18, 'sine', 0.3);

      if (this._found.length >= this._numDiffs) {
        this.scene3d.renderer.domElement.removeEventListener('click', this._clickHandler);
        setTimeout(() => this._complete(true, this._attempts), 500);
      }
    } else {
      // Wrong click — flash red
      const origEmissive = hit.material.emissive.getHex();
      hit.material.emissive.setHex(0xff2200);
      hit.material.emissiveIntensity = 2;
      this.spatialAudio?.playTone(110, 0.2, 'sawtooth', 0.2);
      setTimeout(() => {
        hit.material.emissive.setHex(origEmissive);
        hit.material.emissiveIntensity = 0.15;
      }, 400);
    }
  }

  _clearObjs() {
    [...this._leftObjs, ...this._rightObjs].forEach(m => {
      m.geometry?.dispose(); m.material?.dispose(); this._group.remove(m);
    });
    this._leftObjs = []; this._rightObjs = [];
  }

  _onExit() {
    if (this._clickHandler) {
      this.scene3d.renderer.domElement.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
    this._clearObjs();
  }

  _giveHint() {
    // Pulse one un-found difference
    const remaining = this._diffIndices.filter(i => !this._found.includes(i));
    if (!remaining.length) return;
    const target = this._rightObjs.find(m => m.userData.diffIdx === remaining[0] && m.userData.isDiff);
    if (!target) return;
    const orig = target.material.emissiveIntensity;
    target.material.emissiveIntensity = 3;
    setTimeout(() => { target.material.emissiveIntensity = orig; }, 800);
  }
}
