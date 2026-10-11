/* ═══════════════════════════════════════════════════════════════
   MemoryVault.js
   Floor tiles light in sequence → blackout → player clicks them back.
   Sequence length and distractor tiles increase with difficulty.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { LabBase } from './LabBase.js';

const GRID = 5;   // 5x5 grid of tiles
const TILE_SIZE = 1.2;
const TILE_GAP  = 0.15;

export class MemoryVault extends LabBase {
  constructor(ctx) {
    super(ctx);
    this._category = 'memory';
    this._tiles    = [];    // { mesh, x, z, lit, selected }
    this._sequence = [];
    this._phase    = 'idle'; // idle | show | recall
    this._recallIdx = 0;
    this._clickHandler = null;
  }

  _buildScene() {
    const tileGeo = new THREE.BoxGeometry(TILE_SIZE, 0.12, TILE_SIZE);

    // Position the lab behind and below the door area
    this._group.position.set(0, 0, -15);

    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const mat = new THREE.MeshStandardMaterial({
          color: 0x0a1a2e,
          emissive: 0x000000,
          emissiveIntensity: 0,
          roughness: 0.4,
          metalness: 0.7,
        });
        const mesh = new THREE.Mesh(tileGeo, mat);
        const step = TILE_SIZE + TILE_GAP;
        mesh.position.set(
          (c - GRID / 2 + 0.5) * step,
          0.1,
          (r - GRID / 2 + 0.5) * step
        );
        mesh.receiveShadow = true;
        mesh.castShadow    = true;
        mesh.userData = { tileIdx: r * GRID + c, r, c };
        this._group.add(mesh);
        this._tiles.push({ mesh, mat, r, c, lit: false, selected: false });
      }
    }

    // Overhead point light for dramatic tile illumination
    const light = new THREE.PointLight(0x4488ff, 2, 20);
    light.position.set(0, 6, 0);
    light.castShadow = true;
    this._group.add(light);

    // Instruction panel on rear wall
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx2d = canvas.getContext('2d');
    ctx2d.fillStyle = '#000';
    ctx2d.fillRect(0, 0, 512, 128);
    ctx2d.fillStyle = '#44aaff';
    ctx2d.font = 'bold 30px monospace';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('MEMORY VAULT — Recall the sequence', 256, 80);
    const tex = new THREE.CanvasTexture(canvas);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 2),
      new THREE.MeshStandardMaterial({ map: tex, emissive: 0x224488, emissiveIntensity: 0.4 })
    );
    panel.position.set(0, 3, -9);
    this._group.add(panel);
  }

  _onEnter(diff) {
    this._resetTiles();
    this._phase = 'show';

    // Sequence length: 3 + difficulty
    const len = 3 + diff;
    this._sequence = [];
    const pool = [...Array(GRID * GRID).keys()];
    // Shuffle and pick
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this._sequence = pool.slice(0, len);

    this.aria?.speak(`Watch the sequence of ${len} tiles, then repeat it.`, 'instruction');
    this._showSequence();
  }

  _showSequence() {
    let i = 0;
    const delay = Math.max(400, 900 - this._diff * 80); // faster at higher diff

    const next = () => {
      if (i > 0) this._setTile(this._sequence[i - 1], false); // turn off prev
      if (i >= this._sequence.length) {
        // Blackout phase
        setTimeout(() => this._startRecall(), 600);
        return;
      }
      this._setTile(this._sequence[i], true);
      this.spatialAudio?.playTone(300 + i * 60, 0.15, 'sine', 0.3);
      i++;
      setTimeout(next, delay);
    };
    setTimeout(next, 800);
  }

  _startRecall() {
    this._resetTiles();
    this._phase    = 'recall';
    this._recallIdx = 0;

    // Add distractors based on difficulty
    const distractorCount = this._diff - 1;
    for (let d = 0; d < distractorCount; d++) {
      const idx = Math.floor(Math.random() * GRID * GRID);
      this._tiles[idx]?.mat && (this._tiles[idx].mat.color.setHex(0x221133));
    }

    // Attach click handler to renderer canvas
    this._clickHandler = (e) => this._onCanvasClick(e);
    this.scene3d.renderer.domElement.addEventListener('click', this._clickHandler);
  }

  _onCanvasClick(e) {
    if (this._phase !== 'recall') return;

    // Raycast from camera through click position
    const rect   = this.scene3d.renderer.domElement.getBoundingClientRect();
    const mouse  = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width)  * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.scene3d.camera);

    const tileMeshes = this._tiles.map(t => t.mesh);
    const hits = raycaster.intersectObjects(tileMeshes);
    if (!hits.length) return;

    const hitMesh = hits[0].object;
    const tileIdx = hitMesh.userData.tileIdx;
    const tile    = this._tiles[tileIdx];

    if (tile.selected) return; // already clicked
    tile.selected = true;
    this._attempts++;

    if (tileIdx === this._sequence[this._recallIdx]) {
      // Correct tile
      this._setTile(tileIdx, true, 0x00ff66);
      this.spatialAudio?.playTone(440 + this._recallIdx * 55, 0.2, 'sine', 0.25);
      this._recallIdx++;

      if (this._recallIdx >= this._sequence.length) {
        // All correct
        this.scene3d.renderer.domElement.removeEventListener('click', this._clickHandler);
        setTimeout(() => this._complete(true, this._attempts), 400);
      }
    } else {
      // Wrong tile
      this._setTile(tileIdx, true, 0xff2200);
      this.spatialAudio?.playTone(110, 0.3, 'sawtooth', 0.3);
      this.scene3d.renderer.domElement.removeEventListener('click', this._clickHandler);
      setTimeout(() => this._complete(false, this._attempts), 600);
    }
  }

  _setTile(idx, lit, colorHex = 0x44aaff) {
    const tile = this._tiles[idx];
    if (!tile) return;
    tile.lit = lit;
    tile.mat.emissive.setHex(lit ? colorHex : 0x000000);
    tile.mat.emissiveIntensity = lit ? 1.8 : 0;
    tile.mat.color.setHex(lit ? 0x0a2040 : 0x0a1a2e);
  }

  _resetTiles() {
    this._tiles.forEach((t, i) => {
      t.lit = false; t.selected = false;
      t.mat.emissive.setHex(0x000000);
      t.mat.emissiveIntensity = 0;
      t.mat.color.setHex(0x0a1a2e);
    });
  }

  _onExit() {
    if (this._clickHandler) {
      this.scene3d.renderer.domElement.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
    this._phase = 'idle';
    this._resetTiles();
  }

  _giveHint() {
    if (this._phase === 'recall' && this._recallIdx < this._sequence.length) {
      // Flash the next correct tile briefly
      const nextIdx = this._sequence[this._recallIdx];
      this._setTile(nextIdx, true, 0xffcc00);
      setTimeout(() => this._setTile(nextIdx, false), 700);
    }
  }
}
