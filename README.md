# MINDSHIFT: NEURAL BREACH
### Adaptive 3D Multimedia Cognitive Assessment & Engagement Engine
*Final-Year B.Tech Capstone Project — Department of Computer Science & Engineering*

---

## 1. Executive Summary & Design Pillars
**MINDSHIFT: NEURAL BREACH** is an adaptive, first-person 3D multimedia game designed to benchmark and train six primary cognitive faculties:
1. **Working Memory & Sequential Recall** (*Memory Vault*)
2. **Audio & Pitch Discrimination** (*Resonance Tunnel*)
3. **Pattern Recognition & Topological Invariance** (*Hologram Assembly*)
4. **Visual Observation & Anomaly Detection** (*Anomaly Chamber*)
5. **Reaction Time & Positional Reflex** (*Reflex Arena*)
6. **Spatial Reasoning & 3D Mental Rotation** (*Rotation Core*)
7. **Deductive Logic & Algorithmic Sequence Synthesis** (*Final Core Terminal*)

### Core Pillars
- **Physical Interaction**: Challenges are executed directly in 3D Euclidean space (clicking, raycasting, aligning, grabbing, dodging) rather than through static 2D cards.
- **Reactive Audiovisual Environment**: Lighting, volumetric fog, procedural music layers, and AI avatar ARIA respond in real time to player flow and stress.
- **Defensible & Fair Mathematical Adaptivity**: Difficulty adjustment is governed by a continuous Glicko-Elo probabilistic model and an AI Director finite state machine.
- **Sensory Juice**: Camera shake, field-of-view punch, hit-stop, and zero-GC particle bursts provide instant tactile feedback.
- **High Replayability**: Branching Slay-the-Spire sector topology, deterministic Mulberry32 daily challenge seeds, and ghost run comparisons.

---

## 2. System Architecture & Event-Driven Engine

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT BROWSER                                    |
|                                                                                   |
|  [HTML5 Canvas]  <--->  [Three.js r165 Scene3D]  <--->  [ACESFilmic PostFX]       |
|         ^                         ^                             ^                 |
|         |                         |                             |                 |
|  [PlayerController] <---> [FacilityBuilder] <---> [6 Cognitive Lab Sectors]       |
+---------|-------------------------|-----------------------------|-----------------+
          |                         |                             |
          +-------------------------+-----------------------------+
                                    |
                            [EventBus.js] (Pub/Sub)
                                    |
          +-------------------------+-----------------------------+
          |                         |                             |
          v                         v                             v
  [Adaptive EloModel]      [AI Pacing Director]          [Adaptive 4-Layer Audio]
  - Expected score p        - BUILD / PEAK /              - Bass / Pad / Arp / Drums
  - Continuous score S        RELIEF / RECOVER            - Pitch shift with combo
  - Dynamic K(RD) factor    - Modulation tokens           - HRTF 3D PannerNode
          |                         |                             |
          +-------------------------+-----------------------------+
                                    |
                                    v
                         [HUD & F3 Telemetry Overlay]
                         [Cognitive Fingerprint Report]
                         [Storage & Local Leaderboard]
```

### Event Contracts (`EventBus.js`)
- `run:start` / `run:end`: Emitted during session initiation and completion.
- `trial:start` / `trial:complete`: Standardized contract payload:
  `{ skill, difficulty, correct, responseTime, attempts, hintsUsed, extra }`
- `director:state` / `director:modulate`: Emits FSM transitions and world lighting/audio modulation tokens.
- `combo:change`: Dispatches combo count and multiplier; elevates musical pitch.
- `telemetry:update`: Real-time push for the F3 live debug overlay.
- `player:step` / `player:interact`: Locomotion and raycasting dispatch.

---

## 3. Mathematical Foundations of Adaptivity

### 3.1 Glicko-Style Continuous Elo Rating System
The player's skill rating $R$ and uncertainty (Rating Deviation, $RD$) are maintained independently for each cognitive domain. Every challenge trial possesses an intrinsic difficulty rating $D$.

#### Expected Success Probability ($p$)
The probability that a player with rating $R$ succeeds on a trial of difficulty $D$ follows the logistic sigmoid:
$$p = \frac{1}{1 + 10^{(D - R)/400}}$$

#### Continuous Performance Score ($S \in [0, 1]$)
Rather than a naive binary outcome, performance score $S$ rewards both correctness and response latency against par time:
$$S = \begin{cases} 0.60 + 0.40 \times \max\left(0, \frac{\text{parTime} - \text{responseTime}}{\text{parTime}}\right) - \text{penalties}, & \text{if correct} \\ 0.0, & \text{if incorrect} \end{cases}$$

#### Dynamic $K$-Factor Scaling
The update magnitude scales with uncertainty $RD$:
$$K(RD) = K_{\min} + (K_{\max} - K_{\min}) \times \min\left(1, \frac{RD}{RD_0}\right)$$
where $K_{\min} = 16$, $K_{\max} = 48$, and $RD_0 = 350$.

#### Rating & Uncertainty Updates
$$\Delta R = K(RD) \times (S - p), \quad R' = R + \Delta R$$
$$RD' = \sqrt{\frac{1}{\frac{1}{RD^2} + \frac{1}{v^2}}}$$
where $v = 300$ is the Bayesian observation variance.

#### Flow Zone Difficulty Selection
To maintain Mihaly Csikszentmihalyi's psychological **Flow Zone** ($p \approx 0.70$), the target difficulty $D$ is derived by inverting the expected score function:
$$D = R + 400 \times \log_{10}\left(\frac{1}{p} - 1\right)$$
For $p = 0.70$, $D \approx R - 147.2$ Elo points.

---

### 3.2 AI Pacing Director Finite State Machine
The AI Director manages psychological tension and avoids cognitive fatigue using a 4-state automaton:

| State | Activation Trigger | Behavioral & World Impact |
| :--- | :--- | :--- |
| **BUILD** | Baseline trial state | Linear tension ramp, standard lighting, ambient music layers 1 & 2. |
| **PEAK** | Win streak $\ge 3$ or Sector Boss trial | Intensified lighting ($1.35\times$), fast syncopated drums, pitch elevation, $D + 60$. |
| **RELIEF** | Post-boss victory or climax completion | Calming ambient wash, suppressed percussion, breather trial ($D - 75$). |
| **RECOVER** | Loss streak $\ge 2$ or $\ge 4$ rapid misclicks | Softened lighting, supportive ARIA cues, reduced difficulty ($D - 120$). |

---

## 4. Multimedia & Technical Art Highlights
- **Renderer & Tone Mapping**: Three.js ACESFilmic tone mapping (`exposure: 0.9`) with PBR standard materials and light shafts.
- **Custom Shader Post-Processing (`PostFX.js`)**:
  - Conservative Bloom (`threshold: 0.85`, `strength: 0.6`, `radius: 0.4`) preventing white-out.
  - Screen vignette and film-grain scanlines.
  - Chromatic aberration pulse dynamically triggered on misclicks or errors.
- **Zero-GC Particle Pooling (`ParticlePool.js`)**: Pre-allocated Float32BufferAttributes for success bursts and combo trails.
- **Procedural Canvas Textures (`ProceduralTextures.js`)**: Real-time canvas generation of sci-fi floor grids, circuit traces, and backlit signage.
- **Procedural 3D Audio & Music (`SpatialAudio.js` & `AdaptiveMusic.js`)**:
  - HRTF 3D PannerNode with inverse distance attenuation.
  - 4-layer synthesizer (sub-bass, chord pad, square-wave arpeggio, hi-hat/snare) responding to tempo and combo multipliers.
- **ARIA Holographic Avatar (`ARIA.js`)**:
  - Custom GLSL hologram shader with Fresnel edge glow, animated scanlines, and orbital rings.
  - Web Speech API integration with subtitle overlay and synthesizer fallback.
  - Evolves through 3 narrative personality stages (*Friendly*, *Sarcastic*, *Unsettling*).

---

## 5. Monte Carlo Simulation Analysis ($N = 300$)
An empirical Monte Carlo study evaluated 300 virtual cognitive profiles across 20 trials, contrasting Static Fixed difficulty, Heuristic Rule-Based adaptation, and the MindShift Glicko-Elo + AI Director framework.

```
Estimation Error Over 20 Trials:
Elo (220 to 45 pts)      : ========-------------------------------------> [CONVERGED in 7 trials]
Rule-Based (220 to 140)  : ========================---------------------> [QUANTIZATION LAG]
Static Fixed (Invariant) : ============================================> [NO CONVERGENCE]
```

- **Flow Zone Dwell Time**: Glicko-Elo kept virtual players within the target flow zone ($p \in [0.65, 0.75]$) for **74.2%** of trials, compared to **46.1%** for rule-based systems and **28.5%** for fixed difficulty.
- **Frustration Cascades**: The AI Director reduced catastrophic failure streaks ($\ge 3$ consecutive misses) by **82%** relative to non-adaptive baselines.

---

## 6. How to Run Locally

Because the project utilizes native ES6 modules and pinned CDN import maps, no compilation or bundler step is needed:

```bash
# Clone the repository
git clone https://github.com/vigneshsai22/MindShift.git
cd MindShift

# Launch with any local HTTP server
npx serve -l 8080
# Or using Python 3:
python -m http.server 8080
```
Open your browser to: `http://localhost:8080/`

---

## 7. 5-Minute Live Review Panel Demo Script

### Minute 1: The Hook & Architectural Overview (0:00 - 1:00)
- Launch the main menu terminal. Highlight that the project runs entirely on vanilla ES6 modules without build steps.
- Explain the motivation: Standard cognitive testing relies on repetitive static forms; *MindShift: Neural Breach* transforms psychometrics into a spatial, first-person 3D experience.
- Click **"🔬 3D Mind Lab Research Facility"**. Show the intro camera glide down into the central hub.

### Minute 2: Environmental Reactivity & First-Person Locomotion (1:00 - 2:00)
- Move via WASD into the hub. Point out the procedural crystalline **Neural Core** and the holographic avatar **ARIA**.
- Press **`F3`** to bring up the live **Adaptive Telemetry Debug Overlay**.
- Walk toward the Sector 1 door: show the proximity sensor opening the pneumatic door with glowing signage.

### Minute 3: Sector 1 (Memory Vault) & Audiovisual Juice (2:00 - 3:00)
- Enter the Memory Vault. Observe the tiles illuminate in sequence with pitch-mapped acoustic tones.
- Enter the blackout phase, then recall the sequence. Point out:
  1. Pointer-lock center raycasting (`(0, 0)` NDC).
  2. The FOV punch, screen flash, and particle burst upon completion.
  3. The real-time update of player Elo ($R$), uncertainty ($RD$), and AI Director state in the HUD.

### Minute 4: The AI Director & Dynamic World Modulation (3:00 - 4:00)
- Purposefully demonstrate the AI Director FSM:
  - Intentionally trigger consecutive successes to watch the Director enter `PEAK` (heavy drum beats, intensified lighting, high combo pitch).
  - Intentionally fail to demonstrate the `RECOVER` state and chromatic aberration error pulse.

### Minute 5: Cognitive Fingerprint Report & Export (4:00 - 5:00)
- Conclude the run to trigger the **Cognitive Fingerprint Report** and 3D rotating **Brain Map**.
- Review the Chart.js radar graph, strongest vs. weakest cognitive skills, and personalized recommendations.
- Click **"📥 EXPORT CSV"** to demonstrate raw scientific trial telemetry logging ready for statistical analysis.

---

## 8. 15 Viva Questions with In-Depth Technical Answers

#### Q1: Why use a Glicko-style Elo rating model over standard Elo?
> **Answer**: Standard Elo uses a static $K$-factor, treating all rating estimates with equal certainty. Glicko introduces Rating Deviation ($RD$), which quantifies measurement variance. When a player begins or encounters an unfamiliar domain, $RD$ is high ($350$), yielding a high $K$-factor ($48$) for rapid convergence. As evidence accumulates, $RD$ shrinks toward $50$, lowering $K$ to $16$ to prevent erratic fluctuations caused by isolated misclicks.

#### Q2: How is the expected outcome $p$ calculated, and why is $p = 0.70$ chosen as the target?
> **Answer**: Expected outcome follows the logistic formula $p = \frac{1}{1 + 10^{(D - R)/400}}$. According to psychological research on flow states (Csikszentmihalyi) and zone of proximal development (Vygotsky), a 70% anticipated success rate presents sufficient friction to maintain engagement without inducing frustration or boredom.

#### Q3: What prevents the scene from blowing out to pure white when using bloom?
> **Answer**: In `PostFX.js`, the `UnrealBloomPass` is configured with a high luminosity threshold of `0.85`, radius of `0.4`, and strength of `0.6`. Standard materials possess low base emissive values ($0.2$ to $0.4$). Only specific event-triggered flashes or core crystalline highlights exceed the $0.85$ threshold.

#### Q4: Why is pointer lock problematic for raycasting, and how is it addressed?
> **Answer**: In pointer lock mode (`document.requestPointerLock()`), the browser freezes the mouse coordinates (`e.clientX` and `e.clientY`) at the location where lock occurred. If raycasting is performed using mouse event coordinates, it will intersect only that frozen screen point. *PlayerController.js* and *LabBase.js* resolve this by raycasting strictly from Normalized Device Coordinates $(0, 0)$ (the physical center of the screen).

#### Q5: How is garbage collection managed during heavy particle bursts?
> **Answer**: Instead of instantiating new `THREE.Mesh` or `THREE.BufferGeometry` instances during gameplay, `ParticlePool.js` pre-allocates fixed geometry buffers and Float32 typed arrays. Particles are activated and recycled by updating position/opacity offsets, avoiding runtime GC pauses.

#### Q6: How does the AI Director finite state machine prevent cognitive burnout?
> **Answer**: The Director monitors rolling outcome windows and interaction frequency. If a player experiences $\ge 2$ consecutive failures or rapid misclicks ($< 350$ms apart), the Director transitions into `RECOVER`. It reduces difficulty by $120$ Elo points, prompts ARIA to offer supportive hints, and dims environmental lighting.

#### Q7: How are the audio frequencies generated without audio assets?
> **Answer**: All audio is synthesized procedurally via the Web Audio API using `OscillatorNode`, `BiquadFilterNode`, and `GainNode`. Melodies are mapped to exact musical frequencies in Hertz (e.g., C4 = $261.63$ Hz, A4 = $440.00$ Hz) using mathematical exponential ramps for ADSR envelopes.

#### Q8: How does the 3D spatial audio track camera movement?
> **Answer**: `SpatialAudio.js` updates `audioCtx.listener` on every animation frame. It synchronizes listener position $(X, Y, Z)$ and forward/up orientation vectors with the Three.js camera world matrix. Audio sources utilize `PannerNode` with HRTF panning and inverse distance rolloff.

#### Q9: What is the purpose of the continuous score $S$ formula?
> **Answer**: A binary $0/1$ score ignores processing speed. By blending binary correctness ($60\%$ weight) with response speed against par time ($40\%$ weight), two players who answer correctly receive differentiated scores based on cognitive throughput.

#### Q10: How are deterministic daily runs ensured across different machines?
> **Answer**: Standard `Math.random()` cannot be seeded in JavaScript. *PRNG.js* implements the Mulberry32 32-bit generator seeded by the current calendar date string (`YYYY-MM-DD`). Given the same seed, Mulberry32 produces identical pseudorandom sequences across all client browsers.

#### Q11: How do Neural Upgrades (perks) maintain experimental fairness?
> **Answer**: Perks that provide mechanical advantages (e.g., $+15\%$ extra time or wider snapping margins) impose a documented, fixed score multiplier penalty (e.g., $-10\%$). This preserves the scientific validity of the final rating while allowing players strategic agency.

#### Q12: How are Three.js resources disposed of when switching rooms?
> **Answer**: When exiting or disposing of a lab, the scene group is traversed. Geometries are freed with `geometry.dispose()`, textures via `texture.dispose()`, and materials via `material.dispose()`. All event listeners and `requestAnimationFrame` IDs are cleared.

#### Q13: How is the ARIA avatar rendered as a hologram?
> **Answer**: ARIA uses a custom GLSL `ShaderMaterial` with vertex and fragment shaders. The fragment shader calculates a Fresnel term using the dot product of the surface normal and view direction $\left(1 - \mathbf{n} \cdot \mathbf{v}\right)^{2.2}$, superimposed over an animated vertical scanline function.

#### Q14: How does the system handle browser compatibility and mobile fallbacks?
> **Answer**: `_checkWebGL()` probes for WebGL2/WebGL contexts with user notifications if unsupported. Locomotion features pointer drag and click fallbacks for systems without pointer lock. Web Speech API includes procedural oscillator chirps if speech synthesis is unavailable.

#### Q15: Why is the non-clinical disclaimer necessary on the Cognitive Fingerprint Report?
> **Answer**: Academic and ethical standards for human-computer interaction and educational software require explicit distinction between gamified cognitive training instruments and clinically validated neuropsychological diagnostic tools (such as WAIS-IV or MoCA).
