/* ═══════════════════════════════════════════════════════════════
   PostFX.js — Enhanced post-processing pipeline
   EffectComposer with: UnrealBloomPass, ShaderPass (Vignette,
   ChromaticAberration, Scanlines/FilmGrain), OutputPass.
   Falls back to renderer.render() if postprocessing unavailable.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { EffectComposer }   from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }       from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }  from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }       from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass }       from 'three/addons/postprocessing/OutputPass.js';

/* ── Custom Vignette + Scanlines + Film Grain + Chromatic Aberration ─ */
const CompositeShader = {
  uniforms: {
    tDiffuse:         { value: null },
    time:             { value: 0 },
    vignetteOffset:   { value: 1.0 },
    vignetteDarkness: { value: 1.0 },
    chromaIntensity:  { value: 0.0 },     // 0 = off; pulsed on errors
    scanlineDensity:  { value: 0.0 },
    scanlineOpacity:  { value: 0.0 },
    grainIntensity:   { value: 0.01 },
    resolution:       { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float vignetteOffset;
    uniform float vignetteDarkness;
    uniform float chromaIntensity;
    uniform float scanlineDensity;
    uniform float scanlineOpacity;
    uniform float grainIntensity;
    uniform vec2  resolution;
    varying vec2  vUv;

    // Simple hash for film grain
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      vec2 uv = vUv;

      // ── Chromatic Aberration (pulse on errors) ──
      float cr = chromaIntensity;
      vec4 col;
      if (cr > 0.0001) {
        vec2 dir = uv - 0.5;
        float d  = length(dir);
        vec2 offset = dir * cr * d;
        col.r = texture2D(tDiffuse, uv + offset).r;
        col.g = texture2D(tDiffuse, uv).g;
        col.b = texture2D(tDiffuse, uv - offset).b;
        col.a = 1.0;
      } else {
        col = texture2D(tDiffuse, uv);
      }

      // ── Vignette (gentle framing, does not crush blacks) ──
      vec2 vuv = uv * (1.0 - uv);
      float vig = clamp(vuv.x * vuv.y * 16.0, 0.0, 1.0);
      col.rgb *= mix(0.8, 1.0, vig);

      // ── Subtle Film Grain ──
      if (grainIntensity > 0.001) {
        float grain = (hash(uv * resolution + time * 100.0) - 0.5) * grainIntensity;
        col.rgb += grain;
      }

      gl_FragColor = col;
    }
  `
};

export class PostFX {
  constructor(scene3d) {
    this.scene3d  = scene3d;
    this.composer = null;
    this._bloomStrength = 0.6;
    this._chromaPulse = 0;
    this._time = 0;
  }

  init() {
    try {
      const { renderer, scene, camera } = this.scene3d;
      this.composer = new EffectComposer(renderer);

      // 1. Render pass
      const renderPass = new RenderPass(scene, camera);
      this.composer.addPass(renderPass);

      // 2. Bloom — tuned conservatively per spec
      this._bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        this._bloomStrength,  // strength 0.6
        0.4,                  // radius
        0.85                  // threshold — higher to prevent blowout
      );
      this.composer.addPass(this._bloom);

      // 3. Composite shader (vignette + chroma + scanlines + grain)
      this._compositePass = new ShaderPass(CompositeShader);
      this._compositePass.uniforms.resolution.value.set(
        window.innerWidth * renderer.getPixelRatio(),
        window.innerHeight * renderer.getPixelRatio()
      );
      this.composer.addPass(this._compositePass);

      // 4. Output pass (gamma / colour space correction)
      const outputPass = new OutputPass();
      this.composer.addPass(outputPass);

      // Keep composer size in sync with window
      this._onResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.composer.setSize(w, h);
        this._compositePass.uniforms.resolution.value.set(
          w * renderer.getPixelRatio(),
          h * renderer.getPixelRatio()
        );
      };
      window.addEventListener('resize', this._onResize);
    } catch (err) {
      console.warn('PostFX unavailable, falling back to direct render:', err.message);
      this.composer = null;
    }
  }

  render(delta) {
    this._time += delta;

    // Decay chromatic aberration pulse
    if (this._chromaPulse > 0) {
      this._chromaPulse = Math.max(0, this._chromaPulse - delta * 4.0);
    }

    if (this.composer && this._compositePass) {
      this._compositePass.uniforms.time.value = this._time;
      this._compositePass.uniforms.chromaIntensity.value = this._chromaPulse * 0.008;
      this.composer.render(delta);
    } else {
      // Fallback
      const { renderer, scene, camera } = this.scene3d;
      renderer.render(scene, camera);
    }
  }

  /* ── Public API ────────────────────────────────────────────── */

  setBloomStrength(v) {
    this._bloomStrength = v;
    if (this._bloom) this._bloom.strength = v;
  }

  /** Pulse chromatic aberration (call on errors / hits) */
  pulseChroma(intensity = 1.0) {
    this._chromaPulse = Math.min(1.0, intensity);
  }

  /** Set vignette darkness (0 = off, 1.5 = strong) */
  setVignette(offset = 1.0, darkness = 1.2) {
    if (!this._compositePass) return;
    this._compositePass.uniforms.vignetteOffset.value = offset;
    this._compositePass.uniforms.vignetteDarkness.value = darkness;
  }

  /** Set scanline/grain intensity */
  setScanlines(density = 800, opacity = 0.06) {
    if (!this._compositePass) return;
    this._compositePass.uniforms.scanlineDensity.value = density;
    this._compositePass.uniforms.scanlineOpacity.value = opacity;
  }

  setFilmGrain(intensity = 0.04) {
    if (!this._compositePass) return;
    this._compositePass.uniforms.grainIntensity.value = intensity;
  }

  setQuality(level) {
    // level: 'low' | 'medium' | 'high'
    const { renderer } = this.scene3d;
    if (level === 'low') {
      renderer.setPixelRatio(1);
      if (this._bloom) this._bloom.enabled = false;
      if (this._compositePass) this._compositePass.enabled = false;
      renderer.shadowMap.enabled = false;
    } else if (level === 'medium') {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      if (this._bloom) this._bloom.enabled = true;
      if (this._compositePass) this._compositePass.enabled = true;
      renderer.shadowMap.enabled = true;
      this.setFilmGrain(0.02);
      this.setScanlines(800, 0.03);
    } else {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      if (this._bloom) this._bloom.enabled = true;
      if (this._compositePass) this._compositePass.enabled = true;
      renderer.shadowMap.enabled = true;
      this.setFilmGrain(0.04);
      this.setScanlines(800, 0.06);
    }
  }

  /** Toggle reduced-motion: disable grain & scanlines */
  setReducedMotion(enabled) {
    if (enabled) {
      this.setScanlines(800, 0);
      this.setFilmGrain(0);
    } else {
      this.setScanlines(800, 0.06);
      this.setFilmGrain(0.04);
    }
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.composer?.dispose?.();
  }
}
