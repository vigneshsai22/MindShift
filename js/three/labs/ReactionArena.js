/* ═══════════════════════════════════════════════════════════════
   ReactionArena.js — Sector 5: Reflex Arena (Reaction Time)
   Features:
   - Dynamic 3D targets spawned with positional HRTF audio cues
   - Red decoy targets with misclick penalties
   - Moving target trajectories in advanced waves
   - Sector Climax / Boss Trial: Multi-wave survival barrage
   - Sub-millisecond response time recording
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { LabBase } from './LabBase.js';
import { EventBus } from '../../core/EventBus.js';

export class ReactionArena extends LabBase {
  constructor(ctx) {
    super(ctx);
    this._category      = 'reaction';
    this._title         = 'SECTOR 5: REFLEX ARENA';
    this._targets       = [];
    this._hits          = 0;
    this._misses        = 0;
    this._neededHits    = 6;
    this._isBoss        = false;
    this._spawnTimer    = 0;
    this._spawnInterval = 1.2;
    this._targetLifetime = 1.8;

    this._onInteract    = this._onInteract.bind(this);
    this._onCanvasClick = this._onCanvasClick.bind(this);
  }

  _buildScene() {
    this._group.position.set(0, 0, -14);

    // Glowing Arena Perimeter Ring
    const ringGeo = new THREE.RingGeometry(3, 10, 36);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x07111e,
      emissive: 0x003366,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    this._group.add(ring);
  }

  _onEnter(params) {
    this._isBoss = !!params.isBoss;
    this._clearTargets();

    this._hits = 0;
    this._misses = 0;
    this._neededHits = this._isBoss ? 12 : (params.targetCount || 7);
    this._targetLifetime = Math.max(0.9, 2.2 - (this._diff - 800) * 0.001);
    this._spawnInterval = Math.max(0.6, 1.4 - (this._diff - 800) * 0.0006);
    this._spawnTimer = 0.5;

    if (this._isBoss) {
      this.aria?.speak("Sector 5 Boss: High-Velocity Reflex Barrage. Eliminate targets instantly—moving targets active!", 'urgent');
      this.spatialAudio?.playStinger('boss_start');
    } else {
      this.aria?.speak(`Engage ${this._neededHits} green acoustic targets. Avoid red decoys.`, 'instruction');
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

  _spawnTarget() {
    const isDecoy = Math.random() < (this._diff >= 1400 ? 0.3 : 0.15);
    const angle = (Math.random() - 0.5) * Math.PI * 0.85;
    const dist = 6 + Math.random() * 5;
    const x = Math.sin(angle) * dist;
    const y = 1.0 + Math.random() * 2.5;
    const z = -Math.cos(angle) * dist;

    const geo = isDecoy ? new THREE.BoxGeometry(0.6, 0.6, 0.6) : new THREE.SphereGeometry(0.4, 16, 16);
    const color = isDecoy ? 0xff0044 : 0x00ffcc;
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 2.2,
      roughness: 0.2
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.userData = { isDecoy, spawnTime: performance.now() };
    this._group.add(mesh);

    // Play 3D positional audio cue
    this.spatialAudio?.playPositional(isDecoy ? 180 : 580, 0.25, mesh.position, 'sine', 0.15);

    const targetObj = {
      mesh,
      isDecoy,
      spawnTime: performance.now(),
      life: this._targetLifetime,
      vx: (this._isBoss || this._diff >= 1500) ? (Math.random() - 0.5) * 2.5 : 0
    };
    this._targets.push(targetObj);
  }

  _onInteract() {
    const hits = this.raycastCenter(this._targets.map(t => t.mesh));
    if (hits.length > 0) this._handleHit(hits[0].object);
  }

  _onCanvasClick(e) {
    const targetMeshes = this._targets.map(t => t.mesh);
    if (document.pointerLockElement) {
      const hits = this.raycastCenter(targetMeshes);
      if (hits.length > 0) this._handleHit(hits[0].object);
      return;
    }

    const rect = this.scene3d.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this._raycaster.setFromCamera(mouse, this.camera);
    const hits = this._raycaster.intersectObjects(targetMeshes);
    if (hits.length > 0) this._handleHit(hits[0].object);
  }

  _handleHit(mesh) {
    const tIdx = this._targets.findIndex(t => t.mesh === mesh);
    if (tIdx === -1) return;
    const target = this._targets[tIdx];

    this._attempts++;
    this._group.remove(mesh);
    this._targets.splice(tIdx, 1);
    mesh.geometry.dispose();
    mesh.material.dispose();

    if (!target.isDecoy) {
      this._hits++;
      const rtMs = performance.now() - target.spawnTime;
      this.spatialAudio?.playTone(880, 0.15, 'sine', 0.28);
      EventBus.emit('juice:popup', { text: `${Math.round(rtMs)}ms HIT!`, color: '#00ff88' });

      if (this._hits >= this._neededHits) {
        this._unbindControls();
        const winTimer = setTimeout(() => this._complete(true, { isBoss: this._isBoss, hits: this._hits }), 400);
        this._timeouts.add(winTimer);
      }
    } else {
      // Decoy hit
      this._misses++;
      this.spatialAudio?.playTone(110, 0.3, 'sawtooth', 0.3);
      EventBus.emit('juice:popup', { text: 'DECOY PENALTY!', color: '#ff3344' });

      if (this._misses >= 3) {
        this._unbindControls();
        const failTimer = setTimeout(() => this._complete(false, { isBoss: this._isBoss }), 500);
        this._timeouts.add(failTimer);
      }
    }
  }

  _render(delta) {
    this._spawnTimer -= delta;
    if (this._spawnTimer <= 0 && this._hits < this._neededHits) {
      this._spawnTimer = this._spawnInterval;
      if (this._targets.length < 5) this._spawnTarget();
    }

    // Update targets & lifetime
    for (let i = this._targets.length - 1; i >= 0; i--) {
      const t = this._targets[i];
      t.life -= delta;

      // Moving targets
      if (t.vx !== 0) {
        t.mesh.position.x += t.vx * delta;
        if (Math.abs(t.mesh.position.x) > 6) t.vx *= -1;
      }

      if (t.life <= 0) {
        this._group.remove(t.mesh);
        t.mesh.geometry.dispose();
        t.mesh.material.dispose();
        this._targets.splice(i, 1);
      }
    }
  }

  _giveHint() {
    // Vaporize all active decoys
    for (let i = this._targets.length - 1; i >= 0; i--) {
      if (this._targets[i].isDecoy) {
        this._group.remove(this._targets[i].mesh);
        this._targets.splice(i, 1);
      }
    }
    EventBus.emit('juice:popup', { text: 'DECOYS PURGED', color: '#fbbf24' });
  }

  _clearTargets() {
    this._targets.forEach(t => {
      this._group.remove(t.mesh);
      t.mesh.geometry.dispose();
      t.mesh.material.dispose();
    });
    this._targets = [];
  }

  _onExit() {
    this._unbindControls();
    this._clearTargets();
  }
}
