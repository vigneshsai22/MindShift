/* ═══════════════════════════════════════════════════════════════
   AnomalyRooms.js — Tier 1 Visual Observation Game (3D)
   Cognitive Domain: Visual observation, subtle discrepancy detection, change blindness.
   Multi-Round Mission: Player inspects containment pods across
   sequential rounds to pinpoint anomalous mutated specimens.
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
      palette: { primary: '#f59e0b', secondary: '#451a03', accent: '#fbbf24' },
      goalText: 'Scan the containment lab and isolate the anomalous specimen.'
    });

    this.props = [];
    this.anomalousIndex = -1;
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._hintMarker = null;
    this._time = 0;
  }

  build(scene, camera) {
    super.build(scene, camera);

    camera.position.set(0, 3.6, 6.2);
    camera.lookAt(0, 1.4, 0);

    // Lab floor & walls
    const floorGeom = new THREE.PlaneGeometry(14, 14);
    floorGeom.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0c1222,
      roughness: 0.25,
      metalness: 0.6
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    this.addObject(floor);

    // Wall back with laboratory grid
    const wallGeom = new THREE.PlaneGeometry(14, 7);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const wall = new THREE.Mesh(wallGeom, wallMat);
    wall.position.set(0, 3.5, -6);
    this.addObject(wall);

    // Holographic containment grid lines
    const gridHelper = new THREE.GridHelper(14, 14, 0xf59e0b, 0x1e293b);
    gridHelper.position.y = 0.02;
    this.addObject(gridHelper);

    // Ambient & observation spotlights
    const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x0c1222, 1.2);
    this.addObject(hemiLight);

    const spot = new THREE.SpotLight(0xfffbeb, 2.5, 25, Math.PI / 3.5, 0.4);
    spot.position.set(0, 7, 4);
    this.addObject(spot);

    const canvas = document.querySelector('#three-canvas') || window;
    this.listen(canvas, 'pointerdown', (e) => this._onPointerDown(e));
  }

  start(levelParams) {
    if (this.camera) {
      this.camera.position.set(0, 3.6, 6.2);
      this.camera.lookAt(0, 1.4, 0);
    }
    super.start(levelParams);
  }

  setupRound(roundIndex, ramp, levelParams = {}) {
    if (this.finished) return;

    this._clearProps();

    const propTypes = [
      { geom: () => new THREE.CylinderGeometry(0.32, 0.32, 1.1, 16), color: 0x06b6d4, name: 'Canister' },
      { geom: () => new THREE.BoxGeometry(0.75, 0.75, 0.75), color: 0x8b5cf6, name: 'Core Cube' },
      { geom: () => new THREE.SphereGeometry(0.42, 24, 24), color: 0x10b981, name: 'Bio-Orb' },
      { geom: () => new THREE.ConeGeometry(0.4, 1.0, 16), color: 0xf59e0b, name: 'Resonator' },
      { geom: () => new THREE.TorusGeometry(0.38, 0.14, 16, 32), color: 0xec4899, name: 'Flux Ring' },
      { geom: () => new THREE.DodecahedronGeometry(0.48), color: 0x3b82f6, name: 'Crystalline' }
    ];

    let count;
    if (this.isPractice) {
      count = 4;
    } else {
      const minCount = Math.min(5, Math.max(4, 4 + Math.floor((this.level - 1) * 0.08)));
      const maxCount = Math.min(6, minCount + 1);
      count = Math.min(6, Math.round(minCount + ramp * (maxCount - minCount)));
    }

    this.anomalousIndex = Math.floor(Math.random() * count);

    // Pick a base prop type for this round
    const baseType = propTypes[Math.floor(Math.random() * propTypes.length)];

    for (let i = 0; i < count; i++) {
      const isAnomaly = (i === this.anomalousIndex);
      const angle = -Math.PI * 0.32 + (i / Math.max(1, count - 1)) * Math.PI * 0.64;
      const posX = Math.sin(angle) * 4.6;
      const posZ = -Math.cos(angle) * 3.0 + 0.8;
      const posY = 0.8;

      const pGroup = new THREE.Group();
      pGroup.position.set(posX, posY, posZ);

      // Pedestal stand
      const pedGeom = new THREE.CylinderGeometry(0.5, 0.6, 0.9, 24);
      const pedMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.3
      });
      const pedestal = new THREE.Mesh(pedGeom, pedMat);
      pedestal.position.y = -0.45;
      pGroup.add(pedestal);

      // Containment glass cylinder
      const tubeGeom = new THREE.CylinderGeometry(0.55, 0.55, 1.5, 24, 1, true);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.22,
        roughness: 0.1,
        metalness: 0.9
      });
      const tube = new THREE.Mesh(tubeGeom, tubeMat);
      tube.position.y = 0.45;
      pGroup.add(tube);

      // Specimen Mesh
      const pGeom = baseType.geom();
      // Anomaly mutation: size shift, hue shift, or inverted geometry
      let specimenColor = baseType.color;
      let scaleVal = 1.0;
      if (isAnomaly) {
        // High level = subtle difference, low level = obvious difference
        const diffMagnitude = Math.max(0.18, 0.45 - (this.level - 1) * 0.01);
        scaleVal = Math.random() > 0.5 ? (1.0 + diffMagnitude) : (1.0 - diffMagnitude * 0.8);
        specimenColor = (baseType.color ^ 0x001122); // subtle color variation
      }

      const pMat = new THREE.MeshStandardMaterial({
        color: specimenColor,
        roughness: 0.2,
        metalness: 0.7,
        emissive: specimenColor,
        emissiveIntensity: isAnomaly ? 0.4 : 0.15
      });
      const specimen = new THREE.Mesh(pGeom, pMat);
      specimen.position.y = 0.45;
      specimen.scale.set(scaleVal, scaleVal, scaleVal);
      pGroup.add(specimen);

      const propData = {
        index: i,
        isAnomaly,
        mesh: pGroup,
        specimen,
        mat: pMat,
        baseScale: scaleVal
      };
      pGroup.userData = propData;

      this.addObject(pGroup);
      this.props.push(propData);

      // Register with InputManager
      this.registerTarget(`prop_${i}`, specimen, {
        hitRadius: 1.3,
        key: String(i + 1),
        onHover: (hovered) => {
          if (hovered) {
            pMat.emissiveIntensity = 0.9;
          } else {
            pMat.emissiveIntensity = isAnomaly ? 0.4 : 0.15;
          }
        },
        onPress: () => {
          if (this.paused || this.finished || !this.roundActive) return;
          this._selectProp(propData);
        }
      });
    }

    if (this.isPractice) {
      EventBus.emit('hud:subtitle', {
        text: '🟢 PRACTICE: Inspect pods 1–4. Click the pod with the mutated scale/glow.'
      });
    } else {
      EventBus.emit('hud:subtitle', {
        text: `🔍 Round ${roundIndex} / ${this.totalRounds}: Isolate the anomalous containment specimen.`
      });
    }
  }

  teardownRound(correct, reason) {
    this._clearProps();
  }

  _clearProps() {
    for (const p of this.props) {
      if (this.inputManager) {
        this.inputManager.unregisterTarget(`prop_${p.index}`);
      }
      if (p.mesh && p.mesh.parent) {
        p.mesh.parent.remove(p.mesh);
      }
    }
    this.props = [];
  }

  _selectProp(selected) {
    if (!this.roundActive || this.finished) return;
    this.registerPlayerAction();

    if (selected.isAnomaly) {
      // Correct!
      SFXLib.playSuccess?.() || SFXLib.levelStart?.();
      Tween.to(selected.specimen.scale, {
        x: selected.baseScale * 1.5,
        y: selected.baseScale * 1.5,
        z: selected.baseScale * 1.5
      }, 0.25, 'easeOutBack').start();
      selected.mat.emissive.setHex(0x00ff88);
      selected.mat.emissiveIntensity = 2.2;

      EventBus.emit('hud:subtitle', { text: '✨ Anomaly isolated! Structural mutation logged.' });
      this.setTimeout(() => {
        this.endRound(true);
      }, 500);
    } else {
      // False positive
      SFXLib.playError?.();
      selected.mat.emissive.setHex(0xef4444);
      selected.mat.emissiveIntensity = 1.8;

      EventBus.emit('hud:subtitle', {
        text: `✗ False alarm: Pod #${selected.index + 1} is a nominal specimen.`
      });

      this.setTimeout(() => {
        this.endRound(false, `False alarm: Pod #${selected.index + 1} is nominal`);
      }, 650);
    }
  }

  _onPointerDown(e) {
    if (this.inputManager || this.paused || this.finished || !this.roundActive) return;

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

  botPlayRound(willWin = true) {
    if (!this.roundActive || this.finished) return;

    if (willWin && this.anomalousIndex >= 0 && this.props[this.anomalousIndex]) {
      this.setTimeout(() => {
        if (!this.finished && this.roundActive) {
          this._selectProp(this.props[this.anomalousIndex]);
        }
      }, 500);
    } else {
      // Click wrong nominal prop
      const wrong = (this.anomalousIndex + 1) % this.props.length;
      this.setTimeout(() => {
        if (!this.finished && this.roundActive && this.props[wrong]) {
          this._selectProp(this.props[wrong]);
        }
      }, 500);
    }
  }

  hint(type) {
    super.hint(type);
    const anomaly = this.props[this.anomalousIndex];
    if (!anomaly) return;

    if (type === 'reveal' || type === 'aria_clue') {
      Tween.to(anomaly.specimen.scale, {
        x: anomaly.baseScale * 1.35,
        y: anomaly.baseScale * 1.35,
        z: anomaly.baseScale * 1.35
      }, 0.35, 'easeInOutQuad')
        .onComplete(() => {
          Tween.to(anomaly.specimen.scale, {
            x: anomaly.baseScale,
            y: anomaly.baseScale,
            z: anomaly.baseScale
          }, 0.3).start();
        }).start();

      const quadrant = anomaly.mesh.position.x < 0 ? 'Left Chamber wing' : 'Right Chamber wing';
      EventBus.emit('hud:subtitle', { text: `🤖 ARIA: Anomaly signature detected in ${quadrant} (Pod #${anomaly.index + 1}).` });
    } else if (type === 'slow_time') {
      EventBus.emit('hud:subtitle', { text: '⏳ Specimen oscillation stabilized.' });
    }
  }

  update(dt) {
    super.update(dt);
    this._time += dt;
    // Animate specimens rotating
    for (const p of this.props) {
      if (p.specimen) {
        p.specimen.rotation.y += dt * (p.isAnomaly ? 1.4 : 0.6);
      }
    }
  }

  exit() {
    this._clearProps();
    super.exit();
  }
}
