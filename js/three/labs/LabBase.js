/* ═══════════════════════════════════════════════════════════════
   LabBase.js
   Shared base class for all 6 lab challenges.
   Handles difficulty gating, timer, hints, score calc, and cleanup.
   Each subclass implements: _buildScene(), _onEnter(), _onExit(),
   _render(delta), _giveHint(), and reports via this._complete().
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

const TIME_LIMITS = { 1:25, 2:20, 3:15, 4:11, 5:8 }; // seconds per difficulty

export class LabBase {
  constructor(ctx) {
    // ctx: { scene3d, adaptive, session, spatialAudio, aria, ui, onComplete }
    Object.assign(this, ctx);
    this.scene    = ctx.scene3d.scene;
    this._group   = new THREE.Group();
    this._active  = false;
    this._diff    = 3;
    this._timer   = 0;
    this._hints   = 3;
    this._attempts = 0;
    this._t0      = 0;
    this._built   = false;
  }

  /* Called by MindShift3D when player enters the room */
  enter(difficulty) {
    this._diff    = difficulty;
    this._timer   = TIME_LIMITS[difficulty] ?? 15;
    this._hints   = 3;
    this._attempts = 0;
    this._t0      = performance.now();
    this._active  = true;

    if (!this._built) {
      this._buildScene();
      this.scene.add(this._group);
      this._built = true;
    }

    this._showGroup(true);
    this._onEnter(difficulty);
    this.ui?.showTimer(this._timer);
  }

  exit() {
    this._active = false;
    this._showGroup(false);
    this._onExit?.();
  }

  /* Subclasses call this when challenge is done */
  _complete(correct, attempts) {
    if (!this._active) return;
    this._active = false;
    const elapsed = (performance.now() - this._t0) / 1000;
    const hintPenalty = (3 - this._hints) * 15;

    // Score formula matching existing SessionManager
    const base = 100 * this._diff;
    const timeBonus = Math.max(0, (this._timer - elapsed) * 15);
    const streakBonus = this.session._currentStreak > 2 ? this.session._currentStreak * 10 : 0;
    const score = correct
      ? Math.max(10, Math.round(base + timeBonus + streakBonus - hintPenalty))
      : Math.round(hintPenalty > 0 ? -hintPenalty : 0);

    this.onComplete({
      category:     this._category ?? 'memory',
      difficulty:   this._diff,
      correct:      !!correct,
      score,
      responseTime: parseFloat(elapsed.toFixed(2)),
      attempts:     attempts ?? this._attempts,
      hintUsed:     (3 - this._hints) > 0,
    });

    // Particle burst at camera position
    this._particleBurst(correct);
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
    this.ui?.updateTimer(Math.ceil(this._timer));
    if (this._timer <= 0) this._complete(false, this._attempts);
    this._render?.(delta);
  }

  dispose() {
    this._showGroup(false);
    this._group.traverse(obj => {
      obj.geometry?.dispose();
      if (obj.material) {
        const ms = Array.isArray(obj.material) ? obj.material : [obj.material];
        ms.forEach(m => { m.map?.dispose(); m.dispose(); });
      }
    });
    this.scene.remove(this._group);
  }

  _showGroup(v) { this._group.visible = v; }

  /* Particle burst for success / failure */
  _particleBurst(correct) {
    const count = 80;
    const pos = new Float32Array(count * 3);
    const color = new Float32Array(count * 3);
    const target = this.scene3d.camera.position.clone().add(
      new THREE.Vector3(0, 0, -2).applyQuaternion(this.scene3d.camera.quaternion)
    );
    const c = correct ? new THREE.Color(0x00ff88) : new THREE.Color(0xff2200);

    for (let i = 0; i < count; i++) {
      pos[i*3]   = target.x + (Math.random()-0.5)*0.5;
      pos[i*3+1] = target.y + (Math.random()-0.5)*0.5;
      pos[i*3+2] = target.z + (Math.random()-0.5)*0.5;
      color[i*3] = c.r; color[i*3+1] = c.g; color[i*3+2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(color, 3));
    const mat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);

    let life = 1.2;
    const tick = (_, dt = 0.016) => {
      life -= dt;
      if (life <= 0) { this.scene.remove(pts); geo.dispose(); mat.dispose(); return; }
      mat.opacity = life / 1.2;
      for (let i = 0; i < count; i++) {
        pos[i*3+1] += 0.015;
        pos[i*3]   += (Math.random()-0.5)*0.01;
        pos[i*3+2] += (Math.random()-0.5)*0.01;
      }
      geo.attributes.position.needsUpdate = true;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
