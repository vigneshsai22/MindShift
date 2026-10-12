/* ═══════════════════════════════════════════════════════════════
   ResonanceTunnel.js — Sector 2: Resonance Tunnel (Audio / Pitch)
   Features:
   - 3D Neon Rhythm-Lane Tunnel with approaching note gems
   - 4 to 8 lanes mapped to distinct pentatonic / diatonic frequencies
   - Timing window evaluation (Perfect / Good / Miss)
   - Sector Climax / Boss Trial: Melody reproduction from auditory memory
   - Center-raycast & key input ('KeyA','KeyS','KeyD','KeyF' / click)
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { LabBase } from './LabBase.js';
import { EventBus } from '../../core/EventBus.js';

const LANE_FREQS = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
const LANE_COLORS = [0x00e5ff, 0x3b82f6, 0x8b5cf6, 0xec4899, 0xf59e0b, 0x10b981, 0x06b6d4, 0xff0055];

export class ResonanceTunnel extends LabBase {
  constructor(ctx) {
    super(ctx);
    this._category   = 'audio';
    this._title      = 'SECTOR 2: RESONANCE TUNNEL';
    this._lanes      = [];
    this._gems       = [];
    this._laneCount  = 4;
    this._scoreHits  = 0;
    this._totalNotes = 8;
    this._isBoss     = false;
    this._bossMelody = [];
    this._bossStep   = 0;
    this._bossPhase  = 'listen'; // 'listen' | 'reproduce'
    this._tunnelRings = [];

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onInteract = this._onInteract.bind(this);
    this._onCanvasClick = this._onCanvasClick.bind(this);
  }

  _buildScene() {
    this._group.position.set(0, 0, -14);

    // 1. Neon Tunnel Rings
    for (let z = 0; z > -25; z -= 3) {
      const ringGeo = new THREE.TorusGeometry(3.8, 0.04, 8, 32);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        emissive: 0x0055aa,
        emissiveIntensity: 1.2
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, 2.2, z);
      this._group.add(ring);
      this._tunnelRings.push(ring);
    }

    // 2. Hit line bar at bottom of tunnel
    const hitBarGeo = new THREE.BoxGeometry(6.4, 0.08, 0.2);
    const hitBarMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x00ffcc,
      emissiveIntensity: 2.5
    });
    this._hitBar = new THREE.Mesh(hitBarGeo, hitBarMat);
    this._hitBar.position.set(0, 0.6, -4.5);
    this._group.add(this._hitBar);

    this._rebuildLanes(4);
  }

  _rebuildLanes(count = 4) {
    this._lanes.forEach(l => {
      this._group.remove(l.mesh);
      l.mesh.geometry.dispose();
      l.mat.dispose();
    });
    this._lanes = [];
    this._laneCount = count;

    const spacing = 4.8 / count;
    const startX = -((count - 1) * spacing) / 2;

    for (let i = 0; i < count; i++) {
      const x = startX + i * spacing;
      const laneGeo = new THREE.BoxGeometry(0.7, 0.05, 20);
      const laneMat = new THREE.MeshStandardMaterial({
        color: 0x0a1628,
        emissive: LANE_COLORS[i % LANE_COLORS.length],
        emissiveIntensity: 0.35,
        roughness: 0.4
      });
      const laneMesh = new THREE.Mesh(laneGeo, laneMat);
      laneMesh.position.set(x, 0.4, -13);
      laneMesh.userData = { laneIdx: i, x };
      this._group.add(laneMesh);
      this._lanes.push({ mesh: laneMesh, mat: laneMat, idx: i, x });
    }
  }

  _onEnter(params) {
    this._isBoss = !!params.isBoss;
    const lanes = params.laneCount || (this._diff >= 1400 ? 6 : 4);
    if (lanes !== this._laneCount) this._rebuildLanes(lanes);

    this._gems.forEach(g => this._group.remove(g.mesh));
    this._gems = [];
    this._scoreHits = 0;

    if (this._isBoss) {
      this._totalNotes = 5;
      this._bossPhase = 'listen';
      this._bossStep = 0;
      this._bossMelody = [];
      for (let i = 0; i < 5; i++) {
        this._bossMelody.push(Math.floor(Math.random() * this._laneCount));
      }
      this.aria?.speak("Sector 2 Boss: Harmonic Resonance Protocol. Listen to the target melody, then replay it on the lanes.", 'urgent');
      this.spatialAudio?.playStinger('boss_start');
      const listenTimer = setTimeout(() => this._playBossMelody(), 1200);
      this._timeouts.add(listenTimer);
    } else {
      this._totalNotes = params.noteCount || 8;
      this.aria?.speak(`Strike the incoming acoustic gems on the hit bar. Key lanes: A, S, D, F or click!`, 'instruction');
      this._spawnGemsSequence();
    }

    this._bindControls();
  }

  _spawnGemsSequence() {
    const tempo = Math.max(0.6, 1.4 - (this._diff - 800) * 0.0006);
    for (let i = 0; i < this._totalNotes; i++) {
      const spawnTimer = setTimeout(() => {
        if (!this._active) return;
        const laneIdx = Math.floor(Math.random() * this._laneCount);
        this._spawnGem(laneIdx);
      }, (i + 1) * tempo * 1000);
      this._timeouts.add(spawnTimer);
    }
  }

  _spawnGem(laneIdx) {
    const lane = this._lanes[laneIdx];
    if (!lane) return;

    const gemGeo = new THREE.OctahedronGeometry(0.28, 0);
    const gemMat = new THREE.MeshStandardMaterial({
      color: LANE_COLORS[laneIdx % LANE_COLORS.length],
      emissive: LANE_COLORS[laneIdx % LANE_COLORS.length],
      emissiveIntensity: 2.2
    });
    const gemMesh = new THREE.Mesh(gemGeo, gemMat);
    gemMesh.position.set(lane.x, 0.7, -22);
    this._group.add(gemMesh);

    this._gems.push({
      mesh: gemMesh,
      laneIdx,
      z: -22,
      speed: 8.5 + (this._diff - 800) * 0.005,
      active: true
    });
  }

  _playBossMelody() {
    let step = 0;
    const playNext = () => {
      if (!this._active) return;
      if (step >= this._bossMelody.length) {
        this._bossPhase = 'reproduce';
        this._bossStep = 0;
        EventBus.emit('juice:popup', { text: 'REPLAY MELODY NOW', color: '#00ffcc' });
        return;
      }
      const laneIdx = this._bossMelody[step];
      this._flashLane(laneIdx);
      const freq = LANE_FREQS[laneIdx % LANE_FREQS.length];
      this.spatialAudio?.playTone(freq, 0.35, 'sine', 0.3);
      step++;
      const nextTimer = setTimeout(playNext, 650);
      this._timeouts.add(nextTimer);
    };
    playNext();
  }

  _flashLane(laneIdx) {
    const lane = this._lanes[laneIdx];
    if (!lane) return;
    lane.mat.emissiveIntensity = 3.5;
    const offTimer = setTimeout(() => {
      lane.mat.emissiveIntensity = 0.35;
    }, 300);
    this._timeouts.add(offTimer);
  }

  _bindControls() {
    window.addEventListener('keydown', this._onKeyDown);
    EventBus.on('player:interact', this._onInteract);
    this.scene3d.renderer.domElement.addEventListener('click', this._onCanvasClick);
  }

  _unbindControls() {
    window.removeEventListener('keydown', this._onKeyDown);
    EventBus.off('player:interact', this._onInteract);
    this.scene3d.renderer.domElement.removeEventListener('click', this._onCanvasClick);
  }

  _onKeyDown(e) {
    if (!this._active) return;
    const keyMap = { 'KeyA': 0, 'KeyS': 1, 'KeyD': 2, 'KeyF': 3, 'KeyG': 4, 'KeyH': 5 };
    if (keyMap[e.code] !== undefined && keyMap[e.code] < this._laneCount) {
      this._strikeLane(keyMap[e.code]);
    }
  }

  _onInteract() {
    const hits = this.raycastCenter(this._lanes.map(l => l.mesh));
    if (hits.length > 0) {
      const idx = hits[0].object.userData.laneIdx;
      this._strikeLane(idx);
    }
  }

  _onCanvasClick(e) {
    if (!this._active) return;
    const hits = this.raycastCenter(this._lanes.map(l => l.mesh));
    if (hits.length > 0) {
      const idx = hits[0].object.userData.laneIdx;
      this._strikeLane(idx);
    }
  }

  _strikeLane(laneIdx) {
    this._attempts++;
    this._flashLane(laneIdx);
    const freq = LANE_FREQS[laneIdx % LANE_FREQS.length];
    this.spatialAudio?.playTone(freq, 0.22, 'sine', 0.28);

    if (this._isBoss) {
      if (this._bossPhase !== 'reproduce') return;
      if (laneIdx === this._bossMelody[this._bossStep]) {
        this._bossStep++;
        EventBus.emit('juice:popup', { text: `NOTE ${this._bossStep}/5`, color: '#00ffcc' });
        if (this._bossStep >= this._bossMelody.length) {
          this._complete(true, { isBoss: true });
        }
      } else {
        EventBus.emit('juice:popup', { text: 'HARMONIC DISCORD', color: '#ff3344' });
        this._complete(false, { isBoss: true });
      }
      return;
    }

    // Standard rhythm trial: hit window check around z = -4.5
    const targetGem = this._gems.find(g => g.active && g.laneIdx === laneIdx && Math.abs(g.z - (-4.5)) < 1.4);

    if (targetGem) {
      targetGem.active = false;
      this._group.remove(targetGem.mesh);
      this._scoreHits++;
      EventBus.emit('juice:popup', { text: 'PERFECT STRIKE', color: '#00ff88' });

      if (this._scoreHits >= Math.round(this._totalNotes * 0.75)) {
        this._complete(true, { hits: this._scoreHits });
      }
    }
  }

  _render(delta) {
    // Animate tunnel rings
    this._tunnelRings.forEach(r => {
      r.rotation.z += delta * 0.4;
    });

    // Animate gems toward player
    for (let i = this._gems.length - 1; i >= 0; i--) {
      const gem = this._gems[i];
      if (!gem.active) continue;

      gem.z += gem.speed * delta;
      gem.mesh.position.z = gem.z;
      gem.mesh.rotation.x += delta * 4;
      gem.mesh.rotation.y += delta * 3;

      // Missed hit window
      if (gem.z > -2.0) {
        gem.active = false;
        this._group.remove(gem.mesh);
        EventBus.emit('juice:popup', { text: 'NOTE MISSED', color: '#ff3344' });
      }
    }
  }

  _onExit() {
    this._unbindControls();
    this._gems.forEach(g => this._group.remove(g.mesh));
    this._gems = [];
  }
}
