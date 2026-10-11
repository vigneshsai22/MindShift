/* ═══════════════════════════════════════════════════════════════
   Scene3D.js — Three.js scene bootstrap
   Creates renderer, camera, scene, fog, lights, and a fadeOut util.
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
    this.renderer.toneMappingExposure = 1.1;

    /* Scene */
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000a1a);
    this.scene.fog = new THREE.FogExp2(0x000a1a, 0.018); // exponential fog

    /* Camera — first-person eye height ~1.7 m */
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 1.7, 0);

    /* Ambient light — fills dark areas without killing atmosphere */
    this.ambientLight = new THREE.AmbientLight(0x001133, 0.8);
    this.scene.add(this.ambientLight);

    /* Accent point light follows camera; colour shifts with difficulty */
    this.accentLight = new THREE.PointLight(0x0077ff, 1.5, 30);
    this.camera.add(this.accentLight); // attached to camera so it moves with player
    this.scene.add(this.camera);       // camera must be in scene when it has children

    /* Hemisphere light for subtle sky/ground colour */
    const hemi = new THREE.HemisphereLight(0x001133, 0x110022, 0.4);
    this.scene.add(hemi);

    /* Resize handler */
    this._onResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', this._onResize);
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
