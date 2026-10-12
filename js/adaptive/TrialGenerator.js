/* ═══════════════════════════════════════════════════════════════
   TrialGenerator.js — Procedural & Deterministic Trial Generator
   Maps continuous Elo difficulty D into concrete trial parameters
   for all 7 cognitive sectors using verified parameter tables.
   Supports deterministic daily challenges via PRNG.
   ═══════════════════════════════════════════════════════════════ */

import { PRNG } from '../core/PRNG.js';

export class TrialGenerator {
  constructor(seed = null) {
    this.prng = seed !== null ? new PRNG(seed) : null;
  }

  _random() {
    return this.prng ? this.prng.random() : Math.random();
  }

  _randRange(min, max) {
    return min + this._random() * (max - min);
  }

  _randInt(min, max) {
    return Math.floor(this._randRange(min, max + 1));
  }

  _randChoice(arr) {
    return arr[Math.floor(this._random() * arr.length)];
  }

  /**
   * Generates parameter payload for a trial
   * @param {string} skill - Cognitive skill key
   * @param {number} difficulty - Continuous Elo difficulty rating D (e.g. 800-2000)
   * @param {boolean} isBoss - Whether this is a sector climax/boss trial
   */
  generate(skill, difficulty = 1200, isBoss = false) {
    // Normalized difficulty factor in [0, 1]
    const norm = Math.max(0, Math.min(1, (difficulty - 800) / 1200));

    switch (skill) {
      case 'memory':
        return this._generateMemory(norm, isBoss, difficulty);
      case 'audio':
        return this._generateAudio(norm, isBoss, difficulty);
      case 'pattern':
        return this._generatePattern(norm, isBoss, difficulty);
      case 'observation':
        return this._generateObservation(norm, isBoss, difficulty);
      case 'reaction':
        return this._generateReaction(norm, isBoss, difficulty);
      case 'spatial':
        return this._generateSpatial(norm, isBoss, difficulty);
      case 'logical':
      default:
        return this._generateLogical(norm, isBoss, difficulty);
    }
  }

  // 1. Memory Vault (Tiles, notes, sequence length, distractors)
  _generateMemory(norm, isBoss, D) {
    const gridSize = norm > 0.65 ? 4 : 3;
    const totalTiles = gridSize * gridSize;
    const baseLen = Math.round(3 + norm * 4); // 3 to 7
    const seqLength = isBoss ? baseLen + 1 : baseLen;

    const sequence = [];
    for (let i = 0; i < seqLength; i++) {
      sequence.push(this._randInt(0, totalTiles - 1));
    }

    const distractorCount = isBoss ? Math.round(1 + norm * 2) : (norm > 0.6 ? 1 : 0);

    return {
      skill: 'memory',
      difficulty: D,
      isBoss,
      gridSize,
      totalTiles,
      sequence,
      seqLength,
      flashDuration: Math.max(0.35, 0.75 - norm * 0.35),
      blackoutDuration: Math.max(0.4, 0.8 + norm * 0.6),
      distractorCount,
      parTime: 8.0 + seqLength * 1.5,
      timeLimit: 25 + seqLength * 2
    };
  }

  // 2. Resonance Tunnel (Pitch lanes, BPM, note speed, melody recall)
  _generateAudio(norm, isBoss, D) {
    const laneCount = norm > 0.5 ? 6 : 4;
    const tempoBPM = Math.round(90 + norm * 60); // 90 to 150 BPM
    const noteSpeed = 4.5 + norm * 4.5;          // 4.5 to 9.0 u/s
    const noteCount = isBoss ? 12 : Math.round(6 + norm * 6);

    const notes = [];
    for (let i = 0; i < noteCount; i++) {
      notes.push({
        lane: this._randInt(0, laneCount - 1),
        time: 1.5 + i * (60 / tempoBPM) * (this._randChoice([1, 1.5, 2]))
      });
    }

    return {
      skill: 'audio',
      difficulty: D,
      isBoss,
      laneCount,
      tempoBPM,
      noteSpeed,
      notes,
      melodyRecall: isBoss,
      melodyLength: isBoss ? 4 + Math.round(norm * 2) : 0,
      parTime: 12.0 + noteCount * 0.8,
      timeLimit: 30
    };
  }

  // 3. Hologram Assembly (Pattern completion, 3D snap, overlapping rules)
  _generatePattern(norm, isBoss, D) {
    const candidateCount = Math.round(3 + norm * 3); // 3 to 6
    const overlappingRules = isBoss || norm > 0.7 ? 2 : 1;
    const correctIndex = this._randInt(0, candidateCount - 1);

    const shapes = ['cube', 'cylinder', 'octahedron', 'torus', 'sphere'];
    const colors = [0x00e5ff, 0xf59e0b, 0x10b981, 0xec4899, 0x8b5cf6];

    const targetShape = this._randChoice(shapes);
    const targetColor = this._randChoice(colors);

    const candidates = [];
    for (let i = 0; i < candidateCount; i++) {
      if (i === correctIndex) {
        candidates.push({ shape: targetShape, color: targetColor, isCorrect: true });
      } else {
        candidates.push({
          shape: this._randChoice(shapes),
          color: this._randChoice(colors),
          isCorrect: false
        });
      }
    }

    return {
      skill: 'pattern',
      difficulty: D,
      isBoss,
      candidateCount,
      correctIndex,
      targetShape,
      targetColor,
      candidates,
      overlappingRules,
      magneticSnapDist: 1.2,
      parTime: 10.0 + norm * 4.0,
      timeLimit: 28
    };
  }

  // 4. Anomaly Chamber (Observation, room differences, scanner sweep)
  _generateObservation(norm, isBoss, D) {
    const differencesCount = isBoss ? Math.round(3 + norm * 2) : Math.round(1 + norm * 3);
    const objectCount = Math.round(10 + norm * 12);
    const sweepPeriod = Math.max(6.0, 14.0 - norm * 6.0); // seconds per sweep

    const diffTypes = ['color', 'position', 'rotation', 'missing'];
    const diffs = [];
    for (let i = 0; i < differencesCount; i++) {
      diffs.push({
        id: `diff_${i}`,
        type: this._randChoice(diffTypes),
        detected: false
      });
    }

    return {
      skill: 'observation',
      difficulty: D,
      isBoss,
      objectCount,
      differencesCount,
      differences: diffs,
      sweepPeriod,
      dynamicAppearance: isBoss, // boss: differences spawn mid-investigation
      parTime: 12.0 + differencesCount * 3.0,
      timeLimit: 32
    };
  }

  // 5. Reflex Arena (Reaction, spatial audio cues, decoys, moving targets)
  _generateReaction(norm, isBoss, D) {
    const targetCount = isBoss ? 16 : Math.round(6 + norm * 8);
    const targetLifetimeMs = Math.round(2400 - norm * 1400); // 2400ms down to 1000ms
    const decoyRatio = norm > 0.4 ? (norm * 0.35) : 0;
    const movingSpeed = norm > 0.5 ? norm * 3.5 : 0;

    return {
      skill: 'reaction',
      difficulty: D,
      isBoss,
      targetCount,
      targetLifetimeMs,
      decoyRatio,
      movingSpeed,
      waveCount: isBoss ? 3 : 1,
      parTime: 10.0 + targetCount * 0.9,
      timeLimit: 30
    };
  }

  // 6. Spatial Lab (Rotation Core, 3D shadow match, cube net folding)
  _generateSpatial(norm, isBoss, D) {
    const axesCount = norm > 0.6 ? 3 : (norm > 0.3 ? 2 : 1);
    const toleranceRad = Math.max(0.12, 0.35 - norm * 0.20);
    const netFolding = !isBoss && norm > 0.75;
    const multiObjectSeq = isBoss ? 3 : 1;

    return {
      skill: 'spatial',
      difficulty: D,
      isBoss,
      axesCount,
      toleranceRad,
      netFolding,
      multiObjectSeq,
      targetAngles: {
        x: this._randRange(0, Math.PI * 2),
        y: this._randRange(0, Math.PI * 2),
        z: axesCount >= 3 ? this._randRange(0, Math.PI * 2) : 0
      },
      parTime: 12.0 + axesCount * 4.0,
      timeLimit: 35
    };
  }

  // 7. Logic Lab / Core Terminals
  _generateLogical(norm, isBoss, D) {
    const ruleTypes = ['arithmetic', 'geometric', 'alternating', 'fibonacci'];
    const ruleType = isBoss ? 'alternating' : this._randChoice(ruleTypes);
    const seqLen = Math.round(4 + norm * 2);

    let start = this._randInt(2, 10);
    let step = this._randInt(2, 6);
    const seq = [];

    for (let i = 0; i < seqLen; i++) {
      if (ruleType === 'arithmetic') seq.push(start + i * step);
      else if (ruleType === 'geometric') seq.push(start * Math.pow(2, i));
      else if (ruleType === 'fibonacci') seq.push(i <= 1 ? start : seq[i - 1] + seq[i - 2]);
      else seq.push(i % 2 === 0 ? start + i * 2 : start + i * 5);
    }

    const answer = ruleType === 'arithmetic' ? start + seqLen * step
                 : ruleType === 'geometric' ? start * Math.pow(2, seqLen)
                 : ruleType === 'fibonacci' ? seq[seqLen - 1] + seq[seqLen - 2]
                 : (seqLen % 2 === 0 ? start + seqLen * 2 : start + seqLen * 5);

    const options = [
      answer,
      answer + step,
      answer - step,
      answer + this._randChoice([-1, 1, 2]) * 3
    ].sort(() => this._random() - 0.5);

    return {
      skill: 'logical',
      difficulty: D,
      isBoss,
      sequence: seq,
      answer,
      options,
      ruleType,
      parTime: 10.0 + norm * 5.0,
      timeLimit: 25
    };
  }
}
