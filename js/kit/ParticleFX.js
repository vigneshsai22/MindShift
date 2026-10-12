/* ═══════════════════════════════════════════════════════════════
   ParticleFX.js — Lightweight 3D particle effects manager
   Spawns sparkles, burst sparks, floating motes, and ripples
   without requiring heavy particle libraries.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

export class ParticleFX {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this._particles = [];
  }

  /**
   * Spawn an omnidirectional spark burst at given position
   * @param {THREE.Vector3|Object} pos
   * @param {Object} options
   */
  burst(pos, { count = 30, color = 0x00ffff, size = 0.12, speed = 4, life = 0.8 } = {}) {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    const origin = new THREE.Vector3(pos.x || 0, pos.y || 0, pos.z || 0);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = origin.x;
      positions[i * 3 + 1] = origin.y;
      positions[i * 3 + 2] = origin.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const spd = speed * (0.4 + Math.random() * 0.8);

      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * spd,
        Math.sin(phi) * Math.sin(theta) * spd + 1.2,
        Math.cos(phi) * spd
      ));
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: color,
      size: size,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const pSystem = new THREE.Points(geom, mat);
    this.scene.add(pSystem);

    this._particles.push({
      mesh: pSystem,
      positions,
      velocities,
      age: 0,
      maxAge: life,
      gravity: -6.0,
      initialOpacity: 1.0
    });
  }

  /**
   * Spawn a rising ring shockwave / glow ring
   */
  shockwave(pos, { color = 0x7c3aed, maxRadius = 3.0, duration = 0.6 } = {}) {
    const geom = new THREE.RingGeometry(0.1, 0.25, 32);
    geom.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(pos.x || 0, (pos.y || 0) + 0.05, pos.z || 0);
    this.scene.add(mesh);

    this._particles.push({
      mesh,
      age: 0,
      maxAge: duration,
      customUpdate: (item, dt) => {
        const progress = item.age / item.maxAge;
        const scale = 1 + progress * maxRadius * 3;
        mesh.scale.set(scale, 1, scale);
        mat.opacity = (1 - progress) * 0.9;
      }
    });
  }

  /**
   * Update all particle systems
   * @param {number} dt
   */
  update(dt) {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.age += dt;

      if (p.customUpdate) {
        p.customUpdate(p, dt);
      } else if (p.positions && p.velocities) {
        const count = p.velocities.length;
        const attr = p.mesh.geometry.attributes.position;
        const arr = attr.array;

        for (let j = 0; j < count; j++) {
          const vel = p.velocities[j];
          vel.y += p.gravity * dt;

          arr[j * 3 + 0] += vel.x * dt;
          arr[j * 3 + 1] += vel.y * dt;
          arr[j * 3 + 2] += vel.z * dt;
        }
        attr.needsUpdate = true;

        const progress = p.age / p.maxAge;
        p.mesh.material.opacity = Math.max(0, (1 - progress) * p.initialOpacity);
      }

      if (p.age >= p.maxAge) {
        this.scene.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
        this._particles.splice(i, 1);
      }
    }
  }

  /**
   * Teardown and cleanup
   */
  dispose() {
    for (const p of this._particles) {
      this.scene.remove(p.mesh);
      if (p.mesh.geometry) p.mesh.geometry.dispose();
      if (p.mesh.material) p.mesh.material.dispose();
    }
    this._particles = [];
  }
}
