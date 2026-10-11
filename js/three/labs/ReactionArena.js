/* ═══════════════════════════════════════════════════════════════
   ReactionArena.js
   Targets pop up around the player; click green targets, avoid
   red decoys. Response time measured per target.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { LabBase } from './LabBase.js';

export class ReactionArena extends LabBase {
  constructor(ctx) {
    super(ctx);
    this._category  = 'reaction';
    this._targets   = [];
    this._hits      = 0;
    this._misses    = 0;
    this._needed    = 5;
    this._spawnTimer = 0;
    this._spawnInterval = 1.5;
    this._targetLife = 2.0; // seconds before a target auto-despawns
    this._clickHandler = null;
    this._t0target  = 0;
  }

  _buildScene() {
    this._group.position.set(0, 0, -15);

    // Arena floor ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2, 9, 32),
      new THREE.MeshStandardMaterial({ color: 0x050e1a, side: THREE.DoubleSide, emissive: 0x002233, emissiveIntensity: 0.3 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    this._group.add(ring);

    // Scoreboard canvas
    const sc = document.createElement('canvas');
    sc.width = 512; sc.height = 128;
    this._scoreCtx = sc.getContext('2d');
    this._scoreTex = new THREE.CanvasTexture(sc);
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5),
      new THREE.MeshStandardMaterial({ map: this._scoreTex, emissive: 0x001122, emissiveIntensity: 0.4 }));
    sp.position.set(0, 4, -8.4);
    this._group.add(sp);

    // Ambient arena light
    const l = new THREE.PointLight(0xff4400, 1.5, 25);
    l.position.set(0, 6, -5);
    this._group.add(l);
  }

  _onEnter(diff) {
    this._hits = 0; this._misses = 0;
    this._needed = 3 + diff;       // more targets at higher diff
    this._spawnInterval = 2 - diff * 0.25;  // faster spawning
    this._targetLife    = 2.5 - diff * 0.25;
    this._spawnTimer    = 0;
    this._attempts      = 0;
    this._updateScore();
    this.aria?.speak(`Hit ${this._needed} glowing targets. Avoid the red decoys!`, 'instruction');

    this._clickHandler = (e) => this._onCanvasClick(e);
    this.scene3d.renderer.domElement.addEventListener('click', this._clickHandler);
  }

  _render(delta) {
    this._spawnTimer -= delta;
    if (this._spawnTimer <= 0) {
      this._spawnTarget();
      this._spawnTimer = this._spawnInterval;
    }

    // Age targets
    for (let i = this._targets.length - 1; i >= 0; i--) {
      const t = this._targets[i];
      t.life -= delta;
      t.mesh.rotation.y += delta * 2;
      // Pulse scale
      const pulse = 1 + Math.sin(t.life * 8) * 0.05;
      t.mesh.scale.setScalar(pulse);

      if (t.life <= 0) {
        if (!t.isDecoy) this._misses++;
        this._removeTarget(i);
        if (this._misses >= 3 || (this._hits >= this._needed)) {
          this._finish();
        }
      }
    }
    this._updateScore();
  }

  _spawnTarget() {
    const isDecoy = Math.random() < (0.15 + this._diff * 0.07);
    const angle   = Math.random() * Math.PI * 2;
    const radius  = 3 + Math.random() * 5;
    const pos     = new THREE.Vector3(
      Math.sin(angle) * radius,
      0.8 + Math.random() * 2,
      -5 + Math.cos(angle) * radius * 0.5
    );

    const color = isDecoy ? 0xff2200 : 0x00ff88;
    const geo   = new THREE.OctahedronGeometry(0.35, 0);
    const mat   = new THREE.MeshStandardMaterial({
      color, emissive: new THREE.Color(color), emissiveIntensity: 1.8,
      roughness: 0.2, metalness: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.castShadow = true;
    mesh.userData = { targetIdx: this._targets.length, isDecoy };

    this._group.add(mesh);
    this.spatialAudio?.playPositional(isDecoy ? 150 : 480, 0.12, pos);

    this._targets.push({ mesh, mat, isDecoy, life: this._targetLife });
  }

  _removeTarget(i) {
    const t = this._targets[i];
    t.mat.dispose();
    t.mesh.geometry.dispose();
    this._group.remove(t.mesh);
    this._targets.splice(i, 1);
  }

  _onCanvasClick(e) {
    const rect  = this.scene3d.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray  = new THREE.Raycaster();
    ray.setFromCamera(mouse, this.scene3d.camera);
    const meshes = this._targets.map(t => t.mesh);
    const hits   = ray.intersectObjects(meshes);
    if (!hits.length) return;

    const hitMesh = hits[0].object;
    const idx     = this._targets.findIndex(t => t.mesh === hitMesh);
    if (idx < 0) return;
    const t = this._targets[idx];
    this._attempts++;

    if (t.isDecoy) {
      // Penalty
      this._misses++;
      this.spatialAudio?.playTone(100, 0.3, 'sawtooth', 0.25);
    } else {
      this._hits++;
      this.spatialAudio?.playTone(660, 0.18, 'sine', 0.2);
    }

    this._removeTarget(idx);
    if (this._hits >= this._needed || this._misses >= 3) this._finish();
  }

  _finish() {
    this.scene3d.renderer.domElement.removeEventListener('click', this._clickHandler);
    this._clickHandler = null;
    // Clear remaining targets
    for (let i = this._targets.length - 1; i >= 0; i--) this._removeTarget(i);
    const correct = this._hits >= this._needed && this._misses < 3;
    this._complete(correct, this._attempts);
  }

  _updateScore() {
    const ctx = this._scoreCtx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`✓ ${this._hits} / ${this._needed}`, 30, 80);
    ctx.fillStyle = '#ff4400';
    ctx.textAlign = 'right';
    ctx.fillText(`✗ ${this._misses} / 3`, 490, 80);
    this._scoreTex.needsUpdate = true;
  }

  _onExit() {
    if (this._clickHandler) {
      this.scene3d.renderer.domElement.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
    for (let i = this._targets.length - 1; i >= 0; i--) this._removeTarget(i);
  }

  _giveHint() {
    // Briefly flash all valid (non-decoy) targets brighter
    this._targets.filter(t => !t.isDecoy).forEach(t => {
      t.mat.emissiveIntensity = 4;
      setTimeout(() => { t.mat.emissiveIntensity = 1.8; }, 500);
    });
  }
}
