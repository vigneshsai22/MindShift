/* ═══════════════════════════════════════════════════════════════
   AnomalyRooms.js — Tier 1 Visual Observation Game (3D)
   Cognitive Domain: Visual observation, subtle discrepancy detection, change blindness.
   Player inspects a 3D containment lab to pinpoint anomalous objects.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GameBase } from '../../kit/GameBase.js';
import { Tween }    from '../../kit/TweenLib.js';
import { SFXLib }   from '../../audio/SFXLib.js';
import { EventBus } from '../../core/EventBus.js';

export class AnomalyRooms extends GameBase {
  constructor() {
    super({
      id: 'anomaly-rooms',
      name: 'Anomaly Rooms',
      skill: 'observation',
      tags: ['visual-search', 'change-detection', 'spatial-detail'],
      palette: { primary: '#f59e0b', secondary: '#451a03', accent: '#fbbf24' }
    });

    this.props = [];
    this.anomalousIndex = -1;
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._hintMarker = null;
  }

  build(scene, camera) {
    super.build(scene, camera);

    camera.position.set(0, 3.5, 6.0);
    camera.lookAt(0, 1.5, 0);

    // Lab floor & walls
    const floorGeom = new THREE.PlaneGeometry(12, 12);
    floorGeom.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.2,
      metalness: 0.5
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    this.addObject(floor);

    // Wall back
    const wallGeom = new THREE.PlaneGeometry(12, 6);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 });
    const wall = new THREE.Mesh(wallGeom, wallMat);
    wall.position.set(0, 3, -6);
    this.addObject(wall);

    // Ambient & observation spotlights
    const spot = new THREE.SpotLight(0xfffbeb, 2, 20, Math.PI / 4, 0.4);
    spot.position.set(0, 6, 4);
    this.addObject(spot);

    const canvas = document.querySelector('#three-canvas') || window;
    this.listen(canvas, 'pointerdown', (e) => this._onPointerDown(e));
  }

  start(levelParams) {
    super.start(levelParams);

    if (this.camera) {
      this.camera.position.set(0, 3.8, 6.2);
      this.camera.lookAt(0, 1.5, 0);
    }

    this._spawnProps();
  }

  _spawnProps() {
    // Clean old props
    for (const p of this.props) {
      if (p.mesh && p.mesh.parent) p.mesh.parent.remove(p.mesh);
    }
    this.props = [];

    const propTypes = [
      { geom: new THREE.CylinderGeometry(0.3, 0.3, 1.2, 16), color: 0x06b6d4, type: 'canister' },
      { geom: new THREE.BoxGeometry(0.8, 0.8, 0.8), color: 0x8b5cf6, type: 'crate' },
      { geom: new THREE.SphereGeometry(0.45, 24, 24), color: 0x10b981, type: 'orb' },
      { geom: new THREE.ConeGeometry(0.4, 1.1, 16), color: 0xf59e0b, type: 'pylon' },
      { geom: new THREE.TorusGeometry(0.4, 0.15, 16, 32), color: 0xec4899, type: 'ring' },
      { geom: new THREE.DodecahedronGeometry(0.5), color: 0x3b82f6, type: 'poly' }
    ];

    const count = Math.min(6, 4 + Math.min(2, Math.floor(this.level / 8)));
    this.anomalousIndex = Math.floor(Math.random() * count);

    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.32 + (i / Math.max(1, count - 1)) * Math.PI * 0.64;
      const posX = Math.sin(angle) * 4.6;
      const posZ = -Math.cos(angle) * 3.2 + 0.8;
      const posY = 0.8;

      const pGroup = new THREE.Group();
      pGroup.position.set(posX, posY, posZ);
      pGroup.rotation.y = -angle;

      // Pedestal
      const pedGeom = new THREE.CylinderGeometry(0.5, 0.6, 0.8, 16);
      const pedMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.6 });
      const ped = new THREE.Mesh(pedGeom, pedMat);
      ped.position.y = -0.4;
      pGroup.add(ped);

      // Specimen prop
      const t = propTypes[i % propTypes.length];
      const isAnomaly = (i === this.anomalousIndex);

      let pMat;
      if (isAnomaly) {
        // Subtle anomaly: inverted hue shift, floating altitude, or glitch pulse
        pMat = new THREE.MeshStandardMaterial({
          color: t.color ^ 0x332211,
          emissive: 0x221100,
          roughness: 0.1,
          metalness: 0.9
        });
      } else {
        pMat = new THREE.MeshStandardMaterial({
          color: t.color,
          roughness: 0.3,
          metalness: 0.3
        });
      }

      const specimen = new THREE.Mesh(t.geom, pMat);
      specimen.position.y = 0.5;

      if (isAnomaly) {
        // Anomaly visual cue based on difficulty level
        if (this.level > 15) {
          specimen.rotation.z = Math.PI / 8; // subtle slant
        } else {
          specimen.scale.set(1.25, 1.25, 1.25); // noticeable scale deviation
        }
      }

      pGroup.add(specimen);

      const propData = {
        index: i,
        isAnomaly,
        mesh: pGroup,
        specimen,
        mat: pMat
      };
      pGroup.userData = propData;

      this.addObject(pGroup);
      this.props.push(propData);

      // Register with unified InputManager
      this.registerTarget(`prop_${i}`, specimen, {
        hitRadius: 1.1,
        key: String(i + 1),
        onHover: (hovered) => {
          if (hovered) {
            pMat.emissiveIntensity = 0.8;
          } else {
            pMat.emissiveIntensity = 0.1;
          }
        },
        onPress: () => {
          if (this.paused || this.finished) return;
          this._selectProp(propData);
        }
      });
    }

    EventBus.emit('hud:subtitle', {
      text: 'Visual Scanner Active: Detect and report the anomalous containment pedestal.'
    });
  }

  _selectProp(selected) {
    if (selected.isAnomaly) {
      // Success!
      SFXLib.playSuccess();
      Tween.to(selected.specimen.scale, { x: 1.5, y: 1.5, z: 1.5 }, 0.3, 'easeOutBack').start();
      selected.mat.emissive.setHex(0x00ff88);
      selected.mat.emissiveIntensity = 2.0;

      EventBus.emit('hud:subtitle', { text: 'Anomaly pinpointed! Containment secure.' });
      this.completeTrial(true, 1.0);
    } else {
      // False positive
      SFXLib.playError();
      this.recordResponse(false);
      EventBus.emit('hud:subtitle', { text: 'Nominal baseline specimen. Re-evaluate.' });
    }
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
    const meshes = this.props.map(p => p.mesh);
    const hits = this._raycaster.intersectObjects(meshes, true);

    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj.parent && (!obj.userData || obj.userData.index === undefined)) {
        obj = obj.parent;
      }

      if (obj.userData && obj.userData.index !== undefined) {
        this._selectProp(obj.userData);
      }
    }
  }

  hint(type) {
    super.hint(type);
    const anomaly = this.props[this.anomalousIndex];
    if (!anomaly) return;

    if (type === 'reveal' || type === 'aria_clue') {
      Tween.to(anomaly.specimen.scale, { x: 1.4, y: 1.4, z: 1.4 }, 0.4, 'easeInOutQuad')
        .onComplete(() => {
          Tween.to(anomaly.specimen.scale, { x: 1.1, y: 1.1, z: 1.1 }, 0.3).start();
        }).start();

      const quadrant = anomaly.mesh.position.x < 0 ? 'West Wing' : 'East Wing';
      EventBus.emit('hud:subtitle', { text: `ARIA: Micro-fluctuation isolated in the ${quadrant}.` });
    } else if (type === 'slow_time') {
      EventBus.emit('hud:subtitle', { text: 'Environmental scanner frequency halved.' });
    }
  }

  update(dt) {
    super.update(dt);
    // Animate anomalies gently
    if (this.anomalousIndex >= 0 && this.props[this.anomalousIndex]) {
      const anom = this.props[this.anomalousIndex];
      anom.specimen.rotation.y += dt * 0.8;
    }
  }
}
