/* ═══════════════════════════════════════════════════════════════
   MemoryVault.js — Sector 1: Memory Vault (Complete Implementation)
   Features:
   - Floor tiles light in sequence with pitch-mapped audio notes
   - Dynamic blackout phase followed by player recall phase
   - Pointer-lock center raycasting & click fallback
   - Sector Climax / Boss Trial: Moving floating tiles + fake distractor sequences
   - Real-time interaction feedback, hints, and zero-leak cleanup
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { LabBase } from './LabBase.js';
import { EventBus } from '../../core/EventBus.js';

const PITCHES = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33];
const TILE_SIZE = 1.3;
const TILE_GAP = 0.2;

export class MemoryVault extends LabBase {
  constructor(ctx) {
    super(ctx);
    this._category   = 'memory';
    this._title      = 'SECTOR 1: MEMORY VAULT';
    this._tiles      = [];
    this._sequence   = [];
    this._phase      = 'idle'; // 'idle' | 'show' | 'blackout' | 'recall'
    this._recallIdx  = 0;
    this._isBoss     = false;
    this._gridDim    = 3;
    this._moveAngle  = 0;

    this._onInteract = this._onInteract.bind(this);
    this._onCanvasClick = this._onCanvasClick.bind(this);
  }

  _buildScene() {
    this._group.position.set(0, 0, -16);
    this._rebuildGrid(3);

    // Dramatic overhead point light
    this._light = new THREE.PointLight(0x00e5ff, 2.5, 22);
    this._light.position.set(0, 6, 0);
    this._group.add(this._light);
  }

  _rebuildGrid(dim = 3) {
    // Clear existing tiles
    this._tiles.forEach(t => {
      this._group.remove(t.mesh);
      t.mesh.geometry.dispose();
      t.mat.dispose();
    });
    this._tiles = [];
    this._gridDim = dim;

    const tileGeo = new THREE.BoxGeometry(TILE_SIZE, 0.14, TILE_SIZE);
    const step = TILE_SIZE + TILE_GAP;

    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        const mat = new THREE.MeshStandardMaterial({
          color: 0x091424,
          emissive: 0x001122,
          emissiveIntensity: 0.2,
          roughness: 0.35,
          metalness: 0.75
        });
        const mesh = new THREE.Mesh(tileGeo, mat);
        const origX = (c - dim / 2 + 0.5) * step;
        const origZ = (r - dim / 2 + 0.5) * step;
        mesh.position.set(origX, 0.1, origZ);
        mesh.userData = {
          tileIdx: r * dim + c,
          row: r,
          col: c,
          origX,
          origZ
        };
        this._group.add(mesh);
        this._tiles.push({ mesh, mat, lit: false, selected: false, idx: r * dim + c });
      }
    }
  }

  _onEnter(params) {
    this._isBoss = !!params.isBoss;
    const dim = params.gridSize || (this._diff >= 1500 ? 4 : 3);
    if (dim !== this._gridDim) this._rebuildGrid(dim);

    const totalTiles = this._gridDim * this._gridDim;
    const seqLen = params.seqLength || Math.min(totalTiles - 1, 3 + Math.round((this._diff - 800) / 300));

    // Generate random non-repeating sequence
    this._sequence = [];
    const pool = Array.from({ length: totalTiles }, (_, i) => i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this._sequence = pool.slice(0, seqLen);

    this._resetTiles();
    this._phase = 'show';
    this._moveAngle = 0;

    if (this._isBoss) {
      this.aria?.speak("Warning: Sector 1 Core Breach. Dynamic spatial shift detected. Ignore distractor pulses.", 'urgent');
      this.spatialAudio?.playStinger('boss_start');
    } else {
      this.aria?.speak(`Observe the ${seqLen}-tone neural sequence. Prepare for recall.`, 'instruction');
    }

    this._bindControls();
    const startDelay = setTimeout(() => this._playSequence(), 1000);
    this._timeouts.add(startDelay);
  }

  _playSequence() {
    let idx = 0;
    const delay = Math.max(380, 850 - (this._diff - 800) * 0.3);

    const step = () => {
      if (!this._active) return;
      if (idx > 0) this._setTile(this._sequence[idx - 1], false);

      if (idx >= this._sequence.length) {
        this._phase = 'blackout';
        const blackoutTimer = setTimeout(() => this._startRecallPhase(), 700);
        this._timeouts.add(blackoutTimer);
        return;
      }

      const curTileIdx = this._sequence[idx];
      this._setTile(curTileIdx, true, 0x00e5ff);

      // Pitch mapped note
      const pitch = PITCHES[idx % PITCHES.length];
      this.spatialAudio?.playTone(pitch, 0.22, 'sine', 0.3);

      idx++;
      const nextTimer = setTimeout(step, delay);
      this._timeouts.add(nextTimer);
    };

    step();
  }

  _startRecallPhase() {
    this._resetTiles();
    this._phase = 'recall';
    this._recallIdx = 0;

    EventBus.emit('juice:popup', { text: 'RECALL SEQUENCE', color: '#00ffcc' });

    // Boss distractors: periodic fake pulse on non-sequence tile
    if (this._isBoss) {
      this._spawnDistractorLoop();
    }
  }

  _spawnDistractorLoop() {
    if (this._phase !== 'recall' || !this._active) return;
    const nonSeq = this._tiles.filter(t => !this._sequence.includes(t.idx));
    if (nonSeq.length > 0) {
      const decoy = nonSeq[Math.floor(Math.random() * nonSeq.length)];
      this._setTile(decoy.idx, true, 0xf43f5e);
      const offTimer = setTimeout(() => this._setTile(decoy.idx, false), 350);
      this._timeouts.add(offTimer);
    }
    const loopTimer = setTimeout(() => this._spawnDistractorLoop(), 2200);
    this._timeouts.add(loopTimer);
  }

  _bindControls() {
    EventBus.on('player:interact', this._onInteract);
    this.scene3d.renderer.domElement.addEventListener('click', this._onCanvasClick);
  }

  _unbindControls() {
    EventBus.off('player:interact', this._onInteract);
    this.scene3d.renderer.domElement.removeEventListener('click', this._onCanvasClick);
  }

  _onInteract(e) {
    if (this._phase !== 'recall') return;
    const tileMeshes = this._tiles.map(t => t.mesh);
    // Center raycast when pointer-locked
    const hits = this.raycastCenter(tileMeshes);
    if (hits.length > 0) {
      this._handleTileClick(hits[0].object);
    }
  }

  _onCanvasClick(e) {
    if (this._phase !== 'recall') return;
    const tileMeshes = this._tiles.map(t => t.mesh);

    // If pointer locked, center raycast is used
    if (document.pointerLockElement) {
      const hits = this.raycastCenter(tileMeshes);
      if (hits.length > 0) this._handleTileClick(hits[0].object);
      return;
    }

    // Unlocked mouse click fallback
    const rect = this.scene3d.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this._raycaster.setFromCamera(mouse, this.camera);
    const hits = this._raycaster.intersectObjects(tileMeshes);
    if (hits.length > 0) {
      this._handleTileClick(hits[0].object);
    }
  }

  _handleTileClick(mesh) {
    const tileIdx = mesh.userData.tileIdx;
    const tile = this._tiles[tileIdx];
    if (!tile || tile.selected) return;

    tile.selected = true;
    this._attempts++;

    const expectedIdx = this._sequence[this._recallIdx];

    if (tileIdx === expectedIdx) {
      // Correct tile
      this._setTile(tileIdx, true, 0x10b981);
      const pitch = PITCHES[this._recallIdx % PITCHES.length];
      this.spatialAudio?.playTone(pitch * 1.5, 0.2, 'sine', 0.28);
      this._recallIdx++;

      if (this._recallIdx >= this._sequence.length) {
        this._phase = 'done';
        this._unbindControls();
        const finishTimer = setTimeout(() => this._complete(true, { isBoss: this._isBoss }), 500);
        this._timeouts.add(finishTimer);
      }
    } else {
      // Wrong tile error
      this._setTile(tileIdx, true, 0xef4444);
      this.spatialAudio?.playTone(130.81, 0.35, 'sawtooth', 0.3);
      this._phase = 'done';
      this._unbindControls();
      const failTimer = setTimeout(() => this._complete(false, { isBoss: this._isBoss }), 700);
      this._timeouts.add(failTimer);
    }
  }

  _setTile(idx, lit, colorHex = 0x00e5ff) {
    const tile = this._tiles[idx];
    if (!tile) return;
    tile.lit = lit;
    tile.mat.emissive.setHex(lit ? colorHex : 0x001122);
    tile.mat.emissiveIntensity = lit ? 2.5 : 0.2;
    tile.mat.color.setHex(lit ? 0x0f2942 : 0x091424);
  }

  _resetTiles() {
    this._tiles.forEach(t => {
      t.lit = false;
      t.selected = false;
      t.mat.emissive.setHex(0x001122);
      t.mat.emissiveIntensity = 0.2;
      t.mat.color.setHex(0x091424);
    });
  }

  _render(delta) {
    // Boss mode: subtle floating wave motion of tiles
    if (this._isBoss && this._active) {
      this._moveAngle += delta * 1.5;
      this._tiles.forEach((t, i) => {
        const offset = Math.sin(this._moveAngle + i * 0.4) * 0.08;
        t.mesh.position.y = 0.1 + offset;
      });
    }
  }

  _giveHint() {
    if (this._phase === 'recall' && this._recallIdx < this._sequence.length) {
      const targetIdx = this._sequence[this._recallIdx];
      this._setTile(targetIdx, true, 0xfbbf24);
      const hintTimer = setTimeout(() => this._setTile(targetIdx, false), 800);
      this._timeouts.add(hintTimer);
    }
  }

  _onExit() {
    this._unbindControls();
    this._phase = 'idle';
    this._resetTiles();
  }
}
