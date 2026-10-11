/* ═══════════════════════════════════════════════════════════════
   FacilityBuilder.js
   Builds the central hub and 6 lab rooms with PBR materials,
   procedural canvas textures, sliding doors, and proximity checks.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

const HUB_RADIUS = 10;
const DOOR_PROXIMITY = 3.5;
const ROOM_DEPTH = 20;
const ROOM_WIDTH = 14;

/* ── Procedural canvas texture factory ──────────────────────── */
function makeGridTexture(size = 512, gridColor = '#0044aa', bgColor = '#000811') {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  const step = size / 16;
  for (let i = 0; i <= 16; i++) {
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
  }
  // Glow at grid intersections
  ctx.fillStyle = 'rgba(0,120,255,0.25)';
  for (let r = 0; r <= 16; r++) for (let c = 0; c <= 16; c++) {
    ctx.beginPath();
    ctx.arc(c * step, r * step, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function makeWallPanelTexture(label = '', accentHex = '#0077ff') {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 512;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#050a15';
  ctx.fillRect(0, 0, 256, 512);
  // Scanlines
  ctx.fillStyle = 'rgba(0,80,200,0.06)';
  for (let y = 0; y < 512; y += 4) ctx.fillRect(0, y, 256, 2);
  // Border
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 240, 496);
  // Label
  ctx.fillStyle = accentHex;
  ctx.font = 'bold 28px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, 128, 280);
  ctx.font = '16px monospace';
  ctx.fillStyle = 'rgba(150,200,255,0.7)';
  ctx.fillText('▶ ENTER', 128, 320);
  const tex = new THREE.CanvasTexture(cv);
  return tex;
}

export class FacilityBuilder {
  constructor(scene3d, labDefs) {
    this.scene    = scene3d.scene;
    this.labDefs  = labDefs;
    this._doors   = [];      // { mesh, labId, open, targetY }
    this._glowMats= [];      // door glow emissive materials
    this._group   = new THREE.Group();
    this.onDoorEnter = null;
    this.onDoorExit  = null;
    this._lastDoor   = null;
    this._doorOpen   = false;
  }

  build() {
    this.scene.add(this._group);
    this._buildHub();
    this.labDefs.forEach((def, i) => this._buildLab(def, i));
    this._addCeilingLights();
  }

  /* ── Central hub: cylinder floor + ring walls ────────────────── */
  _buildHub() {
    const floorTex = makeGridTexture(512, '#0055cc', '#000811');

    // Floor
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(HUB_RADIUS + 1, HUB_RADIUS + 1, 0.2, 32),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.4, metalness: 0.6 })
    );
    floor.rotation.y = Math.PI / 16;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this._group.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(
      new THREE.CylinderGeometry(HUB_RADIUS + 1, HUB_RADIUS + 1, 0.2, 32),
      new THREE.MeshStandardMaterial({ color: 0x050a15, roughness: 0.9 })
    );
    ceil.position.y = 5;
    this._group.add(ceil);

    // Ring walls (cylinder with hole cutouts handled via door gaps)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x08101f, roughness: 0.8, metalness: 0.3
    });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const wall  = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 5, 0.3),
        wallMat
      );
      const r = HUB_RADIUS;
      wall.position.set(Math.sin(angle) * r, 2.5, Math.cos(angle) * r);
      wall.rotation.y = -angle;
      this._group.add(wall);
    }

    // Central ARIA pedestal
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.7, 0.15, 16),
      new THREE.MeshStandardMaterial({ color: 0x003366, metalness: 0.8, roughness: 0.2,
        emissive: 0x0044aa, emissiveIntensity: 0.5 })
    );
    ped.position.y = 0.1;
    this._group.add(ped);
  }

  /* ── One corridor + room per lab ────────────────────────────── */
  _buildLab(def, idx) {
    const angle = def.angle;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x08101f, roughness: 0.8 });
    const floorTex = makeGridTexture(512, '#002266', '#000510');
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5, metalness: 0.5 });

    const group = new THREE.Group();
    // Position group at door opening on hub wall
    const dist = HUB_RADIUS;
    group.position.set(Math.sin(angle) * dist, 0, Math.cos(angle) * dist);
    group.rotation.y = -angle;
    this._group.add(group);

    // Corridor (connects hub to room)
    const corrW = 3, corrH = 4, corrD = 6;
    [[0, corrH/2, -corrD/2, corrW, corrH, corrD, floorMat, false]].forEach(
      ([x, y, z, w, h, d, mat, recv]) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        mesh.position.set(x, y, z);
        group.add(mesh);
      }
    );
    // Corridor floor
    const corrFloor = new THREE.Mesh(new THREE.BoxGeometry(corrW - 0.1, 0.1, corrD), floorMat);
    corrFloor.position.set(0, 0.05, -corrD / 2);
    corrFloor.receiveShadow = true;
    group.add(corrFloor);

    // Sliding door (slides up when player approaches)
    const doorGlowMat = new THREE.MeshStandardMaterial({
      color: 0x001133, emissive: 0x0077ff, emissiveIntensity: 1.5,
      metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.85
    });
    this._glowMats.push(doorGlowMat);

    const door = new THREE.Mesh(new THREE.BoxGeometry(corrW - 0.1, corrH, 0.12), doorGlowMat);
    door.position.set(0, corrH / 2, -0.1);
    door.castShadow = true;
    group.add(door);
    this._doors.push({ mesh: door, labId: def.id, group, open: false, targetY: corrH / 2 });

    // Room box
    const room = new THREE.Mesh(
      new THREE.BoxGeometry(ROOM_WIDTH, 5, ROOM_DEPTH),
      new THREE.MeshStandardMaterial({ color: 0x060c18, roughness: 0.9, side: THREE.BackSide })
    );
    room.position.set(0, 2.5, -corrD - ROOM_DEPTH / 2);
    this._group.add(group); // ensure group is added once
    group.add(room);

    // Room floor
    const roomFloor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_WIDTH, 0.1, ROOM_DEPTH), floorMat);
    roomFloor.position.set(0, 0.05, -corrD - ROOM_DEPTH / 2);
    roomFloor.receiveShadow = true;
    group.add(roomFloor);

    // Wall panel sign outside door
    const panelTex = makeWallPanelTexture(def.label, '#0077ff');
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 2.4),
      new THREE.MeshStandardMaterial({ map: panelTex, emissive: 0xffffff, emissiveIntensity: 0.3 })
    );
    panel.position.set(corrW / 2 + 0.5, 2, -0.2);
    group.add(panel);

    // Store world positions for collision/proximity
    def.worldCenter = new THREE.Vector3();
    group.getWorldPosition(def.worldCenter);
    def.doorWorldPos = new THREE.Vector3();
    door.getWorldPosition(def.doorWorldPos);
    def.angle = angle;
  }

  _addCeilingLights() {
    // 6 accent point lights in hub ring
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const light = new THREE.PointLight(0x0055ff, 0.8, 12);
      light.position.set(Math.sin(angle) * 7, 4.5, Math.cos(angle) * 7);
      light.castShadow = true;
      this.scene.add(light);
    }
  }

  /* ── Per-frame: animate sliding doors based on proximity ──── */
  checkDoorProximity(playerPos) {
    let nearId = null;
    let minDist = Infinity;

    for (const door of this._doors) {
      const wp = new THREE.Vector3();
      door.mesh.getWorldPosition(wp);
      const dist = playerPos.distanceTo(wp);
      if (dist < DOOR_PROXIMITY && dist < minDist) {
        minDist = dist;
        nearId = door.labId;
      }
    }

    if (nearId && nearId !== this._lastDoor) {
      this._lastDoor = nearId;
      this._openDoor(nearId);
      this.onDoorEnter?.(nearId);
    } else if (!nearId && this._lastDoor) {
      this._closeDoor(this._lastDoor);
      this.onDoorExit?.();
      this._lastDoor = null;
    }
  }

  _openDoor(labId) {
    const d = this._doors.find(d => d.labId === labId);
    if (d && !d.open) { d.open = true; d.targetY = d.mesh.geometry.parameters.height + 0.5; }
  }

  _closeDoor(labId) {
    const d = this._doors.find(d => d.labId === labId);
    if (d && d.open) { d.open = false; d.targetY = d.mesh.geometry.parameters.height / 2; }
  }

  update(delta) {
    for (const d of this._doors) {
      const curY = d.mesh.position.y;
      const tY   = d.open ? d.mesh.geometry.parameters.height + 0.5 : d.mesh.geometry.parameters.height / 2;
      d.mesh.position.y += (tY - curY) * Math.min(1, delta * 5);
    }
  }

  setDoorGlow(colorHex) {
    const c = new THREE.Color(colorHex);
    for (const mat of this._glowMats) {
      mat.emissive.copy(c);
    }
  }

  dispose() {
    this._group.traverse(obj => {
      obj.geometry?.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => { m.map?.dispose(); m.dispose(); });
      }
    });
    this.scene.remove(this._group);
  }
}
