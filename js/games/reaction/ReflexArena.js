/* ═══════════════════════════════════════════════════════════════
   ReflexArena.js — Tier 1 Reaction Time Game (3D)
   Cognitive Domain: Psychomotor speed, impulse control (Go / No-Go), target interception.
   Multi-Round Mission: Player intercepts sequential target waves,
   striking Green synaptic targets and inhibiting Red hazard decoys.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GameBase } from '../../kit/GameBase.js';
import { Tween }    from '../../kit/TweenLib.js';
import { SFXLib }   from '../../audio/SFXLib.js';
import { EventBus } from '../../core/EventBus.js';

export class ReflexArena extends GameBase {
  constructor() {
    super({
      id: 'reflex-arena',
      name: 'Reflex Arena',
      skill: 'reaction',
      tags: ['psychomotor-speed', 'go-no-go', 'inhibitory-control'],
      palette: { primary: '#ef4444', secondary: '#450a0a', accent: '#f87171' },
      goalText: 'Intercept GREEN synaptic targets instantly; INHIBIT red hazards.'
    });

    this.activeTargets = [];
    this.targetsHitInWave = 0;
    this.waveQuota = 4;
    this.spawnTimer = 0;
    this.spawnInterval = 0.9;
    this.timeDilation = 1.0;
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._nextTargetId = 0;
  }

  build(scene, camera) {
    super.build(scene, camera);

    camera.position.set(0, 2.0, 5.8);
    camera.lookAt(0, 2.0, 0);

    // Arena Floor Deck
    const floorGeom = new THREE.CylinderGeometry(6, 6.4, 0.3, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.position.set(0, -0.15, 0);
    this.addObject(floor);

    // Glowing Arena Perimeter Ring
    const ringGeom = new THREE.TorusGeometry(6.0, 0.08, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.02, 0);
    this.addObject(ring);

    // Cylindrical Holographic Wall
    const cylGeom = new THREE.CylinderGeometry(5.8, 5.8, 4.5, 48, 1, true, -Math.PI * 0.45, Math.PI * 0.9);
    const cylMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const wall = new THREE.Mesh(cylGeom, cylMat);
    wall.position.set(0, 2.2, 0);
    this.addObject(wall);

    // Lighting
    const aLight = new THREE.PointLight(0xf87171, 2.2, 16);
    aLight.position.set(0, 4.2, 2);
    this.addObject(aLight);

    const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x0f172a, 1.2);
    this.addObject(hemiLight);

    const canvas = document.querySelector('#three-canvas') || window;
    this.listen(canvas, 'pointerdown', (e) => this._onPointerDown(e));

    // Keyboard accessibility: Space or Enter intercepts closest green target
    this.listen(window, 'keydown', (e) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        if (this.paused || this.finished || !this.roundActive) return;
        const greenDrone = this.activeTargets.find(t => !t.isHazard);
        if (greenDrone) {
          e.preventDefault();
          this._hitDrone(greenDrone);
        }
      }
    });
  }

  start(levelParams) {
    if (this.camera) {
      this.camera.position.set(0, 2.0, 5.8);
      this.camera.lookAt(0, 2.0, 0);
    }
    super.start(levelParams);
  }

  setupRound(roundIndex, ramp, levelParams = {}) {
    if (this.finished) return;

    this._clearTargets();
    this.targetsHitInWave = 0;

    // Scaling quota per wave inside level
    if (this.isPractice) {
      this.waveQuota = 3;
      this.spawnInterval = 1.2;
    } else {
      const baseQuota = Math.min(6, Math.max(3, 3 + Math.floor((this.level - 1) * 0.1)));
      this.waveQuota = Math.min(7, Math.round(baseQuota + ramp * 1.5));
      this.spawnInterval = Math.max(0.65, 1.15 - (this.level - 1) * 0.015 - ramp * 0.15);
    }

    this.spawnTimer = 0.3;
    this.timeDilation = 1.0;

    if (this.isPractice) {
      EventBus.emit('hud:subtitle', {
        text: '🟢 PRACTICE: Tap 3 GREEN targets. Red hazards must be ignored!'
      });
    } else {
      EventBus.emit('hud:subtitle', {
        text: `⚡ Wave ${roundIndex} / ${this.totalRounds}: Intercept ${this.waveQuota} GREEN synaptic targets!`
      });
    }
  }

  teardownRound(correct, reason) {
    this._clearTargets();
  }

  _clearTargets() {
    for (const t of this.activeTargets) {
      if (this.inputManager) {
        this.inputManager.unregisterTarget(t.targetId);
      }
      if (t.mesh && t.mesh.parent) {
        t.mesh.parent.remove(t.mesh);
      }
    }
    this.activeTargets = [];
  }

  _spawnTarget() {
    if (this.finished || this.paused || !this.roundActive) return;

    // Hazard probability increases with level: 15% to 35%
    const isHazard = !this.isPractice && (Math.random() < Math.min(0.35, 0.18 + (this.level - 1) * 0.006));

    const theta = (Math.random() - 0.5) * Math.PI * 0.65;
    const phi = (Math.random() * 0.35 + 0.12) * Math.PI;
    const r = 4.4;

    const x = r * Math.sin(phi) * Math.sin(theta);
    const y = 2.0 + (Math.random() - 0.5) * 2.2;
    const z = r * Math.cos(phi) * 0.35;

    const color = isHazard ? 0xef4444 : 0x10b981;
    const geom = isHazard
      ? new THREE.OctahedronGeometry(0.42)
      : new THREE.SphereGeometry(0.38, 16, 16);

    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.85,
      roughness: 0.2
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(0.01, 0.01, 0.01);
    this.addObject(mesh);

    const targetId = `target_${this._nextTargetId++}`;
    const baseLife = Math.max(1.1, 2.4 - (this.level - 1) * 0.045);
    const targetData = {
      targetId,
      mesh,
      mat,
      isHazard,
      life: (isHazard ? baseLife * 1.25 : baseLife) * this.timeDilation
    };
    mesh.userData = targetData;
    this.activeTargets.push(targetData);

    this.registerTarget(targetId, mesh, {
      hitRadius: 1.45,
      onHover: (hovered) => {
        if (hovered) mat.emissiveIntensity = 1.5;
        else mat.emissiveIntensity = 0.85;
      },
      onPress: () => {
        if (this.paused || this.finished || !this.roundActive) return;
        this._hitDrone(targetData);
      }
    });

    Tween.to(mesh.scale, { x: 1, y: 1, z: 1 }, 0.15, 'easeOutBack').start();
  }

  _hitDrone(data) {
    if (!this.roundActive || this.finished) return;
    this.registerPlayerAction();

    if (data.isHazard) {
      // Inhibitory failure
      SFXLib.playError?.();
      data.mat.emissive.setHex(0xffffff);
      data.mat.emissiveIntensity = 3.0;

      EventBus.emit('hud:subtitle', {
        text: '✗ Inhibitory Breach! Red hazard intercepted.'
      });

      this._removeTarget(data);
      this.setTimeout(() => {
        this.endRound(false, 'Inhibitory failure: Red decoy was struck');
      }, 500);
    } else {
      // Valid Go target hit!
      SFXLib.playHit?.() || SFXLib.playTone?.(880, 0.08);
      this.targetsHitInWave++;

      Tween.to(data.mesh.scale, { x: 1.6, y: 1.6, z: 1.6 }, 0.1, 'easeOutQuad')
        .onComplete(() => this._removeTarget(data))
        .start();

      EventBus.emit('hud:subtitle', {
        text: `Target intercepted! [${this.targetsHitInWave} / ${this.waveQuota}]`
      });

      if (this.targetsHitInWave >= this.waveQuota) {
        SFXLib.playSuccess?.() || SFXLib.levelStart?.();
        EventBus.emit('hud:subtitle', { text: '✨ Wave intercept quota complete! Neural reflexes optimal.' });
        this.setTimeout(() => {
          this.endRound(true);
        }, 500);
      }
    }
  }

  _removeTarget(data) {
    const idx = this.activeTargets.indexOf(data);
    if (idx >= 0) this.activeTargets.splice(idx, 1);
    if (this.inputManager) this.inputManager.unregisterTarget(data.targetId);
    if (data.mesh && data.mesh.parent) data.mesh.parent.remove(data.mesh);
  }

  _onPointerDown(e) {
    if (this.paused || this.finished || !this.roundActive) return;

    const canvas = document.querySelector('#three-canvas');
    const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches?.[0]?.clientX ?? 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches?.[0]?.clientY ?? 0);

    this._mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, this.camera);
    const meshes = this.activeTargets.map(t => t.mesh);
    const hits = this._raycaster.intersectObjects(meshes, false);

    if (hits.length > 0) {
      this._hitDrone(hits[0].object.userData);
    }
  }

  botPlayRound(willWin = true) {
    if (!this.roundActive || this.finished) return;

    if (willWin) {
      // Find active non-hazard targets and click them in sequence
      const nonHazards = this.activeTargets.filter(t => !t.isHazard);
      if (nonHazards.length > 0) {
        this._hitDrone(nonHazards[0]);
      } else {
        // Wait for next spawn
        this.setTimeout(() => {
          const fresh = this.activeTargets.filter(t => !t.isHazard);
          if (fresh.length > 0) this._hitDrone(fresh[0]);
        }, 400);
      }
    } else {
      const hazards = this.activeTargets.filter(t => t.isHazard);
      if (hazards.length > 0) {
        this._hitDrone(hazards[0]);
      } else {
        // Miss round
        this.setTimeout(() => {
          this.endRound(false, 'Reflex window lapsed');
        }, 600);
      }
    }
  }

  hint(type) {
    super.hint(type);
    if (type === 'slow_time') {
      this.timeDilation = 2.0;
      EventBus.emit('hud:subtitle', { text: '⏳ Chrono Dilate: Target decay speed halved.' });
    } else if (type === 'reveal' || type === 'aria_clue') {
      // Shield against hazards: remove all active red hazards
      for (const t of [...this.activeTargets]) {
        if (t.isHazard) {
          this._removeTarget(t);
        }
      }
      EventBus.emit('hud:subtitle', { text: '🤖 ARIA: Decoy hazards neutralized from visual field.' });
    }
  }

  update(dt) {
    super.update(dt);
    if (!this.roundActive || this.finished || this.paused) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnInterval;
      if (this.activeTargets.length < 5) {
        this._spawnTarget();
      }
    }

    // Decay active targets
    for (let i = this.activeTargets.length - 1; i >= 0; i--) {
      const t = this.activeTargets[i];
      t.life -= dt;
      if (t.life <= 0) {
        this._removeTarget(t);
      } else if (t.life < 0.6) {
        t.mat.opacity = t.life / 0.6;
        t.mat.transparent = true;
      }
    }
  }

  exit() {
    this._clearTargets();
    super.exit();
  }
}
