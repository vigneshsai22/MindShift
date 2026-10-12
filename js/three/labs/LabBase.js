/* ═══════════════════════════════════════════════════════════════
   LabBase.js — Standardized Base Class for all 3D Cognitive Sectors
   Fulfills Architecture Contract:
   - build(), enter(params), update(dt), exit(), giveHint()
   - Emits 'trial:complete' through EventBus
   - Safely caches and restores mesh emissive intensities
   - Raycasts from screen center (0, 0) NDC during pointer-lock
   - Zero-leak lifecycle with full texture/geometry/listener disposal
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { EventBus } from '../../core/EventBus.js';
import { CONFIG } from '../../core/Config.js';

export class LabBase {
  constructor(ctx) {
    // ctx: { scene3d, adaptive, session, spatialAudio, aria, ui, videoScreens, onComplete }
    Object.assign(this, ctx);
    this.scene          = ctx.scene3d.scene;
    this.camera         = ctx.scene3d.camera;
    this._group         = new THREE.Group();
    this._active        = false;
    this._diff          = 1200;
    this._timer         = 25;
    this._totalTime     = 25;
    this._hints         = 3;
    this._attempts      = 0;
    this._t0            = 0;
    this._built         = false;
    this._category      = 'memory';
    this._emissiveCache = new Map(); // mesh -> original hex

    this._raycaster     = new THREE.Raycaster();
    this._centerNDC     = new THREE.Vector2(0, 0);
    this._rafIds        = new Set();
    this._timeouts      = new Set();
  }

  build() {
    if (this._built) return;
    this._buildScene();
    this.scene.add(this._group);
    this._built = true;
  }

  /* Called by MindShift3D when entering sector */
  enter(params = {}) {
    this.build();

    // Reset counters (Pitfall safety)
    this._attempts  = 0;
    this._hints     = 3;
    this._t0        = performance.now();
    this._active    = true;

    // Handle either raw number difficulty or parameter object
    if (typeof params === 'number') {
      this._diff = params;
      this._totalTime = 25;
    } else {
      this._diff = params.difficulty || 1200;
      this._totalTime = params.timeLimit || 25;
      this._category = params.skill || this._category;
    }
    this._timer = this._totalTime;

    this._showGroup(true);
    this._onEnter(params);

    EventBus.emit('trial:start', {
      skill: this._category,
      difficulty: this._diff,
      trialIndex: params.trialIndex || 1,
      totalTrials: params.totalTrials || 3,
      sectorTitle: this._title || this._category,
      bannerTitle: this._title || this._category,
      bannerSub: 'CALIBRATING COGNITIVE BENCHMARK'
    });

    EventBus.emit('timer:tick', { remaining: this._timer, total: this._totalTime });
  }

  exit() {
    this._active = false;
    this._clearAsyncTasks();
    this._showGroup(false);
    this._onExit?.();
  }

  /* Subclasses call this when challenge completes */
  _complete(correct, extra = {}) {
    if (!this._active) return;
    this._active = false;
    this._clearAsyncTasks();

    const elapsed = (performance.now() - this._t0) / 1000;
    const hintsUsed = 3 - this._hints;

    const resultPayload = {
      skill:        this._category,
      category:     this._category,
      difficulty:   this._diff,
      correct:      !!correct,
      responseTime: parseFloat(elapsed.toFixed(2)),
      attempts:     extra.attempts ?? this._attempts,
      hintsUsed,
      extra
    };

    // 1. Emit architecture contract event
    EventBus.emit('trial:complete', resultPayload);

    // 2. Legacy callback support for existing SessionManager / AdaptiveEngine
    if (typeof this.onComplete === 'function') {
      const base = 100 * Math.max(1, Math.min(5, Math.round(this._diff / 300)));
      const timeBonus = Math.max(0, (this._timer - elapsed) * 15);
      const streakBonus = (this.session?._currentStreak || 0) > 2 ? this.session._currentStreak * 10 : 0;
      const hintPenalty = hintsUsed * 15;
      const score = correct
        ? Math.max(10, Math.round(base + timeBonus + streakBonus - hintPenalty))
        : Math.round(hintPenalty > 0 ? -hintPenalty : 0);

      this.onComplete({
        ...resultPayload,
        score,
        hintUsed: hintsUsed > 0
      });
    }

    // 3. Audio / Visual feedback
    if (correct) {
      EventBus.emit('juice:popup', { text: 'BREACH SUCCESS', color: '#00ffcc' });
      this.spatialAudio?.playSuccess?.();
    } else {
      EventBus.emit('juice:popup', { text: 'BREACH FAILED', color: '#ff3344' });
      this.spatialAudio?.playFail?.();
    }
  }

  giveHint() {
    if (this._hints <= 0 || !this._active) return;
    this._hints--;
    this.ui?.updateHints(this._hints);
    this._giveHint?.();
  }

  update(delta) {
    if (!this._active) return;
    this._timer = Math.max(0, this._timer - delta);
    EventBus.emit('timer:tick', { remaining: this._timer, total: this._totalTime });

    if (this._timer <= 0) {
      this._complete(false, { timeout: true });
      return;
    }

    this._render?.(delta);
  }

  // ── Emissive Flash Safe Utility ──
  flashMesh(mesh, colorHex = 0x00ffcc, durationMs = 300) {
    if (!mesh || !mesh.material) return;
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!mat.emissive) return;

    if (!this._emissiveCache.has(mesh)) {
      this._emissiveCache.set(mesh, mat.emissive.getHex());
    }
    const origHex = this._emissiveCache.get(mesh);
    mat.emissive.setHex(colorHex);

    const tId = setTimeout(() => {
      mat.emissive.setHex(origHex);
      this._timeouts.delete(tId);
    }, durationMs);
    this._timeouts.add(tId);
  }

  // ── Raycast Center Screen Helper ──
  raycastCenter(objects) {
    this._raycaster.setFromCamera(this._centerNDC, this.camera);
    return this._raycaster.intersectObjects(objects, true);
  }

  _clearAsyncTasks() {
    this._timeouts.forEach(t => clearTimeout(t));
    this._timeouts.clear();
    this._rafIds.forEach(r => cancelAnimationFrame(r));
    this._rafIds.clear();
  }

  _showGroup(v) {
    this._group.visible = v;
  }

  dispose() {
    this.exit();
    this._group.traverse(obj => {
      obj.geometry?.dispose();
      if (obj.material) {
        const ms = Array.isArray(obj.material) ? obj.material : [obj.material];
        ms.forEach(m => { m.map?.dispose(); m.dispose(); });
      }
    });
    this.scene.remove(this._group);
    this._emissiveCache.clear();
  }
}
