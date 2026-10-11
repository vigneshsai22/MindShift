/* ═══════════════════════════════════════════════════════════════
   ARIA.js — Holographic AI Guide
   Procedural glowing avatar with scanline shader (ShaderMaterial).
   Speaks via Web Speech API with on-screen subtitles.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

/* Simple hologram vertex+fragment shader — scanlines + flicker */
const HOLO_VERT = `
varying vec2 vUv;
varying float vY;
void main(){
  vUv = uv;
  vY  = position.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`;

const HOLO_FRAG = `
uniform float time;
uniform vec3  color;
varying vec2  vUv;
varying float vY;

void main(){
  float scanline = step(0.5, fract(vY * 18.0 + time * 0.4));
  float flicker  = 0.85 + 0.15 * sin(time * 23.7);
  float edge     = 1.0 - abs(vUv.x - 0.5) * 2.0;
  float alpha    = (0.45 + 0.35 * scanline) * flicker * edge;
  gl_FragColor   = vec4(color, alpha);
}`;

export class ARIA {
  constructor(scene, spatialAudio, camera) {
    this.scene        = scene;
    this.spatialAudio = spatialAudio;
    this.camera       = camera;
    this._group       = new THREE.Group();
    this._synth       = window.speechSynthesis ?? null;
    this._subtitle    = null;   // DOM element
    this._time        = 0;
    this._speaking    = false;
  }

  init() {
    // Body: tapered cylinder stack
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, color: { value: new THREE.Color(0x00ccff) } },
      vertexShader:   HOLO_VERT,
      fragmentShader: HOLO_FRAG,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._holoMat = mat;

    // Body segments (stacked tori + cylinder)
    [[0.2,0.08,16,24, 0.5], [0.22,0.09,16,24, 0.85], [0.18,0.07,16,24, 0.25]].forEach(
      ([r,t,rs,ts, y]) => {
        const m = new THREE.Mesh(new THREE.TorusGeometry(r,t,rs,ts), mat);
        m.position.y = y;
        this._group.add(m);
      }
    );

    // Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.22,0.6,16), mat);
    torso.position.y = 0.55;
    this._group.add(torso);

    // Head sphere
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22,16,16), mat);
    head.position.y = 1.0;
    this._group.add(head);

    // Eye glow
    [-0.07, 0.07].forEach(x => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.05,8,8),
        new THREE.MeshStandardMaterial({ color:0x00ffff, emissive:0x00ffff, emissiveIntensity:3 })
      );
      eye.position.set(x, 1.02, 0.19);
      this._group.add(eye);
    });

    // Ring base (pedestal ring)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.03, 8, 32),
      new THREE.MeshStandardMaterial({ color:0x00aacc, emissive:0x00aacc, emissiveIntensity:1.5 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    this._group.add(ring);

    // Position ARIA at hub center
    this._group.position.set(0, 0.2, 0);
    this.scene.add(this._group);

    // Subtitle div
    this._subtitle = document.createElement('div');
    this._subtitle.id = 'aria-subtitle';
    this._subtitle.style.cssText = `
      position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
      max-width:600px;background:rgba(0,20,40,0.85);color:#00eeff;
      font:bold 15px 'JetBrains Mono',monospace;padding:10px 20px;
      border-radius:8px;border:1px solid #0077aa;text-align:center;
      opacity:0;transition:opacity 0.3s;z-index:500;pointer-events:none;`;
    document.body.appendChild(this._subtitle);
  }

  speak(text, mood = 'neutral') {
    // Update subtitle
    this._subtitle.textContent = `ARIA: "${text}"`;
    this._subtitle.style.opacity = '1';
    setTimeout(() => { this._subtitle.style.opacity = '0'; },
      Math.max(3000, text.length * 55));

    // Color the hologram by mood
    const moodColors = {
      welcome:   new THREE.Color(0x00ccff),
      instruction: new THREE.Color(0x44bbff),
      praise:    new THREE.Color(0x00ff88),
      encourage: new THREE.Color(0xffaa00),
      hint:      new THREE.Color(0xffcc00),
      neutral:   new THREE.Color(0x00ccff),
    };
    this._holoMat.uniforms.color.value.copy(moodColors[mood] ?? moodColors.neutral);

    // Web Speech API
    if (this._synth && !this._speaking) {
      try {
        this._synth.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate  = 0.95;
        utt.pitch = 1.1;
        utt.volume = 0.8;
        utt.onstart = () => { this._speaking = true; };
        utt.onend   = () => { this._speaking = false; };
        this._synth.speak(utt);
      } catch {
        // Speech synthesis unavailable — subtitle-only fallback (already shown)
      }
    }
  }

  update(delta) {
    this._time += delta;
    this._holoMat.uniforms.time.value = this._time;

    // Hover animation
    this._group.position.y = 0.1 + Math.sin(this._time * 1.2) * 0.06;

    // Slowly rotate to face camera
    const dir = new THREE.Vector2(
      this.camera.position.x - this._group.position.x,
      this.camera.position.z - this._group.position.z
    );
    const targetY = Math.atan2(dir.x, dir.y);
    this._group.rotation.y += (targetY - this._group.rotation.y) * 0.03;
  }

  dispose() {
    this._synth?.cancel();
    this._subtitle?.remove();
    this._holoMat?.dispose();
    this._group.traverse(o => { o.geometry?.dispose(); });
    this.scene.remove(this._group);
  }
}
