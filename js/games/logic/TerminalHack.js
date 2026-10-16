/* ═══════════════════════════════════════════════════════════════
   TerminalHack.js — Tier 1 Logic Game (3D)
   Cognitive Domain: Logical deduction, Boolean operators (AND, OR, XOR, NOT).
   Multi-Round Mission: Player reconfigures digital input registers
   to satisfy cryptographic logic gates across sequential rounds.
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
      palette: { primary: '#10b981', secondary: '#064e3b', accent: '#34d399' },
      goalText: 'Configure registers to satisfy root logic parity.'
    });

    this._switches = [];
    this._gates = [];
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._solution = [];
    this._chosenGate = 'AND';
    this._gateRuleText = '';
  }

  build(scene, camera) {
    super.build(scene, camera);

    camera.position.set(0, 2.0, 5.2);
    camera.lookAt(0, 1.8, 0);

    // Cyber terminal console stand
    const consoleGeom = new THREE.BoxGeometry(6.4, 4.2, 0.4);
    const consoleMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8
    });
    const terminal = new THREE.Mesh(consoleGeom, consoleMat);
    terminal.position.set(0, 2, 0);
    this.addObject(terminal);

    // Glowing border frame
    const frameGeom = new THREE.BoxGeometry(6.6, 4.4, 0.2);
    const frameMat = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true });
    const frame = new THREE.Mesh(frameGeom, frameMat);
    frame.position.set(0, 2, 0.1);
    this.addObject(frame);

    // Digital Screen Plate
    const screenGeom = new THREE.PlaneGeometry(5.6, 3.4);
    const screenMat = new THREE.MeshBasicMaterial({
      color: 0x06281e,
      transparent: true,
      opacity: 0.85
    });
    const screen = new THREE.Mesh(screenGeom, screenMat);
    screen.position.set(0, 2, 0.22);
    this.addObject(screen);

    // Status Light Bar
    const barGeom = new THREE.BoxGeometry(4.8, 0.12, 0.05);
    const barMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const bar = new THREE.Mesh(barGeom, barMat);
    bar.position.set(0, 3.2, 0.23);
    this.addObject(bar);

    // Ambient Lighting
    const tLight = new THREE.PointLight(0x34d399, 2.2, 14);
    tLight.position.set(0, 3.2, 2.5);
    this.addObject(tLight);

    if (!this.inputManager) {
      const canvas = document.querySelector('#three-canvas') || window;
      this.listen(canvas, 'pointerdown', (e) => this._onPointerDown(e));
    }
  }

  start(levelParams) {
    if (this.camera) {
      this.camera.position.set(0, 2.0, 5.2);
      this.camera.lookAt(0, 1.8, 0);
    }
    super.start(levelParams);
  }

  setupRound(roundIndex, ramp, levelParams = {}) {
    if (this.finished) return;

    // Clear previous round switches
    this._clearSwitches();

    // Determine number of registers scaling inside level
    let numSwitches;
    if (this.isPractice) {
      numSwitches = 3;
    } else {
      const minSw = Math.min(5, Math.max(3, 3 + Math.floor((this.level - 1) * 0.08)));
      const maxSw = Math.min(6, minSw + (this.level >= 15 ? 2 : 1));
      numSwitches = Math.min(6, Math.round(minSw + ramp * (maxSw - minSw)));
    }

    const startX = -((numSwitches - 1) * 0.95) / 2;

    // Logic gate types available by level
    const gateTypes = (this.level > 15) ? ['XOR', 'NAND', 'PARITY'] : (this.level > 5 ? ['AND', 'OR', 'XOR'] : ['AND', 'OR']);
    this._chosenGate = gateTypes[Math.floor(Math.random() * gateTypes.length)];

    // Build secret solution combination
    this._solution = [];
    for (let i = 0; i < numSwitches; i++) {
      this._solution.push(Math.random() > 0.45 ? 1 : 0);
    }
    // Ensure not all 0s
    if (this._solution.every(v => v === 0)) {
      this._solution[Math.floor(Math.random() * numSwitches)] = 1;
    }

    const activeCount = this._solution.filter(v => v === 1).length;
    this._gateRuleText = `Rule: Root ${this._chosenGate} gate requires ${activeCount} active bits.`;

    for (let i = 0; i < numSwitches; i++) {
      const swGroup = new THREE.Group();
      swGroup.position.set(startX + i * 0.95, 1.35, 0.3);

      const baseGeom = new THREE.CylinderGeometry(0.32, 0.38, 0.15, 24);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
      const base = new THREE.Mesh(baseGeom, baseMat);
      base.rotation.x = Math.PI / 2;
      swGroup.add(base);

      const knobGeom = new THREE.CylinderGeometry(0.19, 0.19, 0.28, 24);
      const knobMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        emissive: 0x0f172a,
        emissiveIntensity: 0.3,
        roughness: 0.2
      });
      const knob = new THREE.Mesh(knobGeom, knobMat);
      knob.rotation.x = Math.PI / 2;
      knob.position.z = 0.1;
      swGroup.add(knob);

      // Indicator LED above switch
      const ledGeom = new THREE.SphereGeometry(0.09, 16, 16);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
      const led = new THREE.Mesh(ledGeom, ledMat);
      led.position.set(0, 0.45, 0.05);
      swGroup.add(led);

      // Neon glow ring around switch base
      const ringGeom = new THREE.RingGeometry(0.32, 0.38, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x334155,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.z = 0.08;
      swGroup.add(ring);

      // Dynamic light source for active illumination
      const swLight = new THREE.PointLight(0x00ff88, 0, 2.0);
      swLight.position.set(0, 0.3, 0.4);
      swGroup.add(swLight);

      const swData = {
        index: i,
        state: 0,
        mesh: swGroup,
        knob,
        knobMat,
        led,
        ledMat,
        ring,
        ringMat,
        swLight
      };
      swGroup.userData = swData;

      this.addObject(swGroup);
      this._switches.push(swData);

      // Register target with InputManager
      this.registerTarget(`switch_${i}`, swGroup, {
        hitRadius: 1.25,
        key: String(i + 1),
        onHover: (hovered) => {
          if (hovered) {
            knobMat.emissiveIntensity = swData.state === 1 ? 2.8 : 0.8;
            ringMat.opacity = swData.state === 1 ? 1.0 : 0.7;
          } else {
            knobMat.emissiveIntensity = swData.state === 1 ? 2.2 : 0.2;
            ringMat.opacity = swData.state === 1 ? 0.9 : 0.4;
          }
        },
        onPress: () => {
          if (this.paused || this.finished || !this.roundActive) return;
          this._toggleSwitch(i);
        }
      });
    }

    if (this.isPractice) {
      EventBus.emit('hud:subtitle', {
        text: `🟢 PRACTICE: Toggle registers [1–${numSwitches}] to match parity. Target: ${activeCount} active bits.`
      });
    } else {
      EventBus.emit('hud:subtitle', {
        text: `⚡ Round ${roundIndex} / ${this.totalRounds}: ${this._gateRuleText}`
      });
    }
  }

  teardownRound(correct, reason) {
    this._clearSwitches();
  }

  _clearSwitches() {
    for (const sw of this._switches) {
      if (this.inputManager) {
        this.inputManager.unregisterTarget(`switch_${sw.index}`);
      }
      if (sw.mesh && sw.mesh.parent) {
        sw.mesh.parent.remove(sw.mesh);
      }
    }
    this._switches = [];
  }

  _toggleSwitch(idx) {
    const sw = this._switches[idx];
    if (!sw || !this.roundActive || this.finished) return;

    this.registerPlayerAction();
    sw.state = sw.state === 1 ? 0 : 1;
    SFXLib.playSwitch?.() || SFXLib.click?.();

    if (sw.state === 1) {
      sw.knobMat.color.setHex(0x10b981);
      sw.knobMat.emissive.setHex(0x00ff88);
      sw.knobMat.emissiveIntensity = 2.4;
      sw.ledMat.color.setHex(0x00ff88);
      sw.ringMat.color.setHex(0x00f2fe);
      sw.ringMat.opacity = 0.95;
      sw.swLight.intensity = 2.8;
    } else {
      sw.knobMat.color.setHex(0x64748b);
      sw.knobMat.emissive.setHex(0x0f172a);
      sw.knobMat.emissiveIntensity = 0.2;
      sw.ledMat.color.setHex(0x334155);
      sw.ringMat.color.setHex(0x334155);
      sw.ringMat.opacity = 0.4;
      sw.swLight.intensity = 0;
    }

    Tween.to(sw.knob.position, { z: sw.state === 1 ? 0.22 : 0.08 }, 0.15, 'easeOutBack').start();

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
      // Round Solved!
      SFXLib.playSuccess?.() || SFXLib.levelStart?.();
      EventBus.emit('hud:subtitle', { text: '✨ Terminal register unlocked! Logic parity verified.' });
      this.setTimeout(() => {
        this.endRound(true);
      }, 500);
    } else {
      EventBus.emit('hud:subtitle', {
        text: `Parity Likeness: ${matches} / ${this._switches.length} registers aligned.`
      });
    }
  }

  _onPointerDown(e) {
    // If managed by unified InputManager, do not process twice
    if (this.inputManager || this.paused || this.finished || !this.roundActive) return;

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

  botPlayRound(willWin = true) {
    if (!this.roundActive || this.finished) return;

    if (willWin) {
      this._solution.forEach((targetState, i) => {
        this.setTimeout(() => {
          if (!this.finished && this.roundActive && this._switches[i]) {
            if (this._switches[i].state !== targetState) {
              this._toggleSwitch(i);
            }
          }
        }, (i + 1) * 350);
      });
    } else {
      // Leave wrong state
      this.setTimeout(() => {
        if (!this.finished && this.roundActive && this._switches[0]) {
          if (this._switches[0].state === this._solution[0]) {
            this._toggleSwitch(0);
          }
        }
      }, 400);
    }
  }

  hint(type) {
    super.hint(type);
    if (type === 'reveal' || type === 'aria_clue') {
      for (let i = 0; i < this._switches.length; i++) {
        if (this._switches[i].state !== this._solution[i]) {
          this._toggleSwitch(i);
          EventBus.emit('hud:subtitle', { text: `🤖 ARIA: Register [${i + 1}] locked to required bit ${this._solution[i]}.` });
          break;
        }
      }
    } else if (type === 'slow_time') {
      EventBus.emit('hud:subtitle', { text: '⏳ Logic clock cycle slowed.' });
    }
  }

  exit() {
    this._clearSwitches();
    super.exit();
  }
}
