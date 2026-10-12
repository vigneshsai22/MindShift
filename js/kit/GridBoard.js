/* ═══════════════════════════════════════════════════════════════
   GridBoard.js — Reusable 3D grid layout for card/tile games
   Creates a grid of cells in 3D space. Used by Twin Crystals,
   Hologram Matrix, Flicker Lab, and similar grid-based games.
   ═══════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

export class GridBoard {
  /**
   * @param {Object} opts
   * @param {number} opts.rows
   * @param {number} opts.cols
   * @param {number} [opts.cellSize=1.2]
   * @param {number} [opts.gap=0.15]
   * @param {number} [opts.cellHeight=0.1]
   * @param {number} [opts.cellRoundness=0.08]
   * @param {THREE.Color|number} [opts.cellColor=0x1a1a2e]
   * @param {THREE.Color|number} [opts.hoverColor=0x7c3aed]
   */
  constructor(opts = {}) {
    this.rows       = opts.rows || 3;
    this.cols       = opts.cols || 3;
    this.cellSize   = opts.cellSize || 1.2;
    this.gap        = opts.gap || 0.15;
    this.cellHeight = opts.cellHeight || 0.1;
    this.cellColor  = new THREE.Color(opts.cellColor ?? 0x1a1a2e);
    this.hoverColor = new THREE.Color(opts.hoverColor ?? 0x7c3aed);

    this.group    = new THREE.Group();
    this.cells    = [];     // { mesh, row, col, data, state }
    this._geo     = null;
    this._mat     = null;
  }

  /**
   * Build the grid. Returns the group.
   */
  build() {
    const step = this.cellSize + this.gap;
    const offsetX = -(this.cols - 1) * step / 2;
    const offsetZ = -(this.rows - 1) * step / 2;

    this._geo = new THREE.BoxGeometry(this.cellSize, this.cellHeight, this.cellSize, 1, 1, 1);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const mat = new THREE.MeshPhysicalMaterial({
          color: this.cellColor,
          metalness: 0.1,
          roughness: 0.6,
          emissive: new THREE.Color(0x000000),
          emissiveIntensity: 0,
        });
        const mesh = new THREE.Mesh(this._geo, mat);
        mesh.position.set(
          offsetX + c * step,
          0,
          offsetZ + r * step
        );
        mesh.userData = { row: r, col: c, cellIndex: r * this.cols + c };
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.group.add(mesh);
        this.cells.push({ mesh, row: r, col: c, data: null, state: 'idle' });
      }
    }

    return this.group;
  }

  /** Get cell by (row, col) */
  getCell(row, col) {
    return this.cells.find(c => c.row === row && c.col === col) || null;
  }

  /** Get cell index from (row, col) */
  index(row, col) {
    return row * this.cols + col;
  }

  /** Highlight a cell */
  highlight(row, col, color = null) {
    const cell = this.getCell(row, col);
    if (!cell) return;
    cell.mesh.material.emissive.set(color || this.hoverColor);
    cell.mesh.material.emissiveIntensity = 0.6;
    cell.state = 'highlighted';
  }

  /** Reset a cell to default */
  resetCell(row, col) {
    const cell = this.getCell(row, col);
    if (!cell) return;
    cell.mesh.material.emissive.set(0x000000);
    cell.mesh.material.emissiveIntensity = 0;
    cell.state = 'idle';
  }

  /** Reset all cells */
  resetAll() {
    for (const cell of this.cells) {
      cell.mesh.material.emissive.set(0x000000);
      cell.mesh.material.emissiveIntensity = 0;
      cell.state = 'idle';
      cell.data = null;
    }
  }

  /** Raycast against grid cells */
  raycast(raycaster) {
    const meshes = this.cells.map(c => c.mesh);
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length > 0) {
      const ud = hits[0].object.userData;
      return this.getCell(ud.row, ud.col);
    }
    return null;
  }

  /** Get total width/height of the grid */
  get totalWidth() {
    return this.cols * (this.cellSize + this.gap) - this.gap;
  }

  get totalDepth() {
    return this.rows * (this.cellSize + this.gap) - this.gap;
  }

  /** Dispose all geometry and materials */
  dispose() {
    if (this._geo) this._geo.dispose();
    for (const cell of this.cells) {
      cell.mesh.material.dispose();
    }
    if (this.group.parent) this.group.parent.remove(this.group);
    this.cells.length = 0;
  }
}
