/* ═══════════════════════════════════════════════════════════════
   LogicLab.js
   Holographic wall shows a number sequence; player pulls the
   correct lever from 4 options.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { LabBase } from './LabBase.js';

// Sequence banks by difficulty (reused from 2D challengePool logic)
const SEQUENCES = {
  1: [{ q:'2, 4, 6, 8, ?', a:10, opts:[9,10,11,12] },
      { q:'5, 10, 15, 20, ?', a:25, opts:[22,23,25,30] },
      { q:'3, 6, 9, 12, ?', a:15, opts:[13,14,15,18] }],
  2: [{ q:'2, 4, 8, 16, ?', a:32, opts:[24,30,32,36] },
      { q:'1, 4, 9, 16, ?', a:25, opts:[20,22,25,36] },
      { q:'100, 50, 25, ?', a:12.5, opts:[10,12.5,15,20] }],
  3: [{ q:'1,1,2,3,5,8,?', a:13, opts:[10,11,12,13] },
      { q:'2,6,12,20,30,?', a:42, opts:[36,40,42,45] },
      { q:'3,5,9,15,23,?', a:33, opts:[30,31,33,35] }],
  4: [{ q:'2,3,5,7,11,13,?', a:17, opts:[14,15,17,19] },
      { q:'1,8,27,64,125,?', a:216, opts:[196,200,216,225] },
      { q:'1,2,6,24,120,?', a:720, opts:[360,600,720,840] }],
  5: [{ q:'31,29,23,19,17,?', a:13, opts:[11,13,15,16] },
      { q:'1,3,4,7,11,18,?', a:29, opts:[25,27,29,32] },
      { q:'2,5,11,23,47,?', a:95, opts:[89,92,95,97] }],
};

export class LogicLab extends LabBase {
  constructor(ctx) {
    super(ctx);
    this._category = 'logical';
    this._levers   = [];
    this._clickHandler = null;
    this._challenge = null;
  }

  _buildScene() {
    this._group.position.set(0, 0, -15);

    // Back wall holographic display
    const displayCanvas = document.createElement('canvas');
    displayCanvas.width = 1024; displayCanvas.height = 256;
    this._displayCtx = displayCanvas.getContext('2d');
    this._displayTex = new THREE.CanvasTexture(displayCanvas);
    const display = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 2.5),
      new THREE.MeshStandardMaterial({ map: this._displayTex, emissive: 0x002244, emissiveIntensity: 0.8 })
    );
    display.position.set(0, 3.5, -8.5);
    this._group.add(display);

    // 4 lever consoles
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 2.5;
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.3, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.8, roughness: 0.3 })
      );
      base.position.set(x, 0.15, -3);
      this._group.add(base);

      // Lever rod
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 })
      );
      rod.position.set(x, 0.9, -3);
      rod.rotation.z = -0.3;
      this._group.add(rod);

      // Lever label canvas
      const lc = document.createElement('canvas');
      lc.width = 256; lc.height = 128;
      this._levers.push({
        base, rod,
        labelCanvas: lc,
        labelCtx: lc.getContext('2d'),
        labelTex: null,
        optIdx: i
      });

      // Label plane
      const lTex = new THREE.CanvasTexture(lc);
      this._levers[i].labelTex = lTex;
      const labelPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 0.8),
        new THREE.MeshStandardMaterial({ map: lTex, emissive: 0x001122, emissiveIntensity: 0.5 })
      );
      labelPlane.position.set(x, 0.5, -2.4);
      labelPlane.userData = { leverIdx: i };
      this._group.add(labelPlane);
      this._levers[i].plane = labelPlane;
    }

    // Overhead accent light
    const light = new THREE.PointLight(0x00aaff, 1.5, 20);
    light.position.set(0, 5, -5);
    this._group.add(light);
  }

  _onEnter(diff) {
    const bank = SEQUENCES[diff] ?? SEQUENCES[3];
    this._challenge = bank[Math.floor(Math.random() * bank.length)];
    this._updateDisplay(this._challenge.q);
    this._updateLevers(this._challenge.opts, this._challenge.a);
    this.aria?.speak(`Complete the number sequence: ${this._challenge.q}`, 'instruction');

    this._clickHandler = (e) => this._onCanvasClick(e);
    this.scene3d.renderer.domElement.addEventListener('click', this._clickHandler);
  }

  _updateDisplay(text) {
    const ctx = this._displayCtx;
    ctx.fillStyle = '#001122';
    ctx.fillRect(0, 0, 1024, 256);
    // Scanlines
    ctx.fillStyle = 'rgba(0,180,255,0.05)';
    for (let y = 0; y < 256; y += 4) ctx.fillRect(0, y, 1024, 2);
    ctx.fillStyle = '#00ccff';
    ctx.font = 'bold 64px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 512, 128);
    this._displayTex.needsUpdate = true;
  }

  _updateLevers(opts, answer) {
    opts.forEach((val, i) => {
      const lev = this._levers[i];
      const ctx = lev.labelCtx;
      ctx.fillStyle = '#0a1a2a';
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = '#44aaff';
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(val), 128, 64);
      lev.labelTex.needsUpdate = true;
      lev.answer = val === answer;
      lev.value  = val;
    });
  }

  _onCanvasClick(e) {
    const rect   = this.scene3d.renderer.domElement.getBoundingClientRect();
    const mouse  = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width)  * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, this.scene3d.camera);
    const planes = this._levers.map(l => l.plane);
    const hits   = ray.intersectObjects(planes);
    if (!hits.length) return;

    const idx    = hits[0].object.userData.leverIdx;
    const lever  = this._levers[idx];
    this._attempts++;

    // Animate lever pull
    const rod = lever.rod;
    const orig = rod.rotation.z;
    rod.rotation.z = 0.6;
    setTimeout(() => { rod.rotation.z = orig; }, 400);

    if (lever.answer) {
      lever.labelCtx.fillStyle = '#00ff88';
      lever.labelCtx.fillRect(0, 0, 256, 128);
      lever.labelCtx.fillStyle = '#003322';
      lever.labelCtx.font = 'bold 48px monospace';
      lever.labelCtx.textAlign = 'center';
      lever.labelCtx.textBaseline = 'middle';
      lever.labelCtx.fillText('✓ ' + lever.value, 128, 64);
      lever.labelTex.needsUpdate = true;
      this.spatialAudio?.playTone(660, 0.2, 'sine', 0.4);
      this.scene3d.renderer.domElement.removeEventListener('click', this._clickHandler);
      setTimeout(() => this._complete(true, this._attempts), 600);
    } else {
      lever.labelCtx.fillStyle = '#ff2200';
      lever.labelCtx.fillRect(0, 0, 256, 128);
      lever.labelCtx.fillStyle = '#fff';
      lever.labelCtx.font = 'bold 48px monospace';
      lever.labelCtx.textAlign = 'center';
      lever.labelCtx.textBaseline = 'middle';
      lever.labelCtx.fillText('✗ ' + lever.value, 128, 64);
      lever.labelTex.needsUpdate = true;
      this.spatialAudio?.playTone(100, 0.3, 'sawtooth', 0.3);
      this.scene3d.renderer.domElement.removeEventListener('click', this._clickHandler);
      setTimeout(() => this._complete(false, this._attempts), 600);
    }
  }

  _onExit() {
    if (this._clickHandler) {
      this.scene3d.renderer.domElement.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
  }

  _giveHint() {
    // Eliminate one wrong lever
    const wrongLevers = this._levers.filter(l => !l.answer);
    if (!wrongLevers.length) return;
    const target = wrongLevers[Math.floor(Math.random() * wrongLevers.length)];
    target.labelCtx.fillStyle = '#220011';
    target.labelCtx.fillRect(0, 0, 256, 128);
    target.labelCtx.fillStyle = '#ff4444';
    target.labelCtx.font = 'bold 36px monospace';
    target.labelCtx.textAlign = 'center';
    target.labelCtx.textBaseline = 'middle';
    target.labelCtx.fillText('✗ WRONG', 128, 64);
    target.labelTex.needsUpdate = true;
  }
}
