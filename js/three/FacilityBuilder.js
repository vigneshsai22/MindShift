/* ═══════════════════════════════════════════════════════════════
   FacilityBuilder.js — Procedural 3D Research Facility & Hub
   Features:
   - Central Octagonal Hub with PBR floor and reflective accents
   - Central "Neural Core" crystalline monolith that upgrades with player level
   - 6 Sector Corridors with smooth sliding pneumatic doors
   - Proximity detection triggers door opening and EventBus cues
   - Procedural signage and sci-fi emission panels
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { EventBus } from '../core/EventBus.js';

const HUB_RADIUS = 10;
const DOOR_PROXIMITY = 3.6;
const ROOM_DEPTH = 22;
const ROOM_WIDTH = 14;

export class FacilityBuilder {
  constructor(scene3d, labDefs) {
    this.scene       = scene3d.scene;
    this.labDefs     = labDefs;
    this._doors      = [];
    this._glowMats   = [];
    this._group      = new THREE.Group();
    this.onDoorEnter = null;
    this.onDoorExit  = null;
    this._lastDoor   = null;
    this._neuralCore = null;
    this._coreLevel  = 1;
    this._time       = 0;
  }

  build() {
    this.scene.add(this._group);
    this._buildHub();
    this._buildNeuralCore();
    this.labDefs.forEach((def, i) => this._buildLabCorridor(def, i));
    this._addCeilingLighting();
  }

  _buildHub() {
    // 1. Hub Floor with Procedural Canvas Grid
    const cv = document.createElement('canvas');
    cv.width = cv.height = 512;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#030813';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#0044aa';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 512; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
    const floorTex = new THREE.CanvasTexture(cv);
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(4, 4);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(HUB_RADIUS + 1, HUB_RADIUS + 1, 0.2, 32),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35, metalness: 0.65 })
    );
    floor.position.y = 0;
    floor.receiveShadow = true;
    this._group.add(floor);

    // 2. Hub Ceiling
    const ceil = new THREE.Mesh(
      new THREE.CylinderGeometry(HUB_RADIUS + 1, HUB_RADIUS + 1, 0.2, 32),
      new THREE.MeshStandardMaterial({ color: 0x050b14, roughness: 0.9 })
    );
    ceil.position.y = 5.2;
    this._group.add(ceil);

    // 3. Peripheral Wall Segments
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x071120, roughness: 0.8, metalness: 0.4 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(3.6, 5.2, 0.3), wallMat);
      wall.position.set(Math.sin(angle) * HUB_RADIUS, 2.6, Math.cos(angle) * HUB_RADIUS);
      wall.rotation.y = -angle;
      this._group.add(wall);
    }
  }

  /* ── Upgrading Neural Core at Hub Center ── */
  _buildNeuralCore() {
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 2.2, 0);

    // Octahedron crystalline core
    const coreGeo = new THREE.OctahedronGeometry(0.85, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00aacc,
      emissiveIntensity: 1.8,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.88
    });
    this._coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(this._coreMesh);

    // Floating data ring
    const ringGeo = new THREE.TorusGeometry(1.4, 0.03, 12, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x00ffcc,
      emissiveIntensity: 2.2
    });
    this._coreRing = new THREE.Mesh(ringGeo, ringMat);
    this._coreRing.rotation.x = Math.PI / 2;
    coreGroup.add(this._coreRing);

    this._neuralCore = coreGroup;
    this._group.add(coreGroup);
  }

  setCoreLevel(lvl) {
    this._coreLevel = lvl;
    if (this._coreMesh) {
      const scale = 1.0 + (lvl - 1) * 0.15;
      this._coreMesh.scale.set(scale, scale, scale);
      if (lvl >= 3) {
        this._coreMesh.material.color.setHex(0xc084fc);
        this._coreMesh.material.emissive.setHex(0xa855f7);
      }
    }
  }

  _buildLabCorridor(def, idx) {
    const angle = def.angle;
    const group = new THREE.Group();
    group.position.set(Math.sin(angle) * HUB_RADIUS, 0, Math.cos(angle) * HUB_RADIUS);
    group.rotation.y = -angle;
    this._group.add(group);

    const corrW = 3.2, corrH = 4.2, corrD = 6;
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x040914, roughness: 0.5, metalness: 0.5 });
    const wallMat  = new THREE.MeshStandardMaterial({ color: 0x081324, roughness: 0.8 });

    // Corridor Floor
    const corrFloor = new THREE.Mesh(new THREE.BoxGeometry(corrW, 0.1, corrD), floorMat);
    corrFloor.position.set(0, 0.05, -corrD / 2);
    corrFloor.receiveShadow = true;
    group.add(corrFloor);

    // Sliding Pneumatic Door
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x001a33,
      emissive: 0x0077ff,
      emissiveIntensity: 1.5,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85
    });
    this._glowMats.push(doorMat);

    const door = new THREE.Mesh(new THREE.BoxGeometry(corrW - 0.1, corrH, 0.14), doorMat);
    door.position.set(0, corrH / 2, -0.1);
    group.add(door);

    this._doors.push({
      mesh: door,
      labId: def.id,
      group,
      angle,
      open: false,
      currentY: corrH / 2,
      targetY: corrH / 2,
      openY: corrH * 1.45,
      closedY: corrH / 2
    });

    // Room enclosure
    const room = new THREE.Mesh(
      new THREE.BoxGeometry(ROOM_WIDTH, 5.2, ROOM_DEPTH),
      new THREE.MeshStandardMaterial({ color: 0x050c18, roughness: 0.9, side: THREE.BackSide })
    );
    room.position.set(0, 2.6, -corrD - ROOM_DEPTH / 2);
    group.add(room);

    // Room Floor
    const roomFloor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_WIDTH, 0.1, ROOM_DEPTH), floorMat);
    roomFloor.position.set(0, 0.05, -corrD - ROOM_DEPTH / 2);
    roomFloor.receiveShadow = true;
    group.add(roomFloor);

    // Holographic sector sign
    const signCv = document.createElement('canvas');
    signCv.width = 256; signCv.height = 128;
    const sCtx = signCv.getContext('2d');
    sCtx.fillStyle = '#030813';
    sCtx.fillRect(0, 0, 256, 128);
    sCtx.strokeStyle = '#00e5ff';
    sCtx.lineWidth = 3;
    sCtx.strokeRect(4, 4, 248, 120);
    sCtx.fillStyle = '#00e5ff';
    sCtx.font = 'bold 22px "JetBrains Mono", monospace';
    sCtx.textAlign = 'center';
    sCtx.fillText(def.label.toUpperCase(), 128, 55);
    sCtx.font = '14px monospace';
    sCtx.fillStyle = '#94a3b8';
    sCtx.fillText('SECTOR GATEWAY', 128, 90);

    const signTex = new THREE.CanvasTexture(signCv);
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.8),
      new THREE.MeshStandardMaterial({ map: signTex, emissive: 0x00aacc, emissiveIntensity: 0.6 })
    );
    signMesh.position.set(0, 3.4, -0.2);
    group.add(signMesh);
  }

  _addCeilingLighting() {
    const hubLight = new THREE.PointLight(0x00e5ff, 1.8, 18);
    hubLight.position.set(0, 4.5, 0);
    this._group.add(hubLight);
  }

  checkDoorProximity(playerPos) {
    let nearestDoor = null;
    let minDist = Infinity;

    for (const d of this._doors) {
      const doorWorldPos = new THREE.Vector3();
      d.mesh.getWorldPosition(doorWorldPos);
      const dist = playerPos.distanceTo(doorWorldPos);

      if (dist < DOOR_PROXIMITY && dist < minDist) {
        minDist = dist;
        nearestDoor = d;
      }
    }

    if (nearestDoor && !nearestDoor.open) {
      nearestDoor.open = true;
      nearestDoor.targetY = nearestDoor.openY;
      EventBus.emit('player:interact_prompt', { show: true, text: `ENTER ${nearestDoor.labId.toUpperCase()}` });
      if (this.onDoorEnter && this._lastDoor !== nearestDoor.labId) {
        this._lastDoor = nearestDoor.labId;
        this.onDoorEnter(nearestDoor.labId);
      }
    } else if (!nearestDoor && this._lastDoor) {
      for (const d of this._doors) {
        if (d.open) {
          d.open = false;
          d.targetY = d.closedY;
        }
      }
      EventBus.emit('player:interact_prompt', { show: false });
      this._lastDoor = null;
      if (this.onDoorExit) this.onDoorExit();
    }
  }

  setDoorGlow(hexColor) {
    this._glowMats.forEach(m => {
      m.emissive.setHex(hexColor);
    });
  }

  update(delta) {
    this._time += delta;

    // Neural Core levitation & rotation
    if (this._neuralCore) {
      this._neuralCore.rotation.y += delta * 0.6;
      this._neuralCore.position.y = 2.2 + Math.sin(this._time * 1.8) * 0.12;
      if (this._coreRing) {
        this._coreRing.rotation.z -= delta * 1.2;
      }
    }

    // Smooth door animation
    for (const d of this._doors) {
      d.currentY += (d.targetY - d.currentY) * Math.min(1, delta * 8);
      d.mesh.position.y = d.currentY;
    }
  }

  dispose() {
    this._group.traverse(obj => {
      obj.geometry?.dispose();
      obj.material?.dispose();
    });
    this.scene.remove(this._group);
  }
}
