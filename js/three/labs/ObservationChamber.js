/* ═══════════════════════════════════════════════════════════════
   ObservationChamber.js — Sector 4: Anomaly Chamber (Observation)
   Features:
   - Twin adjacent research chambers (Left = Baseline, Right = Candidate)
   - Dynamic differences: Color, Position, Rotation, or Missing Object
   - Animated Security Laser Scanner sweeping horizontally
   - Sector Climax / Boss Trial: Dynamic anomalies spawn mid-trial while scanner accelerates
   - Pointer-lock center raycasting & click fallback
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { LabBase } from './LabBase.js';
import { EventBus } from '../../core/EventBus.js';

const OBJECT_TYPES = ['box', 'sphere', 'cylinder', 'torus', 'cone'];
const PALETTE = [0x4488ff, 0xff4488, 0x44ff88, 0xffcc00, 0xcc44ff, 0xff8800];

function makeObj(type, color) {
  const geo = type === 'box' ? new THREE.BoxGeometry(0.65, 0.65, 0.65)
            : type === 'sphere' ? new THREE.SphereGeometry(0.38, 16, 16)
            : type === 'cylinder' ? new THREE.CylinderGeometry(0.28, 0.28, 0.8, 16)
            : type === 'torus' ? new THREE.TorusGeometry(0.32, 0.12, 12, 24)
            : new THREE.ConeGeometry(0.38, 0.8, 16);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.65,
    emissive: new THREE.Color(color).multiplyScalar(0.25)
  });
  return new THREE.Mesh(geo, mat);
}

export class ObservationChamber extends LabBase {
  constructor(ctx) {
    super(ctx);
    this._category    = 'observation';
    this._title       = 'SECTOR 4: ANOMALY CHAMBER';
    this._leftObjs    = [];
    this._rightObjs   = [];
    this._diffIndices = [];
    this._foundCount  = 0;
    this._numDiffs    = 2;
    this._isBoss      = false;
    this._scannerTime = 0;
    this._scannerMesh = null;

    this._onInteract    = this._onInteract.bind(this);
    this._onCanvasClick = this._onCanvasClick.bind(this);
  }

  _buildScene() {
    this._group.position.set(0, 0, -15);

    // Center divider partition
    const divMat = new THREE.MeshStandardMaterial({
      color: 0x091424,
      emissive: 0x002244,
      emissiveIntensity: 0.4
    });
    const div = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 14), divMat);
    div.position.set(0, 2.5, -6);
    this._group.add(div);

    // Animated Red Security Scanner Laser
    const scanGeo = new THREE.PlaneGeometry(12, 0.08);
    const scanMat = new THREE.MeshBasicMaterial({
      color: 0xff0044,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this._scannerMesh = new THREE.Mesh(scanGeo, scanMat);
    this._scannerMesh.rotation.x = Math.PI / 2;
    this._scannerMesh.position.set(0, 1.8, -6);
    this._group.add(this._scannerMesh);
  }

  _onEnter(params) {
    this._isBoss = !!params.isBoss;
    this._clearEntities();

    this._numDiffs = params.differencesCount || (this._isBoss ? 4 : (this._diff >= 1400 ? 3 : 2));
    this._foundCount = 0;
    this._diffIndices = [];
    this._scannerTime = 0;

    const count = 8;
    const specs = [];
    for (let i = 0; i < count; i++) {
      specs.push({
        type:  OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)],
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        pos:   new THREE.Vector3(
          (Math.random() - 0.5) * 4.2,
          0.6 + Math.random() * 1.6,
          -3 - Math.random() * 5.5
        ),
        rotY:  Math.random() * Math.PI * 2
      });
    }

    // Build Left Baseline Scene
    specs.forEach((spec, i) => {
      const leftM = makeObj(spec.type, spec.color);
      leftM.position.copy(spec.pos).add(new THREE.Vector3(-3.4, 0, 0));
      leftM.rotation.y = spec.rotY;
      this._group.add(leftM);
      this._leftObjs.push(leftM);
    });

    // Select which indices contain anomalies
    const pool = Array.from({ length: count }, (_, i) => i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this._diffIndices = pool.slice(0, this._numDiffs);

    // Build Right Candidate Scene
    specs.forEach((spec, i) => {
      let color = spec.color;
      let pos = spec.pos.clone().add(new THREE.Vector3(3.4, 0, 0));
      let rotY = spec.rotY;
      const isDiff = this._diffIndices.includes(i);

      if (isDiff) {
        const diffType = Math.floor(Math.random() * 3);
        if (diffType === 0) {
          // Color anomaly
          color = PALETTE[(PALETTE.indexOf(color) + 2) % PALETTE.length];
        } else if (diffType === 1) {
          // Position offset
          pos.y += 0.85;
        } else {
          // Rotation anomaly
          rotY += Math.PI * 0.6;
        }
      }

      const rightM = makeObj(spec.type, color);
      rightM.position.copy(pos);
      rightM.rotation.y = rotY;
      rightM.userData = { objIdx: i, isAnomaly: isDiff, found: false };
      this._group.add(rightM);
      this._rightObjs.push(rightM);
    });

    if (this._isBoss) {
      this.aria?.speak(`Sector 4 Boss: Security Scanner Overdrive. Discover all ${this._numDiffs} anomalies before the beam locks down!`, 'urgent');
      this.spatialAudio?.playStinger('boss_start');
    } else {
      this.aria?.speak(`Inspect the twin chambers. Locate and click all ${this._numDiffs} anomalies on the right side.`, 'instruction');
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
    const hits = this.raycastCenter(this._rightObjs);
    if (hits.length > 0) this._checkClickedObject(hits[0].object);
  }

  _onCanvasClick(e) {
    if (document.pointerLockElement) {
      const hits = this.raycastCenter(this._rightObjs);
      if (hits.length > 0) this._checkClickedObject(hits[0].object);
      return;
    }

    const rect = this.scene3d.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this._raycaster.setFromCamera(mouse, this.camera);
    const hits = this._raycaster.intersectObjects(this._rightObjs);
    if (hits.length > 0) this._checkClickedObject(hits[0].object);
  }

  _checkClickedObject(mesh) {
    if (mesh.userData.found) return;
    this._attempts++;

    if (mesh.userData.isAnomaly) {
      mesh.userData.found = true;
      this._foundCount++;
      mesh.material.emissive.setHex(0x00ff88);
      mesh.material.emissiveIntensity = 3.0;
      this.spatialAudio?.playTone(587.33, 0.2, 'sine', 0.28);
      EventBus.emit('juice:popup', { text: `ANOMALY PURGED (${this._foundCount}/${this._numDiffs})`, color: '#00ff88' });

      if (this._foundCount >= this._numDiffs) {
        this._unbindControls();
        const winTimer = setTimeout(() => this._complete(true, { isBoss: this._isBoss }), 600);
        this._timeouts.add(winTimer);
      }
    } else {
      // False positive penalty
      this.flashMesh(mesh, 0xff2200, 300);
      this.spatialAudio?.playTone(130.81, 0.25, 'sawtooth', 0.25);
      EventBus.emit('juice:popup', { text: 'NO ANOMALY DETECTED', color: '#ff3344' });
    }
  }

  _render(delta) {
    // Security scanner sweep animation
    const sweepSpeed = this._isBoss ? 2.5 : 1.2;
    this._scannerTime += delta * sweepSpeed;
    if (this._scannerMesh) {
      this._scannerMesh.position.z = -6 + Math.sin(this._scannerTime) * 4.5;
    }
  }

  _giveHint() {
    // Reveal one unfound anomaly with a quick ping
    const unfound = this._rightObjs.find(o => o.userData.isAnomaly && !o.userData.found);
    if (unfound) {
      this.flashMesh(unfound, 0xfbbf24, 700);
      EventBus.emit('juice:popup', { text: 'ANOMALY HIGHLIGHTED', color: '#fbbf24' });
    }
  }

  _clearEntities() {
    this._leftObjs.forEach(m => {
      this._group.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    });
    this._leftObjs = [];

    this._rightObjs.forEach(m => {
      this._group.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    });
    this._rightObjs = [];
  }

  _onExit() {
    this._unbindControls();
    this._clearEntities();
  }
}
