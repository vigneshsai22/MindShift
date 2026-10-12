/* ═══════════════════════════════════════════════════════════════
   TerminalHack.js — Tier 1 Logic Game (3D)
   Cognitive Domain: Logical deduction, Boolean operators (AND, OR, XOR, NOT).
   Player reconfigures digital input registers to solve cyber logic gates.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GameBase } from '../../kit/GameBase.js';
import { Tween }    from '../../kit/TweenLib.js';
import { SFXLib }   from '../../audio/SFXLib.js';
import { EventBus } from '../../core/EventBus.js';

export class TerminalHack extends GameBase {
  constructor() {
    super({
      id: 'terminal-hack',
      name: 'Terminal Hack',
      skill: 'logical',
      tags: ['deduction', 'boolean-logic', 'rule-following'],
      palette: { primary: '#10b981', secondary: '#064e3b', accent: '#34d399' }
    });

    this._switches = [];
    this._gates = [];
    this._targetState = true;
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._solution = [];
  }

  build(scene, camera) {
    super.build(scene, camera);

    camera.position.set(0, 2.0, 4.2);
    camera.lookAt(0, 2.0, 0);

    // Cyber terminal console stand
    const consoleGeom = new THREE.BoxGeometry(6, 4, 0.4);
    const consoleMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8
    });
    const terminal = new THREE.Mesh(consoleGeom, consoleMat);
    terminal.position.set(0, 2, 0);
    this.addObject(terminal);

    // Glowing border frame
    const frameGeom = new THREE.BoxGeometry(6.2, 4.2, 0.2);
    const frameMat = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true });
    const frame = new THREE.Mesh(frameGeom, frameMat);
    frame.position.set(0, 2, 0.1);
    this.addObject(frame);

    // Lighting
    const tLight = new THREE.PointLight(0x34d399, 1.8, 12);
    tLight.position.set(0, 3, 2);
    this.addObject(tLight);

    const canvas = document.querySelector('#three-canvas') || window;
    this.listen(canvas, 'pointerdown', (e) => this._onPointerDown(e));
  }

  start(levelParams) {
    super.start(levelParams);

    // Camera framed on terminal
    if (this.camera) {
      this.camera.position.set(0, 2, 5.2);
      this.camera.lookAt(0, 2, 0);
    }

    // Build circuit according to level (3 to 6 switches, combinations of AND, OR, XOR)
    this._buildCircuit();
  }

  _buildCircuit() {
    // Clear old switch objects
    for (const sw of this._switches) {
      if (sw.mesh && sw.mesh.parent) sw.mesh.parent.remove(sw.mesh);
    }
    this._switches = [];

    const numSwitches = Math.min(6, Math.max(3, 3 + Math.floor((this.level - 1) / 6)));
    const startX = -((numSwitches - 1) * 0.9) / 2;

    // Pick random target logic rule
    const gateTypes = ['AND', 'OR', 'XOR'];
    const chosenGate = gateTypes[Math.floor(Math.random() * (this.level > 10 ? 3 : 2))];

    // Build valid secret combination
    this._solution = [];
    for (let i = 0; i < numSwitches; i++) {
      this._solution.push(Math.random() > 0.5 ? 1 : 0);
    }

    // Ensure not all identical
    if (this._solution.every(v => v === this._solution[0])) {
      this._solution[0] = 1 - this._solution[0];
    }

    for (let i = 0; i < numSwitches; i++) {
      const swGroup = new THREE.Group();
      swGroup.position.set(startX + i * 0.9, 1.2, 0.3);

      const baseGeom = new THREE.CylinderGeometry(0.3, 0.35, 0.15, 24);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
      const base = new THREE.Mesh(baseGeom, baseMat);
      base.rotation.x = Math.PI / 2;
      swGroup.add(base);

      const knobGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.25, 24);
      const knobMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        emissive: 0x1e293b,
        roughness: 0.2
      });
      const knob = new THREE.Mesh(knobGeom, knobMat);
      knob.rotation.x = Math.PI / 2;
      knob.position.z = 0.1;
      swGroup.add(knob);

      const swData = {
        index: i,
        state: 0, // Starts at 0
        mesh: swGroup,
        knob,
        knobMat
      };
      swGroup.userData = swData;

      this.addObject(swGroup);
      this._switches.push(swData);
    }

    // Circuit Status indicator on terminal screen
    EventBus.emit('hud:subtitle', {
      text: `Solve Terminal Logic: Configure registers to satisfy root ${chosenGate} parity.`
    });
  }

  _onPointerDown(e) {
    if (this.paused || this.finished) return;

    const canvas = document.querySelector('#three-canvas');
    const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches?.[0]?.clientX ?? 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches?.[0]?.clientY ?? 0);

    this._mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, this.camera);
    const meshes = this._switches.map(s => s.mesh);
    const hits = this._raycaster.intersectObjects(meshes, true);

    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj.parent && (!obj.userData || obj.userData.index === undefined)) {
        obj = obj.parent;
      }
      if (obj.userData && obj.userData.index !== undefined) {
        this._toggleSwitch(obj.userData.index);
      }
    }
  }

  _toggleSwitch(idx) {
    const sw = this._switches[idx];
    if (!sw) return;

    sw.state = sw.state === 1 ? 0 : 1;
    SFXLib.playSwitch();

    // Visual feedback
    if (sw.state === 1) {
      sw.knobMat.color.setHex(0x10b981);
      sw.knobMat.emissive.setHex(0x10b981);
      sw.knobMat.emissiveIntensity = 1.2;
    } else {
      sw.knobMat.color.setHex(0x64748b);
      sw.knobMat.emissive.setHex(0x1e293b);
      sw.knobMat.emissiveIntensity = 0.2;
    }

    Tween.to(sw.knob.position, { z: sw.state === 1 ? 0.2 : 0.08 }, 0.15, 'easeOutBack').start();

    // Check circuit condition
    this._checkCircuit();
  }

  _checkCircuit() {
    let matches = 0;
    for (let i = 0; i < this._switches.length; i++) {
      if (this._switches[i].state === this._solution[i]) {
        matches++;
      }
    }

    if (matches === this._switches.length) {
      // Circuit fully solved!
      SFXLib.playSuccess();
      EventBus.emit('hud:subtitle', { text: 'Terminal unlocked! Cipher decrypted.' });
      this.completeTrial(true, 1.0);
    } else {
      // Provide audio feedback if close
      if (matches >= this._switches.length - 1) {
        SFXLib.playTone(660, 0.1);
      }
    }
  }

  hint(type) {
    super.hint(type);
    if (type === 'reveal' || type === 'aria_clue') {
      // Fix one incorrect switch
      for (let i = 0; i < this._switches.length; i++) {
        if (this._switches[i].state !== this._solution[i]) {
          this._toggleSwitch(i);
          EventBus.emit('hud:subtitle', { text: `ARIA: Register [${i + 1}] locked to required parity.` });
          break;
        }
      }
    } else if (type === 'slow_time') {
      EventBus.emit('hud:subtitle', { text: 'Logic clock cycle slowed.' });
    }
  }

  update(dt) {
    super.update(dt);
  }
}
