/* ═══════════════════════════════════════════════════════════════
   LogicLab.js — Sector Climax & Final Core Terminal (Logical Reasoning)
   Features:
   - Holographic deduction terminal with procedural number sequences
   - 4 interactive cybernetic lever consoles
   - Final Core Trial: Multi-skill deduction climax
   - Pointer-lock center raycasting & click fallback
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { LabBase } from './LabBase.js';
import { EventBus } from '../../core/EventBus.js';

export class LogicLab extends LabBase {
  constructor(ctx) {
    super(ctx);
    this._category   = 'logical';
    this._title      = 'FINAL CORE // LOGIC TERMINAL';
    this._levers     = [];
    this._challenge  = null;
    this._isBoss     = false;

    this._onInteract = this._onInteract.bind(this);
    this._onCanvasClick = this._onCanvasClick.bind(this);
  }

  _buildScene() {
    this._group.position.set(0, 0, -15);

    // Holographic Terminal Display Screen
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = 256;
    this._displayCtx = cv.getContext('2d');
    this._displayTex = new THREE.CanvasTexture(cv);

    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 2.5),
      new THREE.MeshStandardMaterial({
        map: this._displayTex,
        emissive: 0x003366,
        emissiveIntensity: 0.9
      })
    );
    screenMesh.position.set(0, 3.6, -8.5);
    this._group.add(screenMesh);

    // 4 Lever Consoles
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * 2.4;
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.4, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x0e1c2e, metalness: 0.8, roughness: 0.3 })
      );
      base.position.set(x, 0.2, -4);
      this._group.add(base);

      // Interactive Lever Handle
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 1.1, 16),
        new THREE.MeshStandardMaterial({
          color: 0x00e5ff,
          emissive: 0x0088cc,
          emissiveIntensity: 1.2
        })
      );
      handle.position.set(x, 0.8, -4);
      handle.userData = { leverIdx: i };
      this._group.add(handle);

      this._levers.push({ base, handle, val: null, x });
    }
  }

  _onEnter(params) {
    this._isBoss = !!params.isBoss;
    this._attempts = 0;

    this._generateChallenge();
    this._renderScreen();

    if (this._isBoss) {
      this.aria?.speak("Final Core Protocol: Neural Breach Threshold. Solve the final algorithmic deduction to unlock facility exit.", 'unsettling');
      this.spatialAudio?.playStinger('boss_start');
    } else {
      this.aria?.speak("Deduce the sequence pattern on the terminal. Pull the lever corresponding to the missing element.", 'instruction');
    }

    this._bindControls();
  }

  _generateChallenge() {
    const start = Math.floor(Math.random() * 8) + 2;
    const step = Math.floor(Math.random() * 4) + 2;
    const ruleTypes = ['arithmetic', 'geometric', 'fibonacci', 'alternating'];
    const rule = this._isBoss ? 'fibonacci' : ruleTypes[Math.floor(Math.random() * ruleTypes.length)];

    let seq = [];
    let ans = 0;

    if (rule === 'arithmetic') {
      seq = [start, start + step, start + step * 2, start + step * 3];
      ans = start + step * 4;
    } else if (rule === 'geometric') {
      seq = [start, start * 2, start * 4, start * 8];
      ans = start * 16;
    } else if (rule === 'fibonacci') {
      seq = [2, 3, 5, 8, 13];
      ans = 21;
    } else {
      seq = [start, start + 3, start + 1, start + 4, start + 2];
      ans = start + 5;
    }

    // 4 Options
    const opts = [ans, ans + step, ans - step, ans + 4].sort(() => Math.random() - 0.5);

    this._challenge = {
      question: seq.join(', ') + ', ?',
      answer: ans,
      options: opts
    };

    // Assign options to levers
    this._levers.forEach((l, idx) => {
      l.val = opts[idx];
    });
  }

  _renderScreen() {
    const ctx = this._displayCtx;
    ctx.fillStyle = '#030813';
    ctx.fillRect(0, 0, 1024, 256);

    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 1008, 240);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '22px "JetBrains Mono", monospace';
    ctx.fillText('NEURAL BREACH // FINAL CORE TERMINAL', 40, 48);

    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 54px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this._challenge.question, 512, 125);

    // Render options above levers
    ctx.font = 'bold 36px "JetBrains Mono", monospace';
    this._challenge.options.forEach((opt, idx) => {
      const x = 160 + idx * 230;
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`[${opt}]`, x, 210);
    });

    this._displayTex.needsUpdate = true;
  }

  _bindControls() {
    EventBus.on('player:interact', this._onInteract);
    this.scene3d.renderer.domElement.addEventListener('click', this._onCanvasClick);
  }

  _unbindControls() {
    EventBus.off('player:interact', this._onInteract);
    this.scene3d.renderer.domElement.removeEventListener('click', this._onCanvasClick);
  }

  _onInteract() {
    const hits = this.raycastCenter(this._levers.map(l => l.handle));
    if (hits.length > 0) this._pullLever(hits[0].object);
  }

  _onCanvasClick(e) {
    const handles = this._levers.map(l => l.handle);
    if (document.pointerLockElement) {
      const hits = this.raycastCenter(handles);
      if (hits.length > 0) this._pullLever(hits[0].object);
      return;
    }

    const rect = this.scene3d.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this._raycaster.setFromCamera(mouse, this.camera);
    const hits = this._raycaster.intersectObjects(handles);
    if (hits.length > 0) this._pullLever(hits[0].object);
  }

  _pullLever(handleMesh) {
    this._attempts++;
    const idx = handleMesh.userData.leverIdx;
    const selectedVal = this._challenge.options[idx];
    const isCorrect = (selectedVal === this._challenge.answer);

    // Lever pull animation
    handleMesh.rotation.x = Math.PI / 4;

    if (isCorrect) {
      handleMesh.material.emissive.setHex(0x00ff88);
      this.spatialAudio?.playTone(783.99, 0.3, 'sine', 0.3);
      EventBus.emit('juice:popup', { text: 'TERMINAL DECRYPTED', color: '#00ff88' });
      this._unbindControls();

      const winTimer = setTimeout(() => {
        this._complete(true, { isBoss: this._isBoss, val: selectedVal });
      }, 600);
      this._timeouts.add(winTimer);
    } else {
      handleMesh.material.emissive.setHex(0xff3344);
      this.spatialAudio?.playTone(130.81, 0.35, 'sawtooth', 0.3);
      EventBus.emit('juice:popup', { text: 'DECRYPTION FAILED', color: '#ff3344' });
      this._unbindControls();

      const failTimer = setTimeout(() => {
        this._complete(false, { isBoss: this._isBoss, val: selectedVal });
      }, 700);
      this._timeouts.add(failTimer);
    }
  }

  _giveHint() {
    // Show rule type on terminal
    EventBus.emit('juice:popup', { text: 'CHECK SEQUENCE RATIOS', color: '#fbbf24' });
  }

  _onExit() {
    this._unbindControls();
    this._levers.forEach(l => {
      l.handle.rotation.x = 0;
      l.handle.material.emissive.setHex(0x0088cc);
    });
  }
}
