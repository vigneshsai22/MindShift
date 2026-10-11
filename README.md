# MindShift – Adaptive Cognitive Challenge Game

> An intelligent, adaptive cognitive training platform and 3D research facility built with vanilla HTML5, CSS3, ES6 JavaScript, Three.js, Web Audio API, Web Speech API, and Chart.js.

---

## 🌟 Overview

**MindShift** evaluates and trains six core cognitive faculties:
- 💾 **Working Memory**
- 🧠 **Logical Reasoning**
- 🔷 **Pattern Recognition**
- 👁️ **Visual Observation**
- ⚡ **Reaction Time**
- 🔄 **Spatial Reasoning**

The platform dynamically adjusts difficulty in real time (Levels 1–5) based on a rolling performance window, response latency thresholds, and accuracy metrics.

---

## 🚀 Game Modes

### 1. 🔬 3D Mind Lab Research Facility
A first-person 3D research facility powered by **Three.js (r165)**:
- **Central Cyberpunk Hub**: Explore corridors and radial laboratory chambers.
- **ARIA (Holographic AI Guide)**: Hologram avatar rendered with procedural scanline shaders and voiced via the Web Speech API.
- **Dynamic 3D Labs**:
  - *Memory Vault*: Interactive glowing floor tile sequences with distractor illumination.
  - *Logic Lab*: Holographic sequence wall with animated physical console levers.
  - *Pattern Gallery*: 3×3 matrix wall of glowing geometric forms with rotating pedestal options.
  - *Observation Chamber*: Dual side-by-side environments with procedural visual anomalies.
  - *Reaction Arena*: 360° circular reflex challenge tracking millisecond latency.
  - *Spatial Lab*: 3D object rotation matching projected silhouette walls.
- **3D Brain Mapping**: Procedural 3D brain whose lobes glow according to cognitive strengths, accompanied by radar and bar charts.

### 2. 🧠 Classic Mode
Fast-paced cognitive evaluation across 6 interactive challenges with Web Audio feedback and visual particle systems.

### 3. 🔬 IQ & Reasoning Mode
7 IQ-style cognitive puzzles including Number Sequences, 3×3 Matrix Puzzles, Spatial Projections, Odd-One-Out, and Deductive Logic Puzzles.

### 4. ⚡ Mixed Mode
The ultimate workout combining all 13 challenge types with rolling difficulty adaptation.

---

## 🛠️ Technology Stack
- **Core**: Vanilla HTML5, CSS3 (Custom Properties & Glassmorphism), Modular ES6 JS.
- **3D Graphics**: Three.js (r165) via CDN import map, EffectComposer, UnrealBloomPass.
- **Audio**: Web Audio API (PannerNode 3D spatial audio, procedural synthesizers).
- **Voice**: Web Speech API (`SpeechSynthesis`).
- **Data Visualization**: Chart.js 4.4.
- **Persistence**: Browser `localStorage` for player profiles, streaks, and game history.

---

## 💻 Running Locally

No bundlers or build steps required. Serve the root folder using any static HTTP server:

```bash
# Python
python -m http.server 8080

# Or Node.js http-server / serve
npx serve -l 8080
```

Open your browser to `http://localhost:8080/`.
