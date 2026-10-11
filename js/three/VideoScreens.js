/* ═══════════════════════════════════════════════════════════════
   VideoScreens.js
   In-world screens using CanvasTexture animated procedurally.
   Drop a real video at assets/video/clue1.mp4 and it auto-switches
   to THREE.VideoTexture.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

export class VideoScreens {
  constructor(scene) {
    this.scene    = scene;
    this._screens = []; // { mesh, update: fn }
    this._time    = 0;
  }

  init() {
    // Hub center ceiling display — ambient animated canvas
    this._addAnimatedScreen(
      new THREE.Vector3(0, 4.8, 0),
      new THREE.Euler(-Math.PI / 2, 0, 0),
      6, 6, 'hub'
    );

    // Memory lab hint screen (optional real video)
    this._addVideoOrCanvas(
      new THREE.Vector3(0, 3, -32),   // inside memory vault area
      new THREE.Euler(0, 0, 0),
      5, 3, 'assets/video/clue1.mp4', 'memory'
    );
  }

  _addAnimatedScreen(pos, rot, w, h, id) {
    const cv  = document.createElement('canvas');
    cv.width  = 512; cv.height = 512;
    const ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    const mat = new THREE.MeshStandardMaterial({
      map: tex, emissive: new THREE.Color(0x001122), emissiveIntensity: 0.6, side: THREE.FrontSide
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.copy(pos);
    mesh.rotation.copy(rot);
    this.scene.add(mesh);

    const update = (t) => {
      ctx.fillStyle = '#010f1e';
      ctx.fillRect(0, 0, 512, 512);
      // Animated neural network visualization
      ctx.strokeStyle = `hsla(${(t * 30) % 360}, 80%, 60%, 0.7)`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 12; i++) {
        const x1 = 128 + Math.sin(t * 0.8 + i) * 100;
        const y1 = 128 + Math.cos(t * 0.6 + i * 0.5) * 100;
        const x2 = 384 + Math.sin(t * 0.7 + i * 1.2) * 100;
        const y2 = 384 + Math.cos(t * 0.9 + i * 0.3) * 100;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x1, y1, 5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(t*50+i*30)%360},80%,65%,0.9)`;
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,200,255,0.15)';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MIND LAB RESEARCH FACILITY', 256, 30);
      ctx.fillStyle = 'rgba(0,180,255,0.5)';
      ctx.font = '14px monospace';
      ctx.fillText(`ARIA COGNITIVE SYSTEM v3.14`, 256, 490);
      tex.needsUpdate = true;
    };

    this._screens.push({ mesh, update });
  }

  async _addVideoOrCanvas(pos, rot, w, h, videoSrc, id) {
    // Try to load real video; fall back to animated canvas
    let tex, videoEl;
    let useCanvas = true;

    try {
      // Check if video file exists via HEAD request
      const res = await fetch(videoSrc, { method: 'HEAD' });
      if (res.ok) useCanvas = false;
    } catch {}

    if (!useCanvas) {
      videoEl = document.createElement('video');
      videoEl.src    = videoSrc;
      videoEl.loop   = true;
      videoEl.muted  = true;
      videoEl.crossOrigin = 'anonymous';
      videoEl.style.display = 'none';
      document.body.appendChild(videoEl);
      videoEl.play().catch(() => { useCanvas = true; });
      tex = new THREE.VideoTexture(videoEl);
      tex.colorSpace = THREE.SRGBColorSpace;
    }

    if (useCanvas) {
      // Procedural "clue" canvas: moving coloured shapes
      const cv  = document.createElement('canvas');
      cv.width  = 640; cv.height = 360;
      const ctx = cv.getContext('2d');
      tex = new THREE.CanvasTexture(cv);

      this._screens.push({
        mesh: null,
        videoEl: null,
        update: (t) => {
          ctx.fillStyle = '#000810';
          ctx.fillRect(0, 0, 640, 360);
          for (let i = 0; i < 8; i++) {
            const x = 320 + Math.sin(t * 0.5 + i * 0.8) * 250;
            const y = 180 + Math.cos(t * 0.4 + i * 1.1) * 130;
            const r = 20 + Math.sin(t + i) * 15;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${(t * 40 + i * 45) % 360},80%,55%,0.85)`;
            ctx.fill();
          }
          // Text overlay
          ctx.fillStyle = 'rgba(100,200,255,0.6)';
          ctx.font = 'bold 20px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('▶ CLUE SEQUENCE — Observe carefully', 320, 350);
          ctx.fillText(`Drop real video at: ${videoSrc}`, 320, 28);
          tex.needsUpdate = true;
        }
      });
    }

    const mat  = new THREE.MeshStandardMaterial({ map: tex, emissive: 0x001122, emissiveIntensity: 0.3 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.copy(pos);
    mesh.rotation.copy(rot);
    this.scene.add(mesh);

    const last = this._screens[this._screens.length - 1];
    last.mesh = mesh;
    last.videoEl = videoEl ?? null;
  }

  update(delta) {
    this._time += delta;
    for (const s of this._screens) s.update?.(this._time);
  }

  dispose() {
    for (const s of this._screens) {
      s.videoEl?.pause();
      s.videoEl?.remove();
      s.mesh?.material?.map?.dispose();
      s.mesh?.material?.dispose();
      s.mesh?.geometry?.dispose();
      if (s.mesh) this.scene.remove(s.mesh);
    }
    this._screens = [];
  }
}
