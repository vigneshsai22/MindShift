/* ═══════════════════════════════════════════════════════════════
   InputManager.js — Unified Pointer, Touch, Raycasting & Keyboard Engine
   Shared by all MindShift 3D games and menus.
   Features:
   - Unified Pointer Events (mouse, touch, pen)
   - touch-action: none and long-press prevention
   - Accurate NDC computation from canvas.getBoundingClientRect()
   - Pointer-lock awareness (center-screen raycasting when locked)
   - Invisible enlarged hit proxies (>= 44px hit bounds)
   - Immediate hover & pressed feedback (cursor, emissive, scale, audio)
   - Multi-touch tracking and setPointerCapture for smooth dragging
   - Keyboard alternatives (1-9, WASD/arrows, Space, Enter)
   - First-gesture AudioContext resume
   - Automated input self-test API (window.__dev.testInput)
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { EventBus } from './EventBus.js';
import { SFXLib }   from '../audio/SFXLib.js';

export class InputManager {
  /**
   * @param {Object} opts
   * @param {HTMLCanvasElement} opts.canvas
   * @param {THREE.Camera} opts.camera
   * @param {THREE.Scene} opts.scene
   */
  constructor(opts = {}) {
    this.canvas   = opts.canvas || document.getElementById('three-canvas');
    this.camera   = opts.camera || null;
    this.scene    = opts.scene || null;

    this._raycaster   = new THREE.Raycaster();
    this._mouseNDC    = new THREE.Vector2(0, 0);
    this._cachedRect  = null;

    // Active pointers (for multi-touch support)
    this._activePointers = new Map(); // pointerId -> { clientX, clientY, target, time }

    // Registered interactive 3D targets
    // targetId -> { id, object, proxy, onHover, onPress, onClick, key, bounds, data }
    this._targets = new Map();
    this._hoveredTarget = null;
    this._pressedTarget = null;

    // Custom drag listener
    this._dragHandler = null;
    this._isDragging = false;
    this._dragPointerId = null;

    // Bindings
    this._onPointerDown   = this._onPointerDown.bind(this);
    this._onPointerMove   = this._onPointerMove.bind(this);
    this._onPointerUp     = this._onPointerUp.bind(this);
    this._onPointerCancel = this._onPointerCancel.bind(this);
    this._onKeyDown       = this._onKeyDown.bind(this);
    this._onResize        = this._onResize.bind(this);
    this._onContextMenu   = this._onContextMenu.bind(this);

    this._initialized = false;
    this._audioUnlocked = false;

    if (this.canvas) {
      this.init();
    }
  }

  init(canvas = null) {
    if (canvas) this.canvas = canvas;
    if (!this.canvas || this._initialized) return;
    this._initialized = true;

    // 1. Enforce touch-action: none so touches don't trigger scroll/zoom
    this.canvas.style.touchAction = 'none';
    this.canvas.style.userSelect = 'none';
    this.canvas.style.webkitUserSelect = 'none';

    // 2. Cache initial bounding rect
    this._updateRect();

    // 3. Pointer event listeners
    this.canvas.addEventListener('pointerdown',   this._onPointerDown,   { passive: false });
    this.canvas.addEventListener('pointermove',   this._onPointerMove,   { passive: false });
    this.canvas.addEventListener('pointerup',     this._onPointerUp,     { passive: false });
    this.canvas.addEventListener('pointercancel', this._onPointerCancel, { passive: false });

    // 4. Global window listeners for drag out-of-bounds & keyboard
    window.addEventListener('pointerup',   this._onPointerUp,   { passive: false });
    window.addEventListener('keydown',     this._onKeyDown,     { passive: false });
    window.addEventListener('resize',      this._onResize);
    window.addEventListener('scroll',      this._onResize,      { passive: true });
    window.addEventListener('orientationchange', this._onResize);

    // 5. Prevent context menu during play
    this.canvas.addEventListener('contextmenu', this._onContextMenu);

    // 6. Global first-gesture audio unlock
    const unlockAudio = () => {
      if (!this._audioUnlocked) {
        this._audioUnlocked = true;
        try {
          SFXLib.resume();
        } catch (e) {}
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      }
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });

    console.log('[InputManager] Initialized with unified pointer & touch pipeline.');
  }

  setCamera(cam) {
    this.camera = cam;
  }

  setScene(scn) {
    this.scene = scn;
  }

  _updateRect() {
    if (this.canvas) {
      this._cachedRect = this.canvas.getBoundingClientRect();
    }
  }

  _onResize() {
    this._updateRect();
  }

  _onContextMenu(e) {
    e.preventDefault();
  }

  /**
   * Compute normalized device coordinates (NDC) strictly from canvas bounding rect.
   * If pointer lock is active, return center-screen (0, 0).
   */
  getNDC(clientX, clientY) {
    if (document.pointerLockElement === this.canvas) {
      return this._mouseNDC.set(0, 0);
    }

    if (!this._cachedRect || this._cachedRect.width === 0) {
      this._updateRect();
    }

    const rect = this._cachedRect || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this._mouseNDC.set(x, y);
    return this._mouseNDC;
  }

  /* ── Interactive 3D Targets & Hit Proxies ────────────────────── */

  /**
   * Create an invisible enlarged hit proxy mesh (at least 44px hit bounds)
   * @param {THREE.Object3D} target
   * @param {Object} [opts]
   * @param {number} [opts.radius=1.2]
   * @param {'sphere'|'box'} [opts.shape='sphere']
   * @param {THREE.Vector3} [opts.size]
   * @returns {THREE.Mesh}
   */
  createHitProxy(target, opts = {}) {
    const shape = opts.shape || 'sphere';
    let geom;
    if (shape === 'box') {
      const sx = opts.size ? opts.size.x : 1.4;
      const sy = opts.size ? opts.size.y : 1.4;
      const sz = opts.size ? opts.size.z : 1.4;
      geom = new THREE.BoxGeometry(sx, sy, sz);
    } else {
      const radius = opts.radius || 1.2;
      geom = new THREE.SphereGeometry(radius, 12, 10);
    }

    // Material must be visible to raycaster, but transparent to user!
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      wireframe: false
    });

    const proxy = new THREE.Mesh(geom, mat);
    proxy.name = `hit_proxy_${target.name || target.id || 'obj'}`;
    proxy.userData._isHitProxy = true;
    proxy.userData._targetOwner = target;

    // Attach proxy to target
    target.add(proxy);
    return proxy;
  }

  /**
   * Register an interactive target with hover, press, click, and keyboard triggers
   * @param {string|number} id
   * @param {THREE.Object3D} object
   * @param {Object} handlers
   */
  registerTarget(id, object, handlers = {}) {
    if (!object) return;

    // If no proxy exists and requested, create one
    let proxy = handlers.proxy || null;
    if (!proxy && handlers.createProxy !== false) {
      proxy = this.createHitProxy(object, {
        radius: handlers.hitRadius || 1.3,
        shape: handlers.hitShape || 'sphere',
        size: handlers.hitSize
      });
    }

    const entry = {
      id,
      object,
      proxy: proxy || object,
      onHover: handlers.onHover || null,
      onPress: handlers.onPress || null,
      onClick: handlers.onClick || null,
      key: handlers.key ? String(handlers.key).toLowerCase() : null,
      sound: handlers.sound || 'click',
      userData: handlers.data || {}
    };

    // Mark object & proxy
    object.userData._inputTargetId = id;
    if (proxy) proxy.userData._inputTargetId = id;

    this._targets.set(String(id), entry);
    return entry;
  }

  unregisterTarget(id) {
    const entry = this._targets.get(String(id));
    if (entry) {
      if (entry.proxy && entry.proxy !== entry.object && entry.proxy.parent) {
        entry.proxy.parent.remove(entry.proxy);
        entry.proxy.geometry?.dispose();
        entry.proxy.material?.dispose();
      }
      this._targets.delete(String(id));
    }
  }

  clearTargets() {
    this._targets.forEach(entry => {
      if (entry.proxy && entry.proxy !== entry.object && entry.proxy.parent) {
        entry.proxy.parent.remove(entry.proxy);
        entry.proxy.geometry?.dispose();
        entry.proxy.material?.dispose();
      }
    });
    this._targets.clear();
    this._hoveredTarget = null;
    this._pressedTarget = null;
    if (this.canvas) this.canvas.style.cursor = 'default';
  }

  getTargets() {
    return Array.from(this._targets.values());
  }

  /* ── Raycasting Resolution ───────────────────────────────────── */

  /**
   * Raycast against all registered targets or provided objects
   * @param {number} clientX
   * @param {number} clientY
   * @param {THREE.Object3D[]} [customMeshes]
   * @returns {Object|null}
   */
  raycastTarget(clientX, clientY, customMeshes = null) {
    if (!this.camera) return null;

    const ndc = this.getNDC(clientX, clientY);
    this._raycaster.setFromCamera(ndc, this.camera);

    let candidates = [];
    if (customMeshes && customMeshes.length > 0) {
      candidates = customMeshes;
    } else {
      candidates = Array.from(this._targets.values()).map(t => t.proxy || t.object);
    }

    if (candidates.length === 0) return null;

    const hits = this._raycaster.intersectObjects(candidates, true);
    if (hits.length === 0) return null;

    // Resolve hit object to registered target
    const firstHit = hits[0];
    let obj = firstHit.object;

    // Check hit proxy first
    if (obj.userData?._targetOwner) {
      obj = obj.userData._targetOwner;
    }

    // Traverse upwards to find registered target
    while (obj && !this._targets.has(String(obj.userData?._inputTargetId)) && obj.parent) {
      obj = obj.parent;
    }

    const targetId = obj?.userData?._inputTargetId;
    if (targetId !== undefined && this._targets.has(String(targetId))) {
      return {
        target: this._targets.get(String(targetId)),
        point: firstHit.point,
        distance: firstHit.distance,
        rawHit: firstHit
      };
    }

    return null;
  }

  /* ── Pointer Event Handlers ──────────────────────────────────── */

  _onPointerDown(e) {
    this._activePointers.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
      target: e.target,
      time: performance.now()
    });

    // Capture pointer for drags
    if (this.canvas && this.canvas.setPointerCapture) {
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch (err) {}
    }

    const hitResult = this.raycastTarget(e.clientX, e.clientY);
    if (hitResult) {
      const entry = hitResult.target;
      this._pressedTarget = entry;

      // 1. Immediate visual press feedback (micro scale 0.95 or emissive jump within 1 frame)
      this._applyPressFeedback(entry.object, true);

      // 2. Play tactile click sound
      SFXLib.click();

      // 3. Trigger callback
      if (typeof entry.onPress === 'function') {
        entry.onPress(entry, hitResult);
      }
      if (typeof entry.onClick === 'function') {
        entry.onClick(entry, hitResult);
      }
    }

    // Pass to custom drag handler
    if (this._dragHandler) {
      this._isDragging = true;
      this._dragPointerId = e.pointerId;
      this._dragHandler.onDown?.(e, hitResult);
    }
  }

  _onPointerMove(e) {
    const ptr = this._activePointers.get(e.pointerId);
    if (ptr) {
      ptr.clientX = e.clientX;
      ptr.clientY = e.clientY;
    }

    // Drag handling
    if (this._isDragging && this._dragHandler && this._dragPointerId === e.pointerId) {
      this._dragHandler.onMove?.(e);
      return;
    }

    // Hover detection
    const hitResult = this.raycastTarget(e.clientX, e.clientY);
    const newTarget = hitResult ? hitResult.target : null;

    if (newTarget !== this._hoveredTarget) {
      // Unhover previous
      if (this._hoveredTarget) {
        this._applyHoverFeedback(this._hoveredTarget.object, false);
        if (typeof this._hoveredTarget.onHover === 'function') {
          this._hoveredTarget.onHover(false, this._hoveredTarget);
        }
      }

      this._hoveredTarget = newTarget;

      // Hover new
      if (this._hoveredTarget) {
        if (this.canvas) this.canvas.style.cursor = 'pointer';
        this._applyHoverFeedback(this._hoveredTarget.object, true);
        SFXLib.playTone(900, 0.03, 'sine', 0.02); // soft tactile tick
        if (typeof this._hoveredTarget.onHover === 'function') {
          this._hoveredTarget.onHover(true, this._hoveredTarget);
        }
      } else {
        if (this.canvas) this.canvas.style.cursor = 'default';
      }
    }
  }

  _onPointerUp(e) {
    this._activePointers.delete(e.pointerId);

    if (this.canvas && this.canvas.releasePointerCapture) {
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }

    if (this._pressedTarget) {
      this._applyPressFeedback(this._pressedTarget.object, false);
      this._pressedTarget = null;
    }

    if (this._isDragging && this._dragPointerId === e.pointerId) {
      this._isDragging = false;
      this._dragPointerId = null;
      this._dragHandler?.onUp?.(e);
    }
  }

  _onPointerCancel(e) {
    this._onPointerUp(e);
  }

  /* ── Keyboard Handling ───────────────────────────────────────── */

  _onKeyDown(e) {
    // Avoid capturing inputs inside typing fields
    if (e.target && e.target.matches('input, textarea, select')) return;

    const key = e.key.toLowerCase();

    // Check registered target key shortcuts (1-9, enter, space)
    for (const entry of this._targets.values()) {
      if (entry.key && entry.key === key) {
        e.preventDefault();
        this._triggerTarget(entry);
        return;
      }
    }
  }

  _triggerTarget(entry) {
    this._applyPressFeedback(entry.object, true);
    SFXLib.click();
    setTimeout(() => this._applyPressFeedback(entry.object, false), 120);

    if (typeof entry.onPress === 'function') entry.onPress(entry);
    if (typeof entry.onClick === 'function') entry.onClick(entry);
  }

  /* ── Visual Feedback Helpers ─────────────────────────────────── */

  _applyHoverFeedback(obj, isHovered) {
    if (!obj) return;
    if (isHovered) {
      obj.userData._prevScale = obj.scale.clone();
      obj.scale.multiplyScalar(1.06);
      this._setEmissivePulse(obj, 1.4);
    } else {
      if (obj.userData._prevScale) {
        obj.scale.copy(obj.userData._prevScale);
        delete obj.userData._prevScale;
      } else {
        obj.scale.set(1, 1, 1);
      }
      this._setEmissivePulse(obj, 0.4);
    }
  }

  _applyPressFeedback(obj, isPressed) {
    if (!obj) return;
    if (isPressed) {
      obj.userData._pressPrevScale = obj.scale.clone();
      obj.scale.multiplyScalar(0.92);
    } else {
      if (obj.userData._pressPrevScale) {
        obj.scale.copy(obj.userData._pressPrevScale);
        delete obj.userData._pressPrevScale;
      }
    }
  }

  _setEmissivePulse(obj, intensity) {
    obj.traverse(child => {
      if (child.material && child.material.emissive) {
        child.material.emissiveIntensity = intensity;
      }
    });
  }

  /* ── Drag API ────────────────────────────────────────────────── */

  setDragHandler(handler) {
    this._dragHandler = handler;
  }

  /* ── Automated Input Self-Test (window.__dev.testInput) ──────── */

  /**
   * Programmatically test raycast accuracy on each interactive object in the active game.
   * Dispatches pointer events at the screen-projected center of each target and checks if hit registers.
   */
  testInput() {
    console.log('%c[InputManager] Running __dev.testInput() Self-Test...', 'color:#00f2fe;font-weight:bold;');
    if (!this.canvas || !this.camera) {
      console.error('[InputManager] Canvas or camera not available for testInput.');
      return { success: false, hits: 0, total: 0, results: [] };
    }

    this._updateRect();
    const rect = this._cachedRect;
    const targets = Array.from(this._targets.values());
    const results = [];

    console.log(`Found ${targets.length} registered interactive targets in active game.`);

    let hitCount = 0;
    const v = new THREE.Vector3();

    targets.forEach(target => {
      // 1. Get 3D world position
      target.object.getWorldPosition(v);

      // 2. Project to 2D NDC
      const projected = v.clone().project(this.camera);

      // 3. Convert NDC to screen client coordinates
      const screenX = rect.left + ((projected.x + 1) / 2) * rect.width;
      const screenY = rect.top + ((-projected.y + 1) / 2) * rect.height;

      // 4. Test raycast directly at this screen location
      const hitResult = this.raycastTarget(screenX, screenY);
      const isHit = hitResult && hitResult.target.id === target.id;

      if (isHit) hitCount++;

      results.push({
        id: target.id,
        name: target.object.name || `Target_${target.id}`,
        worldPos: `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`,
        screenCoords: `(${Math.round(screenX)}px, ${Math.round(screenY)}px)`,
        result: isHit ? '✅ HIT' : '❌ MISSED',
        distance: hitResult ? hitResult.distance.toFixed(2) : 'N/A'
      });
    });

    console.table(results);
    const success = targets.length > 0 ? (hitCount === targets.length) : true;
    console.log(
      `%c[testInput] Result: ${hitCount}/${targets.length} Targets Hit (${success ? 'PASSED 100%' : 'FAILED'})`,
      success ? 'color:#10b981;font-weight:bold;' : 'color:#ef4444;font-weight:bold;'
    );

    return {
      success,
      hitCount,
      totalCount: targets.length,
      results
    };
  }

  dispose() {
    this.clearTargets();
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown',   this._onPointerDown);
      this.canvas.removeEventListener('pointermove',   this._onPointerMove);
      this.canvas.removeEventListener('pointerup',     this._onPointerUp);
      this.canvas.removeEventListener('pointercancel', this._onPointerCancel);
      this.canvas.removeEventListener('contextmenu',   this._onContextMenu);
    }
    window.removeEventListener('pointerup',   this._onPointerUp);
    window.removeEventListener('keydown',     this._onKeyDown);
    window.removeEventListener('resize',      this._onResize);
    window.removeEventListener('scroll',      this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    this._initialized = false;
  }
}
