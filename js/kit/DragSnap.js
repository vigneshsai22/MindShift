/* ═══════════════════════════════════════════════════════════════
   DragSnap.js — 3D drag and snap system for puzzle games
   Handles picking, dragging, and snapping 3D objects to targets.
   Used by Hologram Matrix, Echo Shelves, Evidence Board, etc.
   ═══════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { EventBus } from '../core/EventBus.js';

export class DragSnap {
  /**
   * @param {Object} opts
   * @param {THREE.Camera} opts.camera
   * @param {HTMLElement} opts.domElement
   * @param {THREE.Object3D[]} opts.draggables - objects that can be dragged
   * @param {THREE.Object3D[]} opts.snapTargets - objects that serve as snap points
   * @param {number} [opts.snapDistance=0.8] - max distance to snap
   * @param {THREE.Plane} [opts.dragPlane] - plane to drag on
   */
  constructor(opts = {}) {
    this.camera      = opts.camera;
    this.dom         = opts.domElement;
    this.draggables  = opts.draggables || [];
    this.snapTargets = opts.snapTargets || [];
    this.snapDist    = opts.snapDistance || 0.8;
    this.dragPlane   = opts.dragPlane || new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this._raycaster  = new THREE.Raycaster();
    this._mouse      = new THREE.Vector2();
    this._intersect  = new THREE.Vector3();
    this._dragging   = null;
    this._offset     = new THREE.Vector3();
    this._originalPos = new THREE.Vector3();
    this._enabled    = true;

    this._onSnap     = null;  // (dragged, target) => void
    this._onDragStart = null;
    this._onDragEnd  = null;

    // Bind handlers
    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerUp   = this._handlePointerUp.bind(this);
  }

  onSnap(fn)      { this._onSnap = fn; return this; }
  onDragStart(fn) { this._onDragStart = fn; return this; }
  onDragEnd(fn)   { this._onDragEnd = fn; return this; }

  enable() {
    this._enabled = true;
    this.dom.addEventListener('pointerdown', this._onPointerDown);
    this.dom.addEventListener('pointermove', this._onPointerMove);
    this.dom.addEventListener('pointerup',   this._onPointerUp);
  }

  disable() {
    this._enabled = false;
    this.dom.removeEventListener('pointerdown', this._onPointerDown);
    this.dom.removeEventListener('pointermove', this._onPointerMove);
    this.dom.removeEventListener('pointerup',   this._onPointerUp);
    this._dragging = null;
  }

  _updateMouse(e) {
    const rect = this.dom.getBoundingClientRect();
    this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _handlePointerDown(e) {
    if (!this._enabled) return;
    this._updateMouse(e);
    this._raycaster.setFromCamera(this._mouse, this.camera);

    const hits = this._raycaster.intersectObjects(this.draggables, true);
    if (hits.length === 0) return;

    // Find the top-level draggable
    let obj = hits[0].object;
    while (obj.parent && !this.draggables.includes(obj)) {
      obj = obj.parent;
    }
    if (!this.draggables.includes(obj)) return;

    this._dragging = obj;
    this._originalPos.copy(obj.position);

    // Calculate offset
    if (this._raycaster.ray.intersectPlane(this.dragPlane, this._intersect)) {
      this._offset.copy(this._intersect).sub(obj.position);
    }

    if (this._onDragStart) this._onDragStart(obj);
    EventBus.emit('drag:start', { object: obj });
  }

  _handlePointerMove(e) {
    if (!this._dragging || !this._enabled) return;
    this._updateMouse(e);
    this._raycaster.setFromCamera(this._mouse, this.camera);

    if (this._raycaster.ray.intersectPlane(this.dragPlane, this._intersect)) {
      this._dragging.position.copy(this._intersect.sub(this._offset));
    }
  }

  _handlePointerUp() {
    if (!this._dragging || !this._enabled) return;

    const dragged = this._dragging;
    this._dragging = null;

    // Check snap targets
    let snapped = false;
    let bestDist = Infinity;
    let bestTarget = null;

    for (const target of this.snapTargets) {
      const dist = dragged.position.distanceTo(target.position);
      if (dist < this.snapDist && dist < bestDist) {
        bestDist = dist;
        bestTarget = target;
      }
    }

    if (bestTarget) {
      dragged.position.copy(bestTarget.position);
      snapped = true;
      if (this._onSnap) this._onSnap(dragged, bestTarget);
      EventBus.emit('drag:snap', { dragged, target: bestTarget });
    } else {
      // Return to original position
      dragged.position.copy(this._originalPos);
    }

    if (this._onDragEnd) this._onDragEnd(dragged, snapped);
    EventBus.emit('drag:end', { dragged, snapped });
  }

  /** Add a draggable object */
  addDraggable(obj) {
    if (!this.draggables.includes(obj)) this.draggables.push(obj);
  }

  /** Remove a draggable object */
  removeDraggable(obj) {
    const idx = this.draggables.indexOf(obj);
    if (idx >= 0) this.draggables.splice(idx, 1);
  }

  /** Add a snap target */
  addSnapTarget(obj) {
    if (!this.snapTargets.includes(obj)) this.snapTargets.push(obj);
  }

  /** Dispose */
  dispose() {
    this.disable();
    this.draggables.length = 0;
    this.snapTargets.length = 0;
  }
}
