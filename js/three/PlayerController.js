/* ═══════════════════════════════════════════════════════════════
   PlayerController.js
   WASD movement + pointer-lock mouse look + click-to-interact fallback.
   Simple AABB collision using room boundary boxes.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

const SPEED   = 5;    // units/sec
const GRAVITY = 0;    // no gravity needed for first-person lab
const EYE_H   = 1.7;

export class PlayerController {
  constructor(canvas, camera, facility) {
    this.canvas   = canvas;
    this.camera   = camera;
    this.facility = facility;

    this._keys    = {};
    this._euler   = new THREE.Euler(0, 0, 0, 'YXZ');
    this._vel     = new THREE.Vector3();
    this._enabled = false;
    this._locked  = false;

    this._sensitivity = 0.002;

    this._onKey      = this._onKey.bind(this);
    this._onMouse    = this._onMouse.bind(this);
    this._onLockChange = this._onLockChange.bind(this);
    this._isDragging = false;
    this._lastPointerX = 0;
    this._lastPointerY = 0;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp   = this._onPointerUp.bind(this);
  }

  init() {
    document.addEventListener('keydown', this._onKey);
    document.addEventListener('keyup',   this._onKey);
    document.addEventListener('mousemove', this._onMouse);
    document.addEventListener('pointerlockchange', this._onLockChange);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointerup', this._onPointerUp);
    this.canvas.addEventListener('click', this._onClick);
  }

  enable() {
    this._enabled = true;
    // Request pointer lock on next click
    this.canvas.addEventListener('click', this._requestLock = () => {
      this.canvas.requestPointerLock?.().catch(() => {});
      this.canvas.removeEventListener('click', this._requestLock);
    }, { once: true });
  }

  disable() {
    this._enabled = false;
    this._isDragging = false;
    document.exitPointerLock?.();
  }

  dispose() {
    document.removeEventListener('keydown', this._onKey);
    document.removeEventListener('keyup',   this._onKey);
    document.removeEventListener('mousemove', this._onMouse);
    document.removeEventListener('pointerlockchange', this._onLockChange);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointerup', this._onPointerUp);
    this.canvas.removeEventListener('click', this._onClick);
    document.exitPointerLock?.();
  }

  update(delta) {
    if (!this._enabled) return;

    const forward = new THREE.Vector3();
    const right   = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    right.crossVectors(forward, THREE.Object3D.DEFAULT_UP).normalize();

    const move = new THREE.Vector3();
    if (this._keys['KeyW'] || this._keys['ArrowUp'])    move.addScaledVector(forward,  1);
    if (this._keys['KeyS'] || this._keys['ArrowDown'])  move.addScaledVector(forward, -1);
    if (this._keys['KeyA'] || this._keys['ArrowLeft'])  move.addScaledVector(right,   -1);
    if (this._keys['KeyD'] || this._keys['ArrowRight']) move.addScaledVector(right,    1);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(SPEED * delta);
      const next = this.camera.position.clone().add(move);
      next.y = EYE_H;  // keep eye height constant
      // Simple boundary check — keep player inside 50×50 world
      next.x = Math.max(-45, Math.min(45, next.x));
      next.z = Math.max(-45, Math.min(45, next.z));
      this.camera.position.copy(next);
    }

    this.camera.position.y = EYE_H;
  }

  _onKey(e) {
    this._keys[e.code] = e.type === 'keydown';
  }

  _onPointerDown(e) {
    if (!this._enabled || this._locked) return;
    this._isDragging = true;
    this._lastPointerX = e.clientX;
    this._lastPointerY = e.clientY;
  }

  _onPointerUp() {
    this._isDragging = false;
  }

  _onMouse(e) {
    if (!this._enabled) return;
    let dx = 0, dy = 0;
    if (this._locked) {
      dx = e.movementX;
      dy = e.movementY;
    } else if (this._isDragging) {
      dx = e.clientX - this._lastPointerX;
      dy = e.clientY - this._lastPointerY;
      this._lastPointerX = e.clientX;
      this._lastPointerY = e.clientY;
    } else {
      return;
    }

    this._euler.setFromQuaternion(this.camera.quaternion);
    this._euler.y -= dx * this._sensitivity;
    this._euler.x -= dy * this._sensitivity;
    this._euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this._euler.x));
    this.camera.quaternion.setFromEuler(this._euler);
  }

  _onLockChange() {
    this._locked = document.pointerLockElement === this.canvas;
  }

  _onClick() {
    if (!this._enabled) return;
  }

  _requestLock() {
    this.canvas.requestPointerLock?.().catch(() => {});
  }
}
