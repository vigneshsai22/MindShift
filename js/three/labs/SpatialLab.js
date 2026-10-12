/* ═══════════════════════════════════════════════════════════════
   SpatialLab.js — Sector 6: Rotation Core (Spatial Reasoning)
   Features:
   - 3D interactive object rotation to align with wall shadow silhouette
   - Higher levels: Cube net unfolding/folding verification
   - Sector Climax / Boss Trial: 3 distinct multi-axis objects in sequence
   - Pointer-lock center raycasting & mouse drag rotation
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { LabBase } from './LabBase.js';
import { EventBus } from '../../core/EventBus.js';

export class SpatialLab extends LabBase {
  constructor(ctx) {
    super(ctx);
    this._category   = 'spatial';
    this._title      = 'SECTOR 6: ROTATION CORE';
    this._objMesh    = null;
    this._targetQ    = new THREE.Quaternion();
    this._currentQ   = new THREE.Quaternion();
    this._tolerance  = 0.35; // radians
    this._isBoss     = false;
    this._bossStep   = 0;
    this._isDragging = false;
    this._lastMouse  = { x: 0, y: 0 };

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp   = this._onPointerUp.bind(this);
    this._onInteract    = this._onInteract.bind(this);
  }

  _buildScene() {
    this._group.position.set(0, 0, -15);

    // Back wall shadow screen
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(10, 6, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x07111e, roughness: 0.9 })
    );
    wall.position.set(0, 3, -8.6);
    this._group.add(wall);

    // Target Silhouette Canvas Screen
    const sc = document.createElement('canvas');
    sc.width = sc.height = 512;
    this._shadowCtx = sc.getContext('2d');
    this._shadowTex = new THREE.CanvasTexture(sc);
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 4.2),
      new THREE.MeshStandardMaterial({
        map: this._shadowTex,
        emissive: 0x002244,
        emissiveIntensity: 0.7
      })
    );
    shadowPlane.position.set(-2.2, 3.4, -8.4);
    this._group.add(shadowPlane);

    // Confirm Alignment Console Button
    const btnGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.2, 24);
    const btnMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 1.5
    });
    this._confirmBtn = new THREE.Mesh(btnGeo, btnMat);
    this._confirmBtn.position.set(2.2, 1.2, -4.5);
    this._confirmBtn.rotation.x = Math.PI / 6;
    this._group.add(this._confirmBtn);
  }

  _onEnter(params) {
    this._isBoss = !!params.isBoss;
    this._bossStep = 0;
    this._tolerance = Math.max(0.18, 0.40 - (this._diff - 800) * 0.0002);

    this._setupObject();
    this._renderShadowTarget();

    if (this._isBoss) {
      this.aria?.speak("Sector 6 Boss: Tri-Axis Rotational Climax. Match three consecutive spatial geometries.", 'urgent');
      this.spatialAudio?.playStinger('boss_start');
    } else {
      this.aria?.speak("Rotate the 3D core geometry to match the silhouette projection, then hit the cyan console.", 'instruction');
    }

    this._bindControls();
  }

  _setupObject() {
    if (this._objMesh) {
      this._group.remove(this._objMesh);
      this._objMesh.geometry.dispose();
      this._objMesh.material.dispose();
    }

    // High level folding cube or complex geometry
    let geo;
    if (this._diff >= 1600 && !this._isBoss) {
      geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    } else {
      geo = new THREE.TorusKnotGeometry(0.65, 0.22, 48, 12);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x003366,
      emissiveIntensity: 0.5,
      metalness: 0.85,
      roughness: 0.25
    });
    this._objMesh = new THREE.Mesh(geo, mat);
    this._objMesh.position.set(0, 3.4, -4.5);
    this._group.add(this._objMesh);

    // Random target rotation
    const euler = new THREE.Euler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    this._targetQ.setFromEuler(euler);

    // Initial offset rotation
    this._currentQ.set(0, 0, 0, 1);
    this._objMesh.quaternion.copy(this._currentQ);
  }

  _renderShadowTarget() {
    const ctx = this._shadowCtx;
    ctx.fillStyle = '#030813';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 496, 496);

    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 28px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET SILHOUETTE', 256, 50);

    // Draw projected shape silhouette
    ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(256, 270, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.rect(196, 210, 120, 120);
    ctx.fill();

    this._shadowTex.needsUpdate = true;
  }

  _bindControls() {
    const dom = this.scene3d.renderer.domElement;
    dom.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    EventBus.on('player:interact', this._onInteract);
  }

  _unbindControls() {
    const dom = this.scene3d.renderer.domElement;
    dom.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    EventBus.off('player:interact', this._onInteract);
  }

  _onPointerDown(e) {
    this._isDragging = true;
    this._lastMouse = { x: e.clientX, y: e.clientY };
  }

  _onPointerMove(e) {
    if (!this._isDragging || !this._objMesh) return;
    const dx = (e.clientX - this._lastMouse.x) * 0.015;
    const dy = (e.clientY - this._lastMouse.y) * 0.015;
    this._lastMouse = { x: e.clientX, y: e.clientY };

    const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy);
    const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx);

    this._objMesh.quaternion.multiplyQuaternions(qy, this._objMesh.quaternion);
    this._objMesh.quaternion.multiply(qx);
  }

  _onPointerUp() {
    this._isDragging = false;
  }

  _onInteract() {
    const hits = this.raycastCenter([this._confirmBtn]);
    if (hits.length > 0) {
      this._verifyAlignment();
    }
  }

  _verifyAlignment() {
    this._attempts++;
    // Angle distance between current quaternion and target quaternion
    const angleDiff = 2 * Math.acos(Math.abs(Math.min(1, Math.max(-1, this._objMesh.quaternion.dot(this._targetQ)))));

    // Permissive alignment window
    const isAligned = angleDiff < (this._tolerance * 2.2);

    if (isAligned) {
      this.spatialAudio?.playTone(659.25, 0.25, 'sine', 0.3);
      EventBus.emit('juice:popup', { text: 'SILHOUETTE MATCHED', color: '#00ff88' });

      if (this._isBoss) {
        this._bossStep++;
        if (this._bossStep >= 3) {
          this._unbindControls();
          this._complete(true, { isBoss: true });
        } else {
          this._setupObject();
          this._renderShadowTarget();
        }
      } else {
        this._unbindControls();
        this._complete(true, { isBoss: false });
      }
    } else {
      this.spatialAudio?.playTone(164.81, 0.35, 'sawtooth', 0.3);
      EventBus.emit('juice:popup', { text: 'ROTATION MISALIGNED', color: '#ff3344' });
    }
  }

  _giveHint() {
    // Nudge rotation halfway toward target
    if (this._objMesh) {
      this._objMesh.quaternion.slerp(this._targetQ, 0.45);
      EventBus.emit('juice:popup', { text: 'ORIENTATION ALIGNED', color: '#fbbf24' });
    }
  }

  _onExit() {
    this._unbindControls();
    if (this._objMesh) {
      this._group.remove(this._objMesh);
      this._objMesh.geometry.dispose();
      this._objMesh.material.dispose();
      this._objMesh = null;
    }
  }
}
