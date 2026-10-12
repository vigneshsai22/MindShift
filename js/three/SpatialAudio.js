/* ═══════════════════════════════════════════════════════════════
   SpatialAudio.js — HRTF 3D Positional Audio & Procedural Synthesizer
   Features:
   - Full 3D PannerNode with inverse distance attenuation
   - Procedural SFX: stingers, footstep synthesizer, UI feedback, pitches
   - Web Audio listener tracking linked to Three.js camera
   - Zero external audio files required
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

export class SpatialAudio {
  constructor(camera) {
    this.camera = camera;
    this.ctx    = null;
    this._listener = null;
    this._masterGain = null;
    this._volume = 0.75;
  }

  async init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this.ctx.createGain();
      this._masterGain.gain.value = this._volume;
      this._masterGain.connect(this.ctx.destination);
      this._listener = this.ctx.listener;
    } catch (e) {
      console.warn('AudioContext init deferred:', e);
    }

    const resumeAudio = () => {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this._masterGain = this.ctx.createGain();
        this._masterGain.gain.value = this._volume;
        this._masterGain.connect(this.ctx.destination);
        this._listener = this.ctx.listener;
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      window.removeEventListener('pointerdown', resumeAudio);
      window.removeEventListener('keydown', resumeAudio);
    };

    window.addEventListener('pointerdown', resumeAudio, { once: true });
    window.addEventListener('keydown', resumeAudio, { once: true });
  }

  setVolume(vol) {
    this._volume = Math.max(0, Math.min(1, vol));
    if (this._masterGain) {
      this._masterGain.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.05);
    }
  }

  updateListener() {
    if (!this.ctx || !this._listener) return;
    const pos = this.camera.position;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const up  = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

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
    } else {
      this._listener.setPosition(pos.x, pos.y, pos.z);
      this._listener.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
    }
  }

  playPositional(freq, gain, pos3, type = 'sine', duration = 0.4) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    try {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const panner = this.ctx.createPanner();

      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1.2;
      panner.maxDistance = 45;
      panner.rolloffFactor = 1.1;

      if (panner.positionX) {
        panner.positionX.value = pos3.x;
        panner.positionY.value = pos3.y;
        panner.positionZ.value = pos3.z;
      } else {
        panner.setPosition(pos3.x, pos3.y, pos3.z);
      }

      osc.type = type;
      osc.frequency.value = freq;
      gainNode.gain.setValueAtTime(gain, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(this._masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {}
  }

  playTone(freq, duration = 0.25, type = 'sine', vol = 0.2) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this._masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {}
  }

  playFootstep() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(this._masterGain);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  playSuccess() {
    this.playTone(523.25, 0.12, 'sine', 0.25); // C5
    setTimeout(() => this.playTone(659.25, 0.12, 'sine', 0.25), 100); // E5
    setTimeout(() => this.playTone(783.99, 0.25, 'sine', 0.3), 200);  // G5
  }

  playFail() {
    this.playTone(220, 0.15, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(174.61, 0.25, 'sawtooth', 0.25), 140);
  }

  playStinger(type) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    if (type === 'boss_start') {
      [130.81, 164.81, 196.00, 246.94].forEach((f, i) => {
        setTimeout(() => this.playTone(f * 2, 0.35, 'sawtooth', 0.25), i * 120);
      });
    } else if (type === 'victory') {
      [440, 554.37, 659.25, 880].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.3, 'sine', 0.28), i * 140);
      });
    } else if (type === 'failure') {
      [220, 207.65, 196.00, 185.00].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.4, 'triangle', 0.25), i * 160);
      });
    }
  }

  dispose() {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
  }
}
