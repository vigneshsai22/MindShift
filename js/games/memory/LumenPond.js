/* ═══════════════════════════════════════════════════════════════
   LumenPond.js — Tier 1 Cognitive Memory Lab (Enhanced 3D)
   Cognitive Domain: Working memory, auditory recall, sequence retention.
   Immersive bioluminescent cyber-pond chamber with rich flora,
   interactive hover physics, water ripples, and harmonic feedback.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GameBase }       from '../../kit/GameBase.js';
import { SequencePlayer } from '../../kit/SequencePlayer.js';
import { Tween }          from '../../kit/TweenLib.js';
import { SFXLib }         from '../../audio/SFXLib.js';
import { EventBus }       from '../../core/EventBus.js';

export class LumenPond extends GameBase {
  constructor() {
    super({
      id: 'lumen-pond',
      name: 'Lumen Pond',
      skill: 'memory',
      tags: ['working-memory', 'auditory-recall', 'sequencing'],
      palette: { primary: '#00f2fe', secondary: '#003344', accent: '#38bdf8' },
      goalText: 'Repeat the illuminated lily pads in exact sequence.'
    });

    this.pads = [];
    this.sequencePlayer = null;
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._inputActive = false;
    this._targetSeq = [];
    this._playerSeq = [];
    this._padCount = 7;
    this._seqLength = 4;
    this._hoveredPad = null;
    this._time = 0;

    // Environmental elements
    this._particles = null;
    this._ripples = [];
    this._caustics = null;
  }

  build(scene, camera) {
    super.build(scene, camera);

    // Optimized responsive camera setup
    camera.position.set(0, 4.8, 5.5);
    camera.lookAt(0, -0.1, 0);

    // ── Atmosphere & Lighting ─────────────────────────────
    const hemiLight = new THREE.HemisphereLight(0x00f2fe, 0x020b14, 1.4);
    this.addObject(hemiLight);

    const mainSpot = new THREE.SpotLight(0x38bdf8, 3.5, 30, Math.PI / 3, 0.5);
    mainSpot.position.set(0, 8, 2);
    mainSpot.target.position.set(0, 0, 0);
    this.addObject(mainSpot);
    this.addObject(mainSpot.target);

    // Ambient pond core glow
    const coreLight = new THREE.PointLight(0x00f2fe, 2.0, 15);
    coreLight.position.set(0, 1.0, 0);
    this.addObject(coreLight);

    // ── Chamber Environment ──────────────────────────────
    // Holographic Cyber Floor Grid
    const gridHelper = new THREE.GridHelper(24, 24, 0x00f2fe, 0x032b44);
    gridHelper.position.y = -0.3;
    this.addObject(gridHelper);

    // Outer Chamber Energy Rings
    for (let r = 0; r < 3; r++) {
      const ringRadius = 7.5 + r * 2.2;
      const ringGeom = new THREE.RingGeometry(ringRadius, ringRadius + 0.08, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f2fe,
        transparent: true,
        opacity: 0.18 - r * 0.04,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.28;
      this.addObject(ring);
    }

    // Glowing Pond Basin
    const basinGeom = new THREE.CylinderGeometry(4.8, 5.2, 0.5, 48);
    const basinMat = new THREE.MeshStandardMaterial({
      color: 0x051322,
      roughness: 0.2,
      metalness: 0.85,
      emissive: 0x011322,
      emissiveIntensity: 0.4
    });
    const basin = new THREE.Mesh(basinGeom, basinMat);
    basin.position.y = -0.35;
    this.addObject(basin);

    // Glowing Neon Pond Rim
    const rimGeom = new THREE.TorusGeometry(4.82, 0.09, 16, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x00f2fe,
      emissiveIntensity: 1.5,
      roughness: 0.1
    });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.1;
    this.addObject(rim);

    // Luminous Translucent Water Surface
    const waterGeom = new THREE.CylinderGeometry(4.75, 4.75, 0.05, 48);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x022538,
      roughness: 0.05,
      metalness: 0.9,
      emissive: 0x001d2d,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.88
    });
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.position.y = -0.12;
    this.addObject(water);

    // Caustics Ring Texture simulation
    const causticsGeom = new THREE.RingGeometry(0.5, 4.6, 32);
    const causticsMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide
    });
    this._caustics = new THREE.Mesh(causticsGeom, causticsMat);
    this._caustics.rotation.x = -Math.PI / 2;
    this._caustics.position.y = -0.09;
    this.addObject(this._caustics);

    // ── Bioluminescent Bio-Spores (Floating Ambient Particles) ──
    const pCount = 100;
    const pGeom = new THREE.BufferGeometry();
    const pPositions = new Float32Array(pCount * 3);
    const pPhases = new Float32Array(pCount);

    for (let i = 0; i < pCount; i++) {
      const rad = Math.random() * 5.0;
      const th = Math.random() * Math.PI * 2;
      pPositions[i * 3]     = Math.cos(th) * rad;
      pPositions[i * 3 + 1] = 0.2 + Math.random() * 3.5;
      pPositions[i * 3 + 2] = Math.sin(th) * rad;
      pPhases[i] = Math.random() * Math.PI * 2;
    }
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    this._pPhases = pPhases;

    const pMat = new THREE.PointsMaterial({
      color: 0x80e5ff,
      size: 0.08,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    this._particles = new THREE.Points(pGeom, pMat);
    this.addObject(this._particles);

    // ── Sculpted Bioluminescent Cyber-Lotuses ──────────────────
    this.pads = [];
    const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33]; // C4, D4, E4, G4, A4, C5, D5
    const colors = [
      0x00f2fe, // Cyan
      0x38bdf8, // Sky Blue
      0x818cf8, // Indigo
      0xc084fc, // Amethyst
      0xf472b6, // Rose
      0xfb923c, // Amber
      0x34d399  // Emerald
    ];

    const count = 7;
    const pondRadius = 3.3;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * pondRadius;
      const z = Math.sin(angle) * pondRadius;

      const padGroup = new THREE.Group();
      padGroup.position.set(x, 0.02, z);

      // 1. Lily Pad Base Platform
      const padGeom = new THREE.CylinderGeometry(0.9, 0.98, 0.1, 24);
      const padMat = new THREE.MeshStandardMaterial({
        color: 0x061e2a,
        roughness: 0.3,
        metalness: 0.7,
        emissive: 0x021018,
        emissiveIntensity: 0.5
      });
      const padLeaf = new THREE.Mesh(padGeom, padMat);
      padLeaf.position.y = 0.02;
      padGroup.add(padLeaf);

      // 2. Pad Neon Circuit Energy Ring
      const circuitRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.82, 0.03, 12, 32),
        new THREE.MeshStandardMaterial({
          color: colors[i],
          emissive: colors[i],
          emissiveIntensity: 1.2,
          roughness: 0.2
        })
      );
      circuitRing.rotation.x = Math.PI / 2;
      circuitRing.position.y = 0.08;
      padGroup.add(circuitRing);

      // 3. Flower Crystal Anchor Group (floats & bobbles)
      const crystalAnchor = new THREE.Group();
      crystalAnchor.position.y = 0.35;

      // Faceted Center Lotus Crystal
      const flowerGeom = new THREE.DodecahedronGeometry(0.48);
      const flowerMat = new THREE.MeshStandardMaterial({
        color: colors[i],
        emissive: colors[i],
        emissiveIntensity: 0.45,
        roughness: 0.15,
        metalness: 0.2,
        transparent: true,
        opacity: 0.95
      });
      const flower = new THREE.Mesh(flowerGeom, flowerMat);
      crystalAnchor.add(flower);

      // Surrounding Lotus Petals (6 petals)
      const petalGeom = new THREE.ConeGeometry(0.22, 0.55, 4);
      const petalMat = new THREE.MeshStandardMaterial({
        color: colors[i],
        emissive: colors[i],
        emissiveIntensity: 0.3,
        roughness: 0.2,
        transparent: true,
        opacity: 0.85
      });
      const petals = [];
      for (let p = 0; p < 6; p++) {
        const pAngle = (p / 6) * Math.PI * 2;
        const petal = new THREE.Mesh(petalGeom, petalMat);
        petal.position.set(Math.cos(pAngle) * 0.35, -0.05, Math.sin(pAngle) * 0.35);
        petal.rotation.z = Math.cos(pAngle) * 0.55;
        petal.rotation.x = -Math.sin(pAngle) * 0.55;
        crystalAnchor.add(petal);
        petals.push(petal);
      }

      // Orbital Energy Halo Ring
      const auraGeom = new THREE.TorusGeometry(0.65, 0.02, 12, 32);
      const auraMat = new THREE.MeshBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.6
      });
      const auraRing = new THREE.Mesh(auraGeom, auraMat);
      auraRing.rotation.x = Math.PI / 3;
      crystalAnchor.add(auraRing);

      padGroup.add(crystalAnchor);

      // High-intensity PointLight for vivid illumination
      const pLight = new THREE.PointLight(colors[i], 0.3, 4.5);
      pLight.position.y = 0.6;
      padGroup.add(pLight);

      // Vertical Light Beam (illuminates during pulse)
      const beamGeom = new THREE.CylinderGeometry(0.04, 0.4, 4.0, 16);
      const beamMat = new THREE.MeshBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      const beam = new THREE.Mesh(beamGeom, beamMat);
      beam.position.y = 2.0;
      padGroup.add(beam);

      // 4. Holographic Node Key/Number Badge [1]–[7] for instant visual affordance
      const badgeTex = this._createBadgeTexture(`[${i + 1}]`, colors[i]);
      const badgeMat = new THREE.MeshBasicMaterial({
        map: badgeTex,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide
      });
      const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.28), badgeMat);
      badge.position.set(0, 0.16, 0.55);
      badge.rotation.x = -Math.PI / 3.2;
      padGroup.add(badge);

      padGroup.userData = {
        index: i,
        flower,
        circuitRing,
        petals,
        badge,
        crystalAnchor,
        auraRing,
        beam,
        light: pLight,
        baseColor: colors[i],
        freq: notes[i],
        baseY: 0.02,
        currentY: 0.02,
        bounceY: 0,
        phase: i * 0.9
      };

      this.addObject(padGroup);
      this.pads.push(padGroup);

      // Register with unified InputManager (hit proxy + keyboard + hover/press feedback)
      this.registerTarget(`pad_${i}`, padGroup, {
        hitRadius: 1.4,
        key: String(i + 1),
        onHover: (hovered) => {
          if (!this._inputActive || this.finished) return;
          if (hovered) {
            Tween.to(padGroup.position, { y: padGroup.userData.baseY + 0.18 }, 0.2, 'easeOutBack').start();
            padGroup.userData.flower.material.emissiveIntensity = 1.3;
            if (padGroup.userData.circuitRing) padGroup.userData.circuitRing.material.emissiveIntensity = 1.8;
            badge.scale.set(1.15, 1.15, 1.15);
          } else {
            Tween.to(padGroup.position, { y: padGroup.userData.baseY }, 0.2, 'easeOutQuad').start();
            padGroup.userData.flower.material.emissiveIntensity = 0.45;
            if (padGroup.userData.circuitRing) padGroup.userData.circuitRing.material.emissiveIntensity = 1.2;
            badge.scale.set(1, 1, 1);
          }
        },
        onPress: () => {
          if (!this._inputActive || this.paused || this.finished) return;
          this._handlePlayerInput(i);
        }
      });
    }

    // ── Sequence Player helper ──────────────────────────────
    this.sequencePlayer = new SequencePlayer();

    this.sequencePlayer.onPlayStep((padIndex) => {
      this._activatePad(padIndex, this._currentStepDuration || 0.45);
    });

    this.sequencePlayer.onSequenceEnd(() => {
      this._inputActive = true;
      this._playerSeq = [];
      // Reset countdown timer so the player receives their full allocated time for recall!
      this.roundElapsed = 0;
      this.roundStartTime = performance.now();
      EventBus.emit('hud:timer', { remaining: this.roundTimeLimit, total: this.roundTimeLimit });
      EventBus.emit('hud:subtitle', { text: '🟢 YOUR TURN: Tap the glowing lily pads in sequence!' });
    });

    // ── Unified Input handled via registerTarget in InputManager ─────────────
  }

  start(levelParams) {
    // Responsive Camera Framing
    if (this.camera) {
      this.camera.position.set(0, 4.8, 5.5);
      this.camera.lookAt(0, -0.1, 0);
    }
    super.start(levelParams);
  }

  setupRound(roundIndex, ramp, levelParams = {}) {
    if (this.finished) return;

    // Determine sequence length for this round:
    let len;
    if (this.isPractice) {
      len = 2;
    } else {
      const minLen = levelParams.seqLengthMin || Math.min(6, Math.floor(3 + (this.level - 1) * 0.12));
      const maxLen = levelParams.seqLengthMax || (minLen + 1);
      len = Math.min(8, Math.round(minLen + ramp * (maxLen - minLen)));
    }
    this._seqLength = len;
    this._targetSeq = [];
    this._playerSeq = [];
    this._inputActive = false;
    this._hoveredPad = null;

    // Pick sequence ensuring adjacent nodes are different for clear musicality
    let lastPad = -1;
    for (let i = 0; i < this._seqLength; i++) {
      let nextPad;
      do {
        nextPad = Math.floor(Math.random() * this.pads.length);
      } while (nextPad === lastPad && this.pads.length > 1);
      this._targetSeq.push(nextPad);
      lastPad = nextPad;
    }

    // Configure playback pacing
    const stepDuration = levelParams.stepDuration || Math.max(0.35, 0.55 - (this.level - 1) * 0.007);
    const interval = levelParams.interval || Math.max(0.14, 0.25 - (this.level - 1) * 0.004);
    this._currentStepDuration = stepDuration;

    if (this.sequencePlayer) {
      this.sequencePlayer.setStepDuration(stepDuration);
      this.sequencePlayer.setInterval(interval);
    }

    if (this.isPractice) {
      EventBus.emit('hud:subtitle', {
        text: '🟢 PRACTICE ROUND: Memorize the 2 glowing pads, then tap them in order!'
      });
    } else {
      EventBus.emit('hud:subtitle', {
        text: `👀 MEMORIZE SEQUENCE: Round ${roundIndex} / ${this.totalRounds} (${this._seqLength} notes)...`
      });
    }

    // Playback sequence after short atmospheric readiness delay
    this.setTimeout(() => {
      if (this.sequencePlayer && !this.finished && this.roundActive) {
        this.sequencePlayer.play(this._targetSeq);
      }
    }, 750);
  }

  teardownRound(correct, reason) {
    this._inputActive = false;
    if (this.sequencePlayer) {
      this.sequencePlayer.stop();
    }
  }

  _activatePad(index, duration = 0.45) {
    const pad = this.pads[index];
    if (!pad) return;

    const { flower, circuitRing, petals, crystalAnchor, beam, light, freq } = pad.userData;

    // Flare visual intensity
    flower.material.emissiveIntensity = 3.2;
    light.intensity = 4.5;
    beam.material.opacity = 0.65;
    if (circuitRing) circuitRing.material.emissiveIntensity = 2.4;
    if (petals) {
      petals.forEach(p => { p.material.emissiveIntensity = 1.6; });
    }

    // Synthesize harmonic audio safely
    try {
      SFXLib.playTone(freq, duration, 'sine', 0.4);
      SFXLib.playTone(freq * 1.5, duration * 0.7, 'triangle', 0.15);
    } catch (e) {
      try { SFXLib.tone(freq, duration); } catch (e2) {}
    }

    // Dynamic Bounce Animation via bounce offset
    pad.userData.bounceY = 0.28;
    Tween.to(pad.userData, { bounceY: 0 }, duration, 'easeOutBack').start();
    crystalAnchor.scale.set(1.35, 1.35, 1.35);
    Tween.to(crystalAnchor.scale, { x: 1, y: 1, z: 1 }, duration, 'easeOutBack').start();

    // Spawn water shockwave ripple
    this._spawnRipple(pad.position.x, pad.position.z, pad.userData.baseColor);

    this.setTimeout(() => {
      flower.material.emissiveIntensity = 0.45;
      light.intensity = 0.3;
      beam.material.opacity = 0.0;
      if (circuitRing) circuitRing.material.emissiveIntensity = 1.2;
      if (petals) {
        petals.forEach(p => { p.material.emissiveIntensity = 0.3; });
      }
    }, duration * 1000);
  }

  _spawnRipple(x, z, color) {
    const ripGeom = new THREE.RingGeometry(0.2, 0.35, 32);
    const ripMat = new THREE.MeshBasicMaterial({
      color: color || 0x00f2fe,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const rip = new THREE.Mesh(ripGeom, ripMat);
    rip.rotation.x = -Math.PI / 2;
    rip.position.set(x, -0.09, z);
    this.addObject(rip);

    const tween = Tween.to(rip.scale, { x: 4.5, y: 4.5, z: 4.5 }, 0.7, 'easeOutQuad').start();
    const fade = Tween.to(ripMat, { opacity: 0 }, 0.7, 'easeOutQuad').start();

    this.setTimeout(() => {
      if (rip.parent) rip.parent.remove(rip);
      ripGeom.dispose();
      ripMat.dispose();
    }, 750);
  }

  _onPointerMove(e) {
    const canvas = document.querySelector('#three-canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.pageX || 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.pageY || 0);

    this._mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, this.camera);
    const intersects = this._raycaster.intersectObjects(this.pads, true);

    let targetPad = null;
    if (intersects.length > 0) {
      let hit = intersects[0].object;
      while (hit && hit !== this.scene && (hit.userData?.index === undefined)) {
        hit = hit.parent;
      }
      if (hit?.userData?.index !== undefined) {
        targetPad = hit;
      }
    }

    if (targetPad !== this._hoveredPad) {
      // Un-hover previous
      if (this._hoveredPad) {
        Tween.to(this._hoveredPad.position, { y: this._hoveredPad.userData.baseY }, 0.2, 'easeOutQuad').start();
        this._hoveredPad.userData.flower.material.emissiveIntensity = 0.45;
      }

      this._hoveredPad = targetPad;

      // Hover new
      if (this._hoveredPad && this._inputActive && !this.finished) {
        Tween.to(this._hoveredPad.position, { y: this._hoveredPad.userData.baseY + 0.18 }, 0.2, 'easeOutBack').start();
        this._hoveredPad.userData.flower.material.emissiveIntensity = 1.3;
        canvas.style.cursor = 'pointer';
        SFXLib.playTone(880, 0.05, 'sine', 0.03); // Subtle hover chime
      } else {
        canvas.style.cursor = 'default';
      }
    }
  }

  _onPointerDown(e) {
    if (!this._inputActive || this.paused || this.finished) return;

    const canvas = document.querySelector('#three-canvas');
    const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const clientX = e.clientX !== undefined ? e.clientX : (e.pageX || 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.pageY || 0);

    this._mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this._raycaster.setFromCamera(this._mouse, this.camera);
    const intersects = this._raycaster.intersectObjects(this.pads, true);

    if (intersects.length > 0) {
      let hit = intersects[0].object;
      while (hit && hit !== this.scene && (hit.userData?.index === undefined)) {
        hit = hit.parent;
      }

      if (hit?.userData?.index !== undefined) {
        const clickedIdx = hit.userData.index;
        this._handlePlayerInput(clickedIdx);
      }
    }
  }

  _handlePlayerInput(padIndex) {
    if (!this._inputActive || this.paused || this.finished || !this.roundActive) return;
    const now = performance.now();
    if (this._lastInputTime && (now - this._lastInputTime < 200)) return;
    this._lastInputTime = now;
    this.registerPlayerAction();

    this._activatePad(padIndex, 0.35);
    this._playerSeq.push(padIndex);

    const step = this._playerSeq.length - 1;
    if (padIndex === this._targetSeq[step]) {
      // Step correct
      SFXLib.playNoteSuccess();

      // Sequence completed!
      if (this._playerSeq.length === this._targetSeq.length) {
        this._inputActive = false;
        EventBus.emit('hud:subtitle', { text: '✨ Resonance locked! Harmonic sequence matched.' });
        this.setTimeout(() => {
          this.endRound(true);
        }, 500);
      }
    } else {
      // Incorrect step
      this._inputActive = false;
      SFXLib.playError();
      const expected = this._targetSeq[step];

      // Briefly illuminate the missed pad to show what was correct
      this.setTimeout(() => {
        this._activatePad(expected, 0.7);
      }, 250);

      if (this.isPractice) {
        EventBus.emit('hud:subtitle', {
          text: `⚠️ Guided calibration: Node #${expected + 1} was next. Retrying round...`
        });
        this.setTimeout(() => {
          this.roundElapsed = 0;
          this.roundStartTime = performance.now();
          EventBus.emit('hud:timer', { remaining: this.roundTimeLimit, total: this.roundTimeLimit });
          this.setupRound(this.currentRound, 0, this.levelParams);
        }, 1200);
      } else {
        EventBus.emit('hud:subtitle', {
          text: `⚠️ Harmonic discord! Missed Node #${expected + 1} (Sequence lost).`
        });
        this.setTimeout(() => {
          this.endRound(false, `Wrong pad: tapped #${padIndex + 1} instead of #${expected + 1}`);
        }, 700);
      }
    }
  }

  hint(type) {
    super.hint(type);
    if (type === 'slow_time') {
      if (this.sequencePlayer) {
        this.sequencePlayer.setStepDuration(1.0);
      }
      EventBus.emit('hud:subtitle', { text: '⏳ Chrono Field: Harmonic playback slowed by 50%.' });
    } else if (type === 'reveal' || type === 'aria_clue') {
      const nextNeeded = this._targetSeq[this._playerSeq.length];
      if (nextNeeded !== undefined) {
        this._activatePad(nextNeeded, 0.9);
        EventBus.emit('hud:subtitle', { text: `🤖 ARIA: Neural ping at Node #${nextNeeded + 1}` });
      }
    }
  }

  update(dt) {
    // During sequence presentation, freeze the countdown so player gets full recall time
    if (this.roundActive && !this._inputActive) {
      this.roundElapsed = 0;
      this.roundStartTime = performance.now();
    }

    super.update(dt);
    this._time += dt;

    // Organic floating animation of flowers & spinning aura rings
    for (const pad of this.pads) {
      const { crystalAnchor, auraRing, phase, bounceY } = pad.userData;
      if (crystalAnchor) {
        // Gentle vertical bobbing combined with dynamic bounce
        crystalAnchor.position.y = 0.35 + (bounceY || 0) + Math.sin(this._time * 2.2 + phase) * 0.06;
        crystalAnchor.rotation.y += dt * 0.6;
      }
      if (auraRing) {
        auraRing.rotation.z += dt * 1.5;
      }
    }

    // Slow rotation of caustics ring
    if (this._caustics) {
      this._caustics.rotation.z += dt * 0.08;
    }

    // Drift ambient bio-spores upwards
    if (this._particles) {
      const pos = this._particles.geometry.attributes.position.array;
      const count = pos.length / 3;
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] += dt * 0.35;
        pos[i * 3]     += Math.sin(this._time + this._pPhases[i]) * 0.004;
        if (pos[i * 3 + 1] > 4.2) {
          pos[i * 3 + 1] = 0.2;
        }
      }
      this._particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  botPlayRound(willWin = true) {
    if (!this.roundActive || this.finished) return;
    if (willWin) {
      // Visual feedback of sequence input
      this._targetSeq.forEach((padIdx, i) => {
        this.setTimeout(() => {
          if (!this.finished) this._activatePad(padIdx, 0.25);
        }, i * 120);
      });
      this.setTimeout(() => {
        if (!this.finished && this.roundActive) {
          this.endRound(true);
        }
      }, (this._targetSeq.length * 120) + 250);
    } else {
      const wrong = (this._targetSeq[0] + 1) % this.pads.length;
      this._activatePad(wrong, 0.35);
      this.setTimeout(() => {
        if (!this.finished && this.roundActive) {
          this.endRound(false, 'Missed harmonic sequence');
        }
      }, 350);
    }
  }

  _createBadgeTexture(text, colorHex = '#00f2fe') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const colorStr = typeof colorHex === 'number' ? `#${colorHex.toString(16).padStart(6, '0')}` : colorHex;

    ctx.fillStyle = 'rgba(5, 19, 34, 0.88)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 120, 56, 12);
    ctx.fill();

    ctx.strokeStyle = colorStr;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 32);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  exit() {
    const canvas = document.querySelector('#three-canvas');
    if (canvas) canvas.style.cursor = 'default';
    this.sequencePlayer?.stop?.();
    this.pads = [];
    this._ripples = [];
    this._caustics = null;
    this._particles = null;
    super.exit();
  }
}
