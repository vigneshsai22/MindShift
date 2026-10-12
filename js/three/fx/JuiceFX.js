/* ═══════════════════════════════════════════════════════════════
   JuiceFX.js — Camera shake, FOV punch, hit-stop, floating
   score popups, count-up numbers, combo flash. All the "juice"
   that makes every action feel responsive.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { EventBus } from '../../core/EventBus.js';
import { Config }   from '../../core/Config.js';

export class JuiceFX {
  constructor(scene3d, postFX) {
    this.scene3d = scene3d;
    this.postFX  = postFX;
    this.camera  = scene3d.camera;

    this._shakeIntensity = 0;
    this._shakeDecay     = Config.GRAPHICS.SHAKE_DECAY;
    this._shakeOffset    = new THREE.Vector3();
    this._baseFOV        = Config.GRAPHICS.FOV_DEFAULT;
    this._targetFOV      = this._baseFOV;
    this._fovVelocity    = 0;
    this._hitStop         = 0;      // seconds remaining in hit-stop
    this._popups          = [];     // floating DOM score popups
    this._popupContainer  = null;

    // Listen to events
    this._unsubs = [
      EventBus.on('fx:punch', (d) => this._onPunch(d)),
      EventBus.on('trial:complete', (d) => this._onTrialComplete(d)),
      EventBus.on('combo:change', (d) => this._onComboChange(d)),
    ];

    this._initPopupContainer();
  }

  _initPopupContainer() {
    this._popupContainer = document.createElement('div');
    this._popupContainer.id = 'juice-popups';
    this._popupContainer.style.cssText = `
      position:fixed;inset:0;pointer-events:none;z-index:450;
      overflow:hidden;font-family:'Outfit',sans-serif;`;
    document.body.appendChild(this._popupContainer);
  }

  /* ── Event Handlers ──────────────────────────────────────── */

  _onPunch({ type, intensity = 1.0 }) {
    switch (type) {
      case 'shake':
        this._shakeIntensity = Math.min(1.0, intensity) * Config.GRAPHICS.SHAKE_INTENSITY;
        break;
      case 'fov':
        this._targetFOV = Config.GRAPHICS.FOV_PUNCH;
        this._fovVelocity = 150;
        break;
      case 'chroma':
        this.postFX?.pulseChroma(intensity);
        break;
    }
  }

  _onTrialComplete({ correct, score }) {
    if (correct) {
      // FOV punch + shake + green flash
      this._targetFOV = Config.GRAPHICS.FOV_PUNCH;
      this._fovVelocity = 150;
      this._shakeIntensity = 0.08;
      this._spawnPopup(`+${score ?? 0}`, '#00ff88');
    } else {
      // Chromatic aberration + red flash + small shake
      this.postFX?.pulseChroma(0.8);
      this._shakeIntensity = 0.1;
      this._spawnPopup('✕ MISS', '#ff3333');
    }
  }

  _onComboChange({ combo }) {
    if (combo >= 3) {
      this._spawnPopup(`${combo}× COMBO`, '#ffcc00', true);
    }
  }

  /* ── Hit-Stop (brief freeze on boss failure) ─────────────── */
  triggerHitStop(duration = 0.15) {
    this._hitStop = duration;
  }

  /* ── Slow-Motion (last boss hit) ─────────────────────────── */
  triggerSlowMo(duration = 1.5, factor = 0.3) {
    this._slowMo = { remaining: duration, factor };
  }

  /* ── Floating Score Popup ────────────────────────────────── */
  _spawnPopup(text, color = '#fff', large = false) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `
      position:absolute;
      left:50%;top:45%;
      transform:translate(-50%,-50%);
      font-size:${large ? '42px' : '28px'};
      font-weight:${large ? '900' : '700'};
      color:${color};
      text-shadow:0 0 12px ${color}80, 0 0 30px ${color}40;
      opacity:1;
      transition:all 0.8s cubic-bezier(0.22,1,0.36,1);
      pointer-events:none;
      letter-spacing:2px;
      z-index:451;`;
    this._popupContainer.appendChild(el);

    requestAnimationFrame(() => {
      el.style.top = '30%';
      el.style.opacity = '0';
      el.style.transform = `translate(-50%,-50%) scale(${large ? 1.8 : 1.4})`;
    });

    setTimeout(() => el.remove(), 900);
  }

  /* ── Per-Frame Update ────────────────────────────────────── */
  update(delta) {
    // Hit-stop: return modified delta (or 0 if frozen)
    let effectiveDelta = delta;
    if (this._hitStop > 0) {
      this._hitStop -= delta;
      effectiveDelta = 0;
    }

    // Slow-motion
    if (this._slowMo) {
      this._slowMo.remaining -= delta;
      if (this._slowMo.remaining <= 0) {
        this._slowMo = null;
      } else {
        effectiveDelta *= this._slowMo.factor;
      }
    }

    // Camera shake
    if (this._shakeIntensity > 0.001) {
      this._shakeOffset.set(
        (Math.random() - 0.5) * 2 * this._shakeIntensity,
        (Math.random() - 0.5) * 2 * this._shakeIntensity,
        0
      );
      this.camera.position.add(this._shakeOffset);
      this._shakeIntensity *= Math.exp(-this._shakeDecay * delta);
    }

    // FOV spring-back
    const fovDiff = this._targetFOV - this.camera.fov;
    if (Math.abs(fovDiff) > 0.1) {
      this.camera.fov += fovDiff * Math.min(1, delta * 8);
      this.camera.updateProjectionMatrix();
    } else if (this._targetFOV !== this._baseFOV) {
      // Spring back to default
      this._targetFOV = this._baseFOV;
    }

    return effectiveDelta;
  }

  dispose() {
    this._unsubs.forEach(fn => fn());
    this._popupContainer?.remove();
  }
}
