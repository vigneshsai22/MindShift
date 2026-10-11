/* ═══════════════════════════════════════════════════════════════
   SpatialAudio.js
   Wraps Web Audio API with PannerNode so sounds have 3D positions.
   Also exposes ctx so AdaptiveMusic and AudioEngine can share it.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

export class SpatialAudio {
  constructor(camera) {
    this.camera = camera;
    this.ctx    = null;
    this._listener = null;
    this._masterGain = null;
    this._volume = 0.7;
  }

  async init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this.ctx.createGain();
      this._masterGain.gain.value = this._volume;
      this._masterGain.connect(this.ctx.destination);
      this._listener = this.ctx.listener;
    } catch {}

    const unlock = () => {
      if (!this.ctx) {
        try {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
          this._masterGain = this.ctx.createGain();
          this._masterGain.gain.value = this._volume;
          this._masterGain.connect(this.ctx.destination);
          this._listener = this.ctx.listener;
        } catch {}
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    if (this.ctx && this.ctx.state === 'suspended') {
      window.addEventListener('pointerdown', unlock);
      window.addEventListener('keydown', unlock);
    }
  }

  /* Update listener position/orientation every frame from camera */
  updateListener() {
    if (!this.ctx || !this._listener) return;
    const pos = this.camera.position;
    const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);
    const up  = new THREE.Vector3(0,1,0).applyQuaternion(this.camera.quaternion);

    if (this._listener.positionX) {
      this._listener.positionX.value = pos.x;
      this._listener.positionY.value = pos.y;
      this._listener.positionZ.value = pos.z;
      this._listener.forwardX.value  = fwd.x;
      this._listener.forwardY.value  = fwd.y;
      this._listener.forwardZ.value  = fwd.z;
      this._listener.upX.value = up.x;
      this._listener.upY.value = up.y;
      this._listener.upZ.value = up.z;
    }
  }

  /* Play a tone at a 3D world position */
  playPositional(freq, gain, pos3, type = 'sine', duration = 0.4) {
    if (!this.ctx) return;
    const osc     = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const panner   = this.ctx.createPanner();

    panner.panningModel  = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance   = 1;
    panner.maxDistance   = 40;
    panner.rolloffFactor = 1;

    if (panner.positionX) {
      panner.positionX.value = pos3.x;
      panner.positionY.value = pos3.y;
      panner.positionZ.value = pos3.z;
    } else {
      panner.setPosition(pos3.x, pos3.y, pos3.z);
    }

    osc.type      = type;
    osc.frequency.value = freq;
    gainNode.gain.value = gain;
    gainNode.gain.setTargetAtTime(0, this.ctx.currentTime + duration * 0.7, 0.05);

    osc.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this._masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration + 0.1);
  }

  /* Play a non-positional tone (UI feedback, etc.) */
  playTone(freq, gain = 0.2, type = 'sine', duration = 0.3) {
    if (!this.ctx) return;
    const osc  = this.ctx.createOscillator();
    const gn   = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gn.gain.value = gain;
    gn.gain.setTargetAtTime(0, this.ctx.currentTime + duration * 0.6, 0.04);
    osc.connect(gn);
    gn.connect(this._masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration + 0.1);
  }

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._masterGain) this._masterGain.gain.value = this._volume;
  }

  dispose() {
    this.ctx?.close();
  }
}
