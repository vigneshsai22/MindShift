/* ═══════════════════════════════════════════════════════════════
   ReflexArena.js — Tier 1 Reaction Time Game (3D)
   Cognitive Domain: Psychomotor speed, reaction time, Go / No-Go inhibition.
   Rapidly acquires green target drones while inhibiting red hazards.
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
      tags: ['reaction-time', 'go-no-go', 'motor-precision'],
      palette: { primary: '#ef4444', secondary: '#450a0a', accent: '#f87171' }
    });

    this.activeTargets = [];
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this.targetQuota = 6;
    this.targetsHit = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1.0;
    this.timeDilation = 1.0;
  }

  build(scene, camera) {
    super.build(scene, camera);

    // Reflex dome grid wireframe
    const domeGeom = new THREE.SphereGeometry(7, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x331111,
      wireframe: true,
      side: THREE.DoubleSide
    });
    const dome = new THREE.Mesh(domeGeom, domeMat);
    dome.position.y = -0.5;
    this.addObject(dome);

    // Ambient alert light
    const redLight = new THREE.PointLight(0xff4444, 1.8, 15);
    redLight.position.set(0, 4, 0);
    this.addObject(redLight);

    const canvas = document.querySelector('#three-canvas') || window;
    this.listen(canvas, 'pointerdown', (e) => this._onPointerDown(e));
  }

  start(levelParams) {
    super.start(levelParams);

    if (this.camera) {
      this.camera.position.set(0, 2, 5.5);
      this.camera.lookAt(0, 2, 0);
    }

    this.targetsHit = 0;
    this.targetQuota = Math.min(10, 5 + Math.floor(this.level / 5));
    this.spawnInterval = Math.max(0.6, 1.2 - (this.level - 1) * 0.02);
    this.spawnTimer = 0.3;
    this.timeDilation = 1.0;

    EventBus.emit('hud:subtitle', {
      text: 'Neural Reflexes Online: Strike GREEN drones instantly; INHIBIT red hazards.'
    });
  }

  _spawnTarget() {
    if (this.finished || this.paused) return;

    const isHazard = Math.random() < 0.28; // 28% chance of No-Go distractor

    // Random position across the arena arc
    const theta = (Math.random() - 0.5) * Math.PI * 0.7;
    const phi = (Math.random() * 0.4 + 0.1) * Math.PI;
    const r = 4.5;

    const x = r * Math.sin(phi) * Math.sin(theta);
    const y = 2.0 + (Math.random() - 0.5) * 2.2;
    const z = r * Math.cos(phi) * 0.3;

    const color = isHazard ? 0xef4444 : 0x10b981;
    const geom = isHazard
      ? new THREE.OctahedronGeometry(0.4)
      : new THREE.SphereGeometry(0.38, 16, 16);

    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8,
      roughness: 0.2
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(0.01, 0.01, 0.01);

    const targetData = {
      isHazard,
      mesh,
      mat,
      age: 0,
      lifetime: (isHazard ? 1.4 : 1.2) * this.timeDilation,
      spawnedAt: performance.now()
    };
    mesh.userData = targetData;

    this.addObject(mesh);
    this.activeTargets.push(targetData);

    // Pop-in tween
    Tween.to(mesh.scale, { x: 1, y: 1, z: 1 }, 0.15, 'easeOutBack').start();
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
    const meshes = this.activeTargets.map(t => t.mesh);
    const hits = this._raycaster.intersectObjects(meshes, false);

    if (hits.length > 0) {
      const hit = hits[0].object;
      const data = hit.userData;

      if (data.isHazard) {
        // Inhibitory failure (clicked a No-Go hazard)
        SFXLib.playError();
        this.recordResponse(false);
        EventBus.emit('hud:subtitle', { text: 'Inhibition Breach! Hazard detonated.' });

        // Despawn
        this._removeTarget(data);
      } else {
        // Valid Go target hit!
        SFXLib.playHit();
        this.recordResponse(true);
        this.targetsHit++;

        Tween.to(hit.scale, { x: 1.6, y: 1.6, z: 1.6 }, 0.1, 'easeOutQuad')
          .onComplete(() => this._removeTarget(data))
          .start();

        if (this.targetsHit >= this.targetQuota) {
          SFXLib.playSuccess();
          EventBus.emit('hud:subtitle', { text: 'Reflex quota completed. Neural latency optimal.' });
          this.completeTrial(true, 1.0);
        }
      }
    }
  }

  _removeTarget(data) {
    const idx = this.activeTargets.indexOf(data);
    if (idx >= 0) this.activeTargets.splice(idx, 1);
    if (data.mesh.parent) data.mesh.parent.remove(data.mesh);
    data.mat.dispose();
  }

  hint(type) {
    super.hint(type);
    if (type === 'slow_time') {
      this.timeDilation = 2.0;
      for (const t of this.activeTargets) {
        t.lifetime *= 2.0;
      }
      EventBus.emit('hud:subtitle', { text: 'Synaptic dilation enabled. Target decay halved.' });
    } else if (type === 'reveal' || type === 'aria_clue') {
      // Disarm all hazards currently on screen
      for (let i = this.activeTargets.length - 1; i >= 0; i--) {
        const t = this.activeTargets[i];
        if (t.isHazard) {
          this._removeTarget(t);
        }
      }
      EventBus.emit('hud:subtitle', { text: 'ARIA: Active threat hazards suppressed.' });
    }
  }

  update(dt) {
    super.update(dt);

    if (this.paused || this.finished) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this._spawnTarget();
      this.spawnTimer = this.spawnInterval;
    }

    // Decay active targets
    for (let i = this.activeTargets.length - 1; i >= 0; i--) {
      const t = this.activeTargets[i];
      t.age += dt;

      // Subtle wobble
      t.mesh.rotation.y += dt * 3.0;

      if (t.age >= t.lifetime) {
        // Timed out
        if (!t.isHazard) {
          // Missed a valid target
          this.recordResponse(false);
          SFXLib.playTone(220, 0.15);
        }
        this._removeTarget(t);
      }
    }
  }
}
