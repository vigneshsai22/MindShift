/* ═══════════════════════════════════════════════════════════════
   CameraRig.js — Cinematic camera controller with shake, FOV
   punch, slow motion, and smooth transitions.
   ═══════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { Config } from '../core/Config.js';

export class CameraRig {
  /**
   * @param {THREE.PerspectiveCamera} camera
   */
  constructor(camera) {
    this.camera   = camera;
    this._baseFOV = camera.fov;
    this._targetFOV = camera.fov;
    this._shakeIntensity = 0;
    this._shakeDecay = 4.0;
    this._shakeOffset = new THREE.Vector3();
    this._basePosition = new THREE.Vector3();
    this._slowMo = 1.0;  // time scale multiplier
    this._slowMoTarget = 1.0;
    this._lookTarget = null;
    this._transitionSpeed = 2.0;
  }

  /**
   * Shake the camera.
   * @param {number} intensity - shake magnitude
   * @param {number} [decay=4.0] - decay rate
   */
  shake(intensity = 0.15, decay = 4.0) {
    this._shakeIntensity = intensity;
    this._shakeDecay = decay;
  }

  /**
   * FOV punch effect (e.g., on correct answer or boss clear).
   * @param {number} targetFOV
   * @param {number} [returnSpeed=3.0] - how fast to return to base FOV
   */
  fovPunch(targetFOV = 82, returnSpeed = 3.0) {
    this._targetFOV = targetFOV;
    this._transitionSpeed = returnSpeed;
  }

  /** Reset FOV to base */
  resetFOV() {
    this._targetFOV = this._baseFOV;
  }

  /**
   * Enter slow motion.
   * @param {number} scale - time scale (0.3 = 30% speed)
   * @param {number} duration - seconds of real time
   */
  slowMotion(scale = 0.3, duration = 1.0) {
    this._slowMo = scale;
    this._slowMoTarget = 1.0;
    // Auto-restore after duration
    setTimeout(() => {
      this._slowMoTarget = 1.0;
    }, duration * 1000);
  }

  /** Get the current time scale */
  get timeScale() { return this._slowMo; }

  /** Save current position as the base position */
  saveBase() {
    this._basePosition.copy(this.camera.position);
  }

  /** Set a target to look at (smoothly) */
  lookAt(target) {
    this._lookTarget = target instanceof THREE.Vector3 ? target : target.position;
  }

  /** Clear look target */
  clearLookTarget() {
    this._lookTarget = null;
  }

  /**
   * Update per frame.
   * @param {number} dt - delta time in seconds
   */
  update(dt) {
    // --- Camera shake ---
    if (this._shakeIntensity > 0.001) {
      this._shakeOffset.set(
        (Math.random() - 0.5) * this._shakeIntensity * 2,
        (Math.random() - 0.5) * this._shakeIntensity * 2,
        (Math.random() - 0.5) * this._shakeIntensity * 0.5,
      );
      this.camera.position.add(this._shakeOffset);
      this._shakeIntensity *= Math.exp(-this._shakeDecay * dt);
    }

    // --- FOV interpolation ---
    const fovDiff = this._targetFOV - this.camera.fov;
    if (Math.abs(fovDiff) > 0.1) {
      this.camera.fov += fovDiff * Math.min(1, this._transitionSpeed * dt);
      this.camera.updateProjectionMatrix();
    } else if (this._targetFOV !== this._baseFOV) {
      // Slowly return to base FOV
      this._targetFOV += (this._baseFOV - this._targetFOV) * Math.min(1, dt * 2);
    }

    // --- Slow motion interpolation ---
    if (Math.abs(this._slowMo - this._slowMoTarget) > 0.01) {
      this._slowMo += (this._slowMoTarget - this._slowMo) * Math.min(1, dt * 3);
    }

    // --- Smooth look-at ---
    if (this._lookTarget) {
      const dir = new THREE.Vector3().subVectors(this._lookTarget, this.camera.position).normalize();
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        dir
      );
      this.camera.quaternion.slerp(targetQuat, Math.min(1, dt * 2));
    }
  }

  /** Full reset */
  reset() {
    this._shakeIntensity = 0;
    this._targetFOV = this._baseFOV;
    this.camera.fov = this._baseFOV;
    this.camera.updateProjectionMatrix();
    this._slowMo = 1.0;
    this._slowMoTarget = 1.0;
    this._lookTarget = null;
  }
}
