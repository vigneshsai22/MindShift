/* ═══════════════════════════════════════════════════════════════
   PlayerController.js — First-person locomotion & interaction controller
   Features:
   - WASD movement with smooth acceleration/friction
   - Pointer-lock mouse look with smooth damping
   - Pointer-lock center-screen raycasting (Pitfall safe: pointer lock
     freezes clientX/clientY, so raycast is computed from NDC (0,0))
   - Touch/drag fallback for non-pointer-lock environments
   - Subtle head-bob when walking
   - Footstep pulse dispatched through EventBus ('player:step')
   - AABB room and corridor boundary collision
   - Interaction keybind ('KeyE', 'Space', or pointer click)
   - Clean event listener cleanup on dispose()
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { EventBus } from '../core/EventBus.js';
import { CONFIG } from '../core/Config.js';

const SPEED = 5.2;          // units/sec
const SPRINT_MULT = 1.45;
const EYE_HEIGHT = 1.7;
const BOB_FREQ = 10.0;
const BOB_AMP = 0.045;

export class PlayerController {
  constructor(canvas, camera, facility = null) {
    this.canvas   = canvas;
    this.camera   = camera;
    this.facility = facility;

    this._keys        = {};
    this._euler       = new THREE.Euler(0, 0, 0, 'YXZ');
    this._velocity    = new THREE.Vector3();
    this._enabled     = false;
    this._isLocked    = false;
    this._sensitivity = 0.0022;

    // Head bob & footsteps
    this._bobTimer    = 0;
    this._stepTimer   = 0;
    this._stepInterval = 0.42; // seconds per footstep

    // Raycasting
    this._raycaster   = new THREE.Raycaster();
    this._centerNDC   = new THREE.Vector2(0, 0); // Always center for pointer lock

    // Drag fallback
    this._isDragging  = false;
    this._lastPointerX = 0;
    this._lastPointerY = 0;

    // Event bindings
    this._onKeyDown     = this._onKeyDown.bind(this);
    this._onKeyUp       = this._onKeyUp.bind(this);
    this._onMouseMove   = this._onMouseMove.bind(this);
    this._onLockChange  = this._onLockChange.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp   = this._onPointerUp.bind(this);
    this._onClick       = this._onClick.bind(this);
    this._requestLock   = this._requestLock.bind(this);
  }

  init() {
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup',   this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onLockChange);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointerup', this._onPointerUp);
    this.canvas.addEventListener('click', this._onClick);
  }

  enable() {
    this._enabled = true;
    this.canvas.addEventListener('click', this._requestLock, { once: true });
  }

  disable() {
    this._enabled = false;
    this._isDragging = false;
    this._keys = {};
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock?.();
    }
  }

  dispose() {
    this.disable();
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup',   this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onLockChange);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointerup', this._onPointerUp);
    this.canvas.removeEventListener('click', this._onClick);
    this.canvas.removeEventListener('click', this._requestLock);
  }

  // ── Raycasting Helper (Always from center screen when locked) ──
  getCenterRaycaster() {
    this._raycaster.setFromCamera(this._centerNDC, this.camera);
    return this._raycaster;
  }

  raycastObjects(objects, recursive = true) {
    const ray = this.getCenterRaycaster();
    return ray.intersectObjects(objects, recursive);
  }

  update(delta) {
    if (!this._enabled) return;
    if (delta > 0.1) delta = 0.1; // clamp delta lag

    const forward = new THREE.Vector3();
    const right   = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, THREE.Object3D.DEFAULT_UP).normalize();

    const isSprint = this._keys['ShiftLeft'] || this._keys['ShiftRight'];
    const curSpeed = SPEED * (isSprint ? SPRINT_MULT : 1.0);

    const inputMove = new THREE.Vector3();
    if (this._keys['KeyW'] || this._keys['ArrowUp'])    inputMove.addScaledVector(forward,  1);
    if (this._keys['KeyS'] || this._keys['ArrowDown'])  inputMove.addScaledVector(forward, -1);
    if (this._keys['KeyA'] || this._keys['ArrowLeft'])  inputMove.addScaledVector(right,   -1);
    if (this._keys['KeyD'] || this._keys['ArrowRight']) inputMove.addScaledVector(right,    1);

    const isMoving = inputMove.lengthSq() > 0.001;

    if (isMoving) {
      inputMove.normalize().multiplyScalar(curSpeed);
      this._velocity.lerp(inputMove, Math.min(1, delta * 12));

      // Head bob & footsteps
      this._bobTimer += delta * BOB_FREQ * (isSprint ? 1.3 : 1.0);
      this._stepTimer += delta;
      if (this._stepTimer >= (isSprint ? this._stepInterval * 0.75 : this._stepInterval)) {
        this._stepTimer = 0;
        EventBus.emit('player:step', { position: this.camera.position.clone(), sprint: isSprint });
      }
    } else {
      this._velocity.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, delta * 14));
      this._bobTimer = 0;
    }

    // Apply translation
    if (this._velocity.lengthSq() > 0.0001) {
      const step = this._velocity.clone().multiplyScalar(delta);
      const nextPos = this.camera.position.clone().add(step);

      // Facility boundary / collision check
      const clamped = this._resolveCollision(nextPos);
      this.camera.position.x = clamped.x;
      this.camera.position.z = clamped.z;
    }

    // Subtle head bob
    const bobOffset = Math.sin(this._bobTimer) * BOB_AMP;
    this.camera.position.y = EYE_HEIGHT + bobOffset;
  }

  _resolveCollision(pos) {
    // Facility perimeter bounding box
    const minX = -42, maxX = 42;
    const minZ = -42, maxZ = 42;

    pos.x = Math.max(minX, Math.min(maxX, pos.x));
    pos.z = Math.max(minZ, Math.min(maxZ, pos.z));

    // If facility has custom room colliders, test them
    if (this.facility && typeof this.facility.collide === 'function') {
      return this.facility.collide(pos);
    }
    return pos;
  }

  _onKeyDown(e) {
    if (!this._enabled) return;
    this._keys[e.code] = true;

    // Interaction key (E or Space)
    if (e.code === 'KeyE' || e.code === 'Space') {
      this._triggerInteract();
    }
  }

  _onKeyUp(e) {
    this._keys[e.code] = false;
  }

  _onMouseMove(e) {
    if (!this._enabled) return;
    let dx = 0, dy = 0;

    if (this._isLocked) {
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
    this._euler.x = Math.max(-Math.PI * 0.46, Math.min(Math.PI * 0.46, this._euler.x));
    this.camera.quaternion.setFromEuler(this._euler);
  }

  _onPointerDown(e) {
    if (!this._enabled || this._isLocked) return;
    this._isDragging = true;
    this._lastPointerX = e.clientX;
    this._lastPointerY = e.clientY;
  }

  _onPointerUp() {
    this._isDragging = false;
  }

  _onLockChange() {
    this._isLocked = (document.pointerLockElement === this.canvas);
    EventBus.emit('player:lockchange', { locked: this._isLocked });
  }

  _requestLock() {
    if (!this._enabled || this._isLocked) return;
    this.canvas.requestPointerLock?.().catch(() => {});
  }

  _onClick() {
    if (!this._enabled) return;
    this._triggerInteract();
  }

  _triggerInteract() {
    EventBus.emit('player:interact', {
      position: this.camera.position.clone(),
      raycaster: this.getCenterRaycaster()
    });
  }
}
