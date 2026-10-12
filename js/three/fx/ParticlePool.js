/* ═══════════════════════════════════════════════════════════════
   ParticlePool.js — Object-pooled particle burst system
   Reuses geometry buffers and Points objects to avoid GC spikes.
   Call burst() for success/failure particles, trail() for combos.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

const POOL_SIZE      = 8;     // max concurrent bursts
const PARTICLES_PER  = 80;

export class ParticlePool {
  constructor(scene) {
    this.scene = scene;
    this._pool = [];
    this._active = [];

    // Pre-allocate pool
    for (let i = 0; i < POOL_SIZE; i++) {
      const positions = new Float32Array(PARTICLES_PER * 3);
      const colors    = new Float32Array(PARTICLES_PER * 3);
      const velocities = new Float32Array(PARTICLES_PER * 3);

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const points = new THREE.Points(geo, mat);
      points.visible = false;
      points.frustumCulled = false;
      scene.add(points);

      this._pool.push({ points, geo, mat, positions, colors, velocities, life: 0 });
    }
  }

  /**
   * Spawn a particle burst at a world position.
   * @param {THREE.Vector3} origin
   * @param {boolean} success  true = green burst, false = red burst
   * @param {number} [spread=0.5]  spread radius
   */
  burst(origin, success, spread = 0.5) {
    const entry = this._pool.find(e => e.life <= 0);
    if (!entry) return; // all slots busy

    const color = success ? new THREE.Color(0x00ff88) : new THREE.Color(0xff2200);
    const { positions, colors, velocities } = entry;

    for (let i = 0; i < PARTICLES_PER; i++) {
      const i3 = i * 3;
      positions[i3]     = origin.x + (Math.random() - 0.5) * 0.3;
      positions[i3 + 1] = origin.y + (Math.random() - 0.5) * 0.3;
      positions[i3 + 2] = origin.z + (Math.random() - 0.5) * 0.3;

      velocities[i3]     = (Math.random() - 0.5) * spread * 2;
      velocities[i3 + 1] = Math.random() * spread * 1.5 + 0.5;
      velocities[i3 + 2] = (Math.random() - 0.5) * spread * 2;

      colors[i3]     = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    entry.geo.attributes.position.needsUpdate = true;
    entry.geo.attributes.color.needsUpdate = true;
    entry.life = 1.2;
    entry.points.visible = true;
    entry.mat.opacity = 1;

    if (!this._active.includes(entry)) this._active.push(entry);
  }

  /** Combo trail burst — gold particles */
  comboBurst(origin) {
    const entry = this._pool.find(e => e.life <= 0);
    if (!entry) return;

    const color = new THREE.Color(0xffcc00);
    const { positions, colors, velocities } = entry;

    for (let i = 0; i < PARTICLES_PER; i++) {
      const i3 = i * 3;
      positions[i3]     = origin.x + (Math.random() - 0.5) * 0.2;
      positions[i3 + 1] = origin.y + Math.random() * 0.5;
      positions[i3 + 2] = origin.z + (Math.random() - 0.5) * 0.2;

      velocities[i3]     = (Math.random() - 0.5) * 0.8;
      velocities[i3 + 1] = Math.random() * 2.0 + 1.0;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.8;

      colors[i3]     = color.r + Math.random() * 0.2;
      colors[i3 + 1] = color.g * (0.8 + Math.random() * 0.2);
      colors[i3 + 2] = 0;
    }

    entry.geo.attributes.position.needsUpdate = true;
    entry.geo.attributes.color.needsUpdate = true;
    entry.life = 1.0;
    entry.points.visible = true;
    entry.mat.opacity = 1;

    if (!this._active.includes(entry)) this._active.push(entry);
  }

  /** Call every frame */
  update(delta) {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const entry = this._active[i];
      entry.life -= delta;

      if (entry.life <= 0) {
        entry.points.visible = false;
        this._active.splice(i, 1);
        continue;
      }

      // Move particles
      const { positions, velocities } = entry;
      for (let j = 0; j < PARTICLES_PER; j++) {
        const j3 = j * 3;
        positions[j3]     += velocities[j3] * delta;
        positions[j3 + 1] += velocities[j3 + 1] * delta;
        positions[j3 + 2] += velocities[j3 + 2] * delta;
        // Gravity
        velocities[j3 + 1] -= 2.0 * delta;
        // Damping
        velocities[j3]     *= 0.98;
        velocities[j3 + 2] *= 0.98;
      }
      entry.geo.attributes.position.needsUpdate = true;

      // Fade
      entry.mat.opacity = Math.max(0, entry.life / 1.2);
    }
  }

  dispose() {
    for (const entry of this._pool) {
      this.scene.remove(entry.points);
      entry.geo.dispose();
      entry.mat.dispose();
    }
    this._pool = [];
    this._active = [];
  }
}
