/* ═══════════════════════════════════════════════════════════════
   SpatialLab.js
   Drag/rotate a 3D object to match the target silhouette projected
   on the back wall. Tolerance tightens with difficulty.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { LabBase } from './LabBase.js';

const SHAPES = [
  { name:'cube',    geo:() => new THREE.BoxGeometry(1.2,1.2,1.2) },
  { name:'L-block', geo:() => {
    const g = new THREE.BufferGeometry();
    // Simple L via merged boxes (use BoxGeometry as proxy)
    return new THREE.BoxGeometry(0.6,1.8,0.6);
  }},
  { name:'T-block', geo:() => new THREE.CylinderGeometry(0.7,0.7,1,3) }, // triangle prism approximation
  { name:'diamond', geo:() => new THREE.OctahedronGeometry(0.8) },
  { name:'cone',    geo:() => new THREE.ConeGeometry(0.7,1.5,8) },
];

export class SpatialLab extends LabBase {
  constructor(ctx) {
    super(ctx);
    this._category = 'spatial'; // maps to IQ spatial
    this._obj      = null;
    this._targetQ  = new THREE.Quaternion();
    this._isDragging = false;
    this._lastMouse  = { x: 0, y: 0 };
    this._tolerance  = 20; // degrees, decreases with difficulty
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp   = this._onPointerUp.bind(this);
    this._onCheck       = null;
  }

  _buildScene() {
    this._group.position.set(0, 0, -15);

    // Shadow/silhouette wall
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x06101a, roughness: 0.9 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 0.15), wallMat);
    wall.position.set(0, 3, -8.5);
    this._group.add(wall);

    // Target silhouette display (drawn on canvas)
    const tc = document.createElement('canvas');
    tc.width = tc.height = 512;
    this._targetCtx = tc.getContext('2d');
    this._targetTex = new THREE.CanvasTexture(tc);
    const tp = new THREE.Mesh(new THREE.PlaneGeometry(4, 4),
      new THREE.MeshStandardMaterial({ map: this._targetTex, emissive: 0x002244, emissiveIntensity: 0.5 }));
    tp.position.set(-2, 3.5, -8.4);
    this._group.add(tp);

    // Label
    const lc = document.createElement('canvas');
    lc.width = 512; lc.height = 80;
    const lctx = lc.getContext('2d');
    lctx.fillStyle = '#000'; lctx.fillRect(0,0,512,80);
    lctx.fillStyle = '#44aaff';
    lctx.font = 'bold 28px monospace';
    lctx.textAlign = 'center';
    lctx.fillText('Rotate to match the target shadow →', 256, 55);
    const lTex = new THREE.CanvasTexture(lc);
    const lp = new THREE.Mesh(new THREE.PlaneGeometry(7,1.1),
      new THREE.MeshStandardMaterial({ map: lTex, emissive: 0x001122, emissiveIntensity:0.4 }));
    lp.position.set(0, 5.5, -8.4);
    this._group.add(lp);

    // Check button
    const bc = document.createElement('canvas');
    bc.width = 256; bc.height = 80;
    const bctx = bc.getContext('2d');
    bctx.fillStyle = '#002244'; bctx.fillRect(0,0,256,80);
    bctx.fillStyle = '#44ccff';
    bctx.font = 'bold 32px monospace';
    bctx.textAlign = 'center';
    bctx.fillText('✓ CHECK MATCH', 128, 52);
    const bTex = new THREE.CanvasTexture(bc);
    const bp = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.9),
      new THREE.MeshStandardMaterial({ map: bTex, emissive: 0x004488, emissiveIntensity: 0.8 }));
    bp.position.set(3, 1.2, -8.4);
    bp.userData = { checkBtn: true };
    this._group.add(bp);
    this._checkBtn = bp;

    // Overhead light
    const l = new THREE.PointLight(0x4488cc, 1.5, 20);
    l.position.set(0, 6, -5);
    this._group.add(l);
  }

  _onEnter(diff) {
    // Tolerance shrinks with difficulty
    this._tolerance = 35 - diff * 5;

    // Pick random shape
    const shapeDef = SHAPES[Math.floor(Math.random() * SHAPES.length)];

    // Remove old object
    if (this._obj) { this._obj.geometry?.dispose(); this._obj.material?.dispose(); this._group.remove(this._obj); }

    // Create manipulable object
    const mat = new THREE.MeshStandardMaterial({ color: 0x2288ff, roughness: 0.3, metalness: 0.6,
      emissive: 0x001133, emissiveIntensity: 0.4 });
    this._obj = new THREE.Mesh(shapeDef.geo(), mat);
    this._obj.position.set(2, 2.5, -5);
    this._obj.castShadow = true;
    this._group.add(this._obj);

    // Random target rotation
    this._targetQ.setFromEuler(new THREE.Euler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    ));

    // Draw silhouette on canvas
    this._drawSilhouette(shapeDef.name, this._targetQ);

    this.aria?.speak('Rotate the glowing object to match the shadow on the wall, then press Check Match.', 'instruction');

    const dom = this.scene3d.renderer.domElement;
    dom.addEventListener('pointerdown', this._onPointerDown);
    dom.addEventListener('pointermove', this._onPointerMove);
    dom.addEventListener('pointerup',   this._onPointerUp);

    this._clickHandler = (e) => {
      const rect  = dom.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(mouse, this.scene3d.camera);
      if (ray.intersectObject(this._checkBtn).length) this._checkMatch();
    };
    dom.addEventListener('click', this._clickHandler);
  }

  _drawSilhouette(shapeName, quaternion) {
    const ctx = this._targetCtx;
    ctx.clearRect(0, 0, 512, 512);
    ctx.fillStyle = '#020d1a';
    ctx.fillRect(0, 0, 512, 512);

    // Use a simple 2D projection of the shape outline
    ctx.save();
    ctx.translate(256, 256);
    ctx.fillStyle = 'rgba(0,180,255,0.15)';
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 4;

    const e = new THREE.Euler().setFromQuaternion(quaternion);
    ctx.rotate(e.y);
    const scale = 120 + Math.cos(e.x) * 40;

    if (shapeName === 'cube') {
      ctx.beginPath();
      ctx.rect(-scale/2, -scale/2, scale, scale);
    } else if (shapeName === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(0, -scale/1.4);
      ctx.lineTo(scale/1.4, 0);
      ctx.lineTo(0, scale/1.4);
      ctx.lineTo(-scale/1.4, 0);
      ctx.closePath();
    } else {
      // Generic ellipse for others
      ctx.beginPath();
      ctx.ellipse(0, 0, scale/2, scale*0.7, 0, 0, Math.PI*2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Label
    ctx.fillStyle = '#006688';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET', 256, 30);
    this._targetTex.needsUpdate = true;
  }

  _onPointerDown(e) {
    this._isDragging = true;
    this._lastMouse  = { x: e.clientX, y: e.clientY };
  }
  _onPointerMove(e) {
    if (!this._isDragging || !this._obj) return;
    const dx = (e.clientX - this._lastMouse.x) * 0.01;
    const dy = (e.clientY - this._lastMouse.y) * 0.01;
    this._obj.rotation.y += dx;
    this._obj.rotation.x += dy;
    this._lastMouse = { x: e.clientX, y: e.clientY };
  }
  _onPointerUp() { this._isDragging = false; }

  _checkMatch() {
    if (!this._obj) return;
    // Compare quaternions — angle between them
    const cur  = new THREE.Quaternion().setFromEuler(this._obj.rotation);
    const diff = this._targetQ.angleTo(cur) * (180 / Math.PI);
    const correct = diff <= this._tolerance || (180 - diff) <= this._tolerance;
    this._attempts++;
    this._cleanup();
    this._complete(correct, this._attempts);
  }

  _cleanup() {
    const dom = this.scene3d.renderer.domElement;
    dom.removeEventListener('pointerdown', this._onPointerDown);
    dom.removeEventListener('pointermove', this._onPointerMove);
    dom.removeEventListener('pointerup',   this._onPointerUp);
    if (this._clickHandler) { dom.removeEventListener('click', this._clickHandler); this._clickHandler = null; }
  }

  _onExit() { this._cleanup(); this._isDragging = false; }

  _render(delta) {
    if (this._obj && !this._isDragging) {
      this._obj.position.y = 2.5 + Math.sin(Date.now() * 0.002) * 0.1; // hover
    }
  }

  _giveHint() {
    // Snap 30% closer to target rotation
    if (!this._obj) return;
    const cur = new THREE.Quaternion().setFromEuler(this._obj.rotation);
    cur.slerp(this._targetQ, 0.3);
    this._obj.rotation.setFromQuaternion(cur);
  }
}
