/* ═══════════════════════════════════════════════════════════════
   PostFX.js
   EffectComposer with UnrealBloomPass + OutputPass.
   Falls back to renderer.render() if postprocessing unavailable.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { EffectComposer }   from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }       from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }  from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }       from 'three/addons/postprocessing/OutputPass.js';

export class PostFX {
  constructor(scene3d) {
    this.scene3d  = scene3d;
    this.composer = null;
    this._bloomStrength = 0.85;
  }

  init() {
    try {
      const { renderer, scene, camera } = this.scene3d;
      this.composer = new EffectComposer(renderer);

      const renderPass = new RenderPass(scene, camera);
      this.composer.addPass(renderPass);

      this._bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        this._bloomStrength,  // strength
        0.4,                  // radius
        0.2                   // threshold
      );
      this.composer.addPass(this._bloom);

      const outputPass = new OutputPass();
      this.composer.addPass(outputPass);

      // Keep composer size in sync with window
      window.addEventListener('resize', () => {
        this.composer.setSize(window.innerWidth, window.innerHeight);
      });
    } catch (err) {
      console.warn('PostFX unavailable, falling back to direct render:', err.message);
      this.composer = null;
    }
  }

  render(delta) {
    if (this.composer) {
      this.composer.render(delta);
    } else {
      // Fallback
      const { renderer, scene, camera } = this.scene3d;
      renderer.render(scene, camera);
    }
  }

  setBloomStrength(v) {
    this._bloomStrength = v;
    if (this._bloom) this._bloom.strength = v;
  }

  setQuality(level) {
    // level: 'low' | 'medium' | 'high'
    const { renderer } = this.scene3d;
    if (level === 'low') {
      renderer.setPixelRatio(1);
      if (this._bloom) this._bloom.enabled = false;
      renderer.shadowMap.enabled = false;
    } else if (level === 'medium') {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      if (this._bloom) this._bloom.enabled = true;
      renderer.shadowMap.enabled = true;
    } else {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      if (this._bloom) this._bloom.enabled = true;
      renderer.shadowMap.enabled = true;
    }
  }

  dispose() {
    this.composer?.dispose?.();
  }
}
