/* ═══════════════════════════════════════════════════════════════
   ARIA.js — Holographic AI Guide & Supervisor
   Procedural avatar with fresnel glow, orbital rings, and dynamic personality:
   - Stage 1 (Friendly): Polite, helpful, clinical
   - Stage 2 (Sarcastic): Sharp, observing anomalies, testing player composure
   - Stage 3 (Unsettling): Realizes Subject 07 is out-thinking the protocol
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { EventBus } from '../core/EventBus.js';

const HOLO_VERT = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main(){
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mvPosition;
}`;

const HOLO_FRAG = `
uniform float time;
uniform vec3  color;
uniform float pulse;
varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vViewPosition;

void main(){
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 2.2);

  float scanlines = sin((vUv.y + time * 0.15) * 120.0) * 0.5 + 0.5;
  float flicker   = 0.9 + 0.1 * sin(time * 30.0);
  float alpha     = (0.35 + 0.65 * fresnel + 0.2 * scanlines + pulse * 0.25) * flicker;

  vec3 outColor = mix(color, vec3(1.0, 1.0, 1.0), fresnel * 0.45);
  gl_FragColor  = vec4(outColor, clamp(alpha, 0.05, 0.95));
}`;

export class ARIA {
  constructor(scene, spatialAudio, camera) {
    this.scene        = scene;
    this.spatialAudio = spatialAudio;
    this.camera       = camera;
    this._group       = new THREE.Group();
    this._synth       = window.speechSynthesis ?? null;
    this._subtitle    = null;
    this._time        = 0;
    this._speaking    = false;
    this._personality = 'friendly'; // 'friendly' | 'sarcastic' | 'unsettling'
    this._rings       = [];
  }

  init() {
    this._createAvatar();
    this._createSubtitles();
    this._bindEvents();
  }

  _createAvatar() {
    this._holoMat = new THREE.ShaderMaterial({
      uniforms: {
        time:  { value: 0 },
        color: { value: new THREE.Color(0x00e5ff) },
        pulse: { value: 0 }
      },
      vertexShader:   HOLO_VERT,
      fragmentShader: HOLO_FRAG,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // 1. Core Figure
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.7, 16), this._holoMat);
    torso.position.y = 0.55;
    this._group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), this._holoMat);
    head.position.y = 1.1;
    this._group.add(head);

    // Glowing Holographic Eyes
    [-0.07, 0.07].forEach(x => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0x00ffff,
          emissive: 0x00ffff,
          emissiveIntensity: 3.5,
          roughness: 0.1
        })
      );
      eye.position.set(x, 1.12, 0.19);
      this._group.add(eye);
    });

    // 2. Orbital Floating Rings
    [0.45, 0.65, 0.85].forEach((radius, idx) => {
      const ringGeo = new THREE.TorusGeometry(radius, 0.012, 8, 36);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        emissive: 0x00e5ff,
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.8
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.75 + idx * 0.15;
      ring.rotation.x = Math.PI / 2 + idx * 0.2;
      this._group.add(ring);
      this._rings.push({ mesh: ring, speed: (idx % 2 === 0 ? 1 : -1) * (0.8 + idx * 0.4) });
    });

    // Position at Hub Center
    this._group.position.set(0, 0.1, 0);
    this.scene.add(this._group);
  }

  _createSubtitles() {
    this._subtitle = document.createElement('div');
    this._subtitle.id = 'aria-subtitles';
    this._subtitle.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      max-width: 680px;
      padding: 10px 22px;
      background: rgba(3, 7, 18, 0.88);
      border: 1px solid rgba(0, 229, 255, 0.4);
      border-radius: 8px;
      color: #e2e8f0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.88rem;
      text-align: center;
      line-height: 1.45;
      z-index: 460;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
    `;
    document.body.appendChild(this._subtitle);
  }

  _bindEvents() {
    EventBus.on('director:state', (data) => {
      if (data.state === 'PEAK') {
        this.setPersonality('sarcastic');
      } else if (data.state === 'RECOVER') {
        this.setPersonality('friendly');
      }
    });
  }

  setPersonality(stage) {
    this._personality = stage;
    const colorMap = {
      friendly:   0x00e5ff, // Cyan
      sarcastic:  0xf59e0b, // Amber
      unsettling: 0xf43f5e  // Crimson
    };
    if (this._holoMat && colorMap[stage]) {
      this._holoMat.uniforms.color.value.setHex(colorMap[stage]);
    }
  }

  speak(text, category = 'info') {
    if (!text) return;

    // Show subtitles
    if (this._subtitle) {
      this._subtitle.innerHTML = `<span style="color:#00e5ff;font-weight:700">ARIA [${this._personality.toUpperCase()}]:</span> "${text}"`;
      this._subtitle.style.opacity = '1';

      if (this._subTimer) clearTimeout(this._subTimer);
      this._subTimer = setTimeout(() => {
        this._subtitle.style.opacity = '0';
      }, Math.max(3000, text.length * 65));
    }

    // Web Speech API
    if (this._synth && window.SpeechSynthesisUtterance) {
      try {
        this._synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = this._personality === 'unsettling' ? 0.75 : 1.15;

        // Try to pick a crisp robotic/female voice if present
        const voices = this._synth.getVoices();
        const idealVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Google')));
        if (idealVoice) utterance.voice = idealVoice;

        utterance.onstart = () => { this._speaking = true; };
        utterance.onend   = () => { this._speaking = false; };
        this._synth.speak(utterance);
      } catch (e) {
        this._speakingFallback();
      }
    } else {
      this._speakingFallback();
    }
  }

  _speakingFallback() {
    this._speaking = true;
    this.spatialAudio?.playTone(480, 0.18, 'sine', 0.15);
    setTimeout(() => { this._speaking = false; }, 1500);
  }

  update(delta) {
    this._time += delta;

    if (this._holoMat) {
      this._holoMat.uniforms.time.value = this._time;
      this._holoMat.uniforms.pulse.value = this._speaking ? Math.sin(this._time * 16) * 0.5 + 0.5 : 0;
    }

    // Avatar gently faces the player
    if (this.camera) {
      const targetPos = this.camera.position.clone();
      targetPos.y = this._group.position.y;
      this._group.lookAt(targetPos);
    }

    // Animate orbital rings
    this._rings.forEach((r, idx) => {
      r.mesh.rotation.z += r.speed * delta;
      r.mesh.position.y += Math.sin(this._time * 2 + idx) * 0.0008;
    });
  }

  dispose() {
    if (this._subTimer) clearTimeout(this._subTimer);
    this._synth?.cancel();
    this._subtitle?.remove();
    this._group.traverse(obj => {
      obj.geometry?.dispose();
      obj.material?.dispose();
    });
    this.scene.remove(this._group);
  }
}
