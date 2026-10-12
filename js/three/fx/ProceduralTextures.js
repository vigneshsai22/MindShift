/* ═══════════════════════════════════════════════════════════════
   ProceduralTextures.js — Dynamic canvas-based textures
   Grid floors, circuit board traces, wall panel seams, hex patterns.
   All procedural — no image files needed.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

/**
 * Sci-fi grid floor texture with glow dots at intersections.
 */
export function makeGridTexture(size = 512, gridColor = '#0044aa', bgColor = '#000811') {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  const step = size / 16;

  for (let i = 0; i <= 16; i++) {
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
  }

  // Glow at grid intersections
  ctx.fillStyle = 'rgba(0,120,255,0.25)';
  for (let r = 0; r <= 16; r++) {
    for (let c = 0; c <= 16; c++) {
      ctx.beginPath();
      ctx.arc(c * step, r * step, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

/**
 * Circuit board trace texture for walls.
 */
export function makeCircuitTexture(size = 512, traceColor = '#003366', bgColor = '#020610') {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = traceColor;
  ctx.lineWidth = 2;

  // Horizontal traces
  for (let i = 0; i < 12; i++) {
    const y = (Math.random() * 0.8 + 0.1) * size;
    const x1 = Math.random() * size * 0.3;
    const x2 = x1 + Math.random() * size * 0.5 + size * 0.1;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    // Right-angle bend
    const midX = (x1 + x2) / 2;
    const bendY = y + (Math.random() - 0.5) * 40;
    ctx.lineTo(midX, y);
    ctx.lineTo(midX, bendY);
    ctx.lineTo(x2, bendY);
    ctx.stroke();

    // Node dots
    ctx.fillStyle = traceColor;
    ctx.beginPath(); ctx.arc(x1, y, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x2, bendY, 3, 0, Math.PI * 2); ctx.fill();
  }

  // IC pads
  ctx.fillStyle = 'rgba(0,80,160,0.3)';
  for (let i = 0; i < 4; i++) {
    const x = Math.random() * (size - 40) + 20;
    const y = Math.random() * (size - 40) + 20;
    ctx.fillRect(x, y, 20 + Math.random() * 20, 12 + Math.random() * 12);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

/**
 * Wall panel with seams and optional label text.
 */
export function makeWallPanelTexture(label = '', accentHex = '#0077ff') {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 512;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = '#050a15';
  ctx.fillRect(0, 0, 256, 512);

  // Panel seam lines
  ctx.strokeStyle = 'rgba(0,60,120,0.3)';
  ctx.lineWidth = 1;
  for (let y = 64; y < 512; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(128, 0); ctx.lineTo(128, 512); ctx.stroke();

  // Scanlines
  ctx.fillStyle = 'rgba(0,80,200,0.06)';
  for (let y = 0; y < 512; y += 4) ctx.fillRect(0, y, 256, 2);

  // Border
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 240, 496);

  // Corner accents
  const corners = [[12, 12], [240, 12], [12, 500], [240, 500]];
  ctx.fillStyle = accentHex;
  corners.forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  });

  // Label
  if (label) {
    ctx.fillStyle = accentHex;
    ctx.font = 'bold 28px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, 128, 280);
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(150,200,255,0.7)';
    ctx.fillText('▶ ENTER', 128, 320);
  }

  return new THREE.CanvasTexture(cv);
}

/**
 * Hexagonal pattern for special surfaces.
 */
export function makeHexTexture(size = 512, hexColor = '#0055cc', bgColor = '#000811') {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  const hexRadius = 24;
  const hexHeight = hexRadius * Math.sqrt(3);
  ctx.strokeStyle = hexColor;
  ctx.lineWidth = 1;

  for (let row = -1; row < size / hexHeight + 1; row++) {
    for (let col = -1; col < size / (hexRadius * 1.5) + 1; col++) {
      const cx = col * hexRadius * 1.5;
      const cy = row * hexHeight + (col % 2 ? hexHeight / 2 : 0);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i + Math.PI / 6;
        const x = cx + hexRadius * Math.cos(angle);
        const y = cy + hexRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

/**
 * Emissive floor reflection plane — dark mirror effect.
 */
export function makeReflectiveFloorMaterial(accentColor = 0x001122) {
  return new THREE.MeshStandardMaterial({
    color: 0x020408,
    roughness: 0.15,
    metalness: 0.9,
    emissive: accentColor,
    emissiveIntensity: 0.15,
    envMapIntensity: 0.3,
  });
}
