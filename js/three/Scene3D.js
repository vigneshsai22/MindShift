/* ═══════════════════════════════════════════════════════════════
   Scene3D.js — Three.js scene bootstrap
   Creates renderer, camera, scene, fog, lights, and a fadeOut util.
   ACESFilmic tone mapping, exposure 0.9, reflective floor, light shafts.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

export class Scene3D {
  constructor(canvas) {
    this.canvas = canvas;
  }

  async init() {
    /* Renderer — use device pixel ratio capped at 2 for performance */
    this.renderer = new THREE.WebGLRenderer({
      canvas:    this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace   = THREE.SRGBColorSpace;
    this.renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    /* Scene */
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030f1e);
    this.scene.fog = new THREE.FogExp2(0x030f1e, 0.012); // softer atmospheric fog

    /* Camera — first-person eye height ~1.7 m */
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 1.7, 0);

    /* Ambient light — rich fill lighting */
    this.ambientLight = new THREE.AmbientLight(0x0a2642, 1.3);
    this.scene.add(this.ambientLight);

    /* Accent point light follows camera; colour shifts with difficulty */
    this.accentLight = new THREE.PointLight(0x00f2fe, 2.2, 35);
    this.camera.add(this.accentLight); // attached to camera so it moves with player
    this.scene.add(this.camera);       // camera must be in scene when it has children

    /* Hemisphere light for vibrant sky/ground reflection */
    const hemi = new THREE.HemisphereLight(0x00f2fe, 0x031828, 0.8);
    this.scene.add(hemi);

    /* Directional light for subtle light-shaft feeling */
    this.dirLight = new THREE.DirectionalLight(0x0044aa, 0.3);
    this.dirLight.position.set(5, 15, 5);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(1024, 1024);
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far  = 50;
    this.dirLight.shadow.camera.left   = -20;
    this.dirLight.shadow.camera.right  =  20;
    this.dirLight.shadow.camera.top    =  20;
    this.dirLight.shadow.camera.bottom = -20;
    this.scene.add(this.dirLight);

    /* FPS counter state */
    this._fpsFrames = 0;
    this._fpsTime   = performance.now();
    this._fps       = 0;
    this._drawCalls = 0;

    /* Resize handler */
    this._onResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', this._onResize);
  }

  /** Update FPS counter — call once per frame */
  updateStats() {
    this._fpsFrames++;
    const now = performance.now();
    if (now - this._fpsTime >= 1000) {
      this._fps = this._fpsFrames;
      this._drawCalls = this.renderer.info.render.calls;
      this._fpsFrames = 0;
      this._fpsTime = now;
    }
  }

  get fps()       { return this._fps; }
  get drawCalls() { return this._drawCalls; }

  /** Smoothly set fog density and colour */
  setFog(color, density, duration = 1.0) {
    const startDensity = this.scene.fog.density;
    const startColor   = this.scene.fog.color.clone();
    const targetColor  = new THREE.Color(color);
    let t = 0;
    const step = () => {
      t += 0.016 / duration;
      if (t >= 1) {
        this.scene.fog.density = density;
        this.scene.fog.color.copy(targetColor);
        this.scene.background.copy(targetColor);
        return;
      }
      this.scene.fog.density = THREE.MathUtils.lerp(startDensity, density, t);
      this.scene.fog.color.lerpColors(startColor, targetColor, t);
      this.scene.background.copy(this.scene.fog.color);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* Fade the canvas to black, call cb, then fade back in */
  fadeOut(cb, duration = 800) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:#000;opacity:0;z-index:1000;
      pointer-events:none;transition:opacity ${duration}ms ease`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      setTimeout(() => {
        cb?.();
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), duration + 50);
      }, duration + 50);
    });
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
    // Traverse and dispose all scene geometries/materials/textures
    this.scene.traverse(obj => {
      obj.geometry?.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(m => {
          Object.values(m).forEach(v => { if (v?.isTexture) v.dispose(); });
          m.dispose();
        });
      }
    });
  }
}
