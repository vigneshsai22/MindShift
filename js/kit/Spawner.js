/* ═══════════════════════════════════════════════════════════════
   Spawner.js — Object pooling and spawn system for 3D games
   Pre-allocates a pool of Three.js objects and recycles them.
   Used by Reflex Arena, Swarm Count, Factory Sorter, etc.
   ═══════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

export class Spawner {
  /**
   * @param {Object} opts
   * @param {Function} opts.factory     - () => THREE.Object3D — creates one pooled object
   * @param {number}   [opts.poolSize=50]
   * @param {THREE.Group} [opts.parent] - group to add active objects to
   */
  constructor(opts = {}) {
    this.factory  = opts.factory;
    this.poolSize = opts.poolSize || 50;
    this.parent   = opts.parent || new THREE.Group();

    this._pool    = [];     // inactive objects
    this._active  = [];     // active objects
    this._inited  = false;
  }

  /** Pre-allocate the pool */
  init() {
    for (let i = 0; i < this.poolSize; i++) {
      const obj = this.factory();
      obj.visible = false;
      obj.userData._pooled = true;
      this.parent.add(obj);
      this._pool.push(obj);
    }
    this._inited = true;
    return this;
  }

  /**
   * Spawn an object from the pool.
   * @param {THREE.Vector3|Object} position - { x, y, z }
   * @param {Object} [userData] - extra data to attach
   * @returns {THREE.Object3D|null}
   */
  spawn(position, userData = {}) {
    let obj;
    if (this._pool.length > 0) {
      obj = this._pool.pop();
    } else {
      // Pool exhausted — create a new one
      obj = this.factory();
      obj.userData._pooled = true;
      this.parent.add(obj);
    }

    obj.position.set(position.x || 0, position.y || 0, position.z || 0);
    obj.visible = true;
    obj.userData._active = true;
    Object.assign(obj.userData, userData);

    // Reset scale and rotation
    obj.scale.set(1, 1, 1);
    obj.rotation.set(0, 0, 0);

    this._active.push(obj);
    return obj;
  }

  /**
   * Return an object to the pool.
   * @param {THREE.Object3D} obj
   */
  despawn(obj) {
    obj.visible = false;
    obj.userData._active = false;
    const idx = this._active.indexOf(obj);
    if (idx >= 0) this._active.splice(idx, 1);
    this._pool.push(obj);
  }

  /** Despawn all active objects */
  despawnAll() {
    while (this._active.length > 0) {
      this.despawn(this._active[0]);
    }
  }

  /**
   * Update active objects. Calls updateFn(obj, dt) for each.
   * If updateFn returns true, the object is despawned.
   * @param {number} dt - delta time in seconds
   * @param {Function} updateFn - (obj, dt) => boolean (true to despawn)
   */
  update(dt, updateFn) {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const obj = this._active[i];
      if (updateFn(obj, dt)) {
        this.despawn(obj);
      }
    }
  }

  /** Get all active objects */
  get active() { return this._active; }

  /** Get count of active objects */
  get activeCount() { return this._active.length; }

  /** Dispose all objects */
  dispose() {
    const allObjs = [...this._pool, ...this._active];
    for (const obj of allObjs) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
    this._pool.length = 0;
    this._active.length = 0;
    if (this.parent.parent) this.parent.parent.remove(this.parent);
  }
}
