# MindShift 3D — Upgrade Progress Tracker

## Overall Roadmap Status

- [x] **STAGE 1: DIAGNOSE AND FIX INPUT (cursor and touch)**
  - [x] Create ONE shared `InputManager.js` (`js/core/InputManager.js`) using Pointer Events (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`).
  - [x] Set `touch-action: none` on `#three-canvas` and prevent default context menu/scrolling/zoom during play.
  - [x] Accurate NDC calculation from `canvas.getBoundingClientRect()` with resize/scroll/orientation listeners.
  - [x] Center-screen raycasting when pointer lock is active; pointer-based raycasting otherwise. Removed unwarranted pointer lock hijacking in click-based scenes.
  - [x] Audit UI overlays (`#hud-3d`, `.hud3d-cockpit-bar`, subtitles, vignette): set `pointer-events: none` on decorative wrappers and `pointer-events: auto` exclusively on interactive buttons/docks.
  - [x] Enlarged invisible hit proxies (>= 44px on screen) for all 3D interactives.
  - [x] Instant hover/press visual feedback (scale, emissive bump, pointer cursor) and procedural audio ticks (`SFXLib.click`, `SFXLib.hover`).
  - [x] Multi-touch tracking and `setPointerCapture` for smooth touch drags.
  - [x] Keyboard input alternatives (number keys 1–9, WASD/arrows, Enter/Space).
  - [x] First-user-gesture Web Audio context resume.
  - [x] Built automated input test suite `window.__dev.testInput()` and `window.__dev.testAllGames()`.
  - [x] Verified 100% hit rate across all 6 Tier 1 games (`lumen-pond`, `terminal-hack`, `hologram-matrix`, `rotation-core`, `reflex-arena`, `anomaly-rooms`).
  - [x] **Game Catalogue & 30-Level Selection Flow**:
    - Fixed empty `#cat-grid` bug with robust fallback data and dynamic registry fetching in `CatalogueTerminal.js`.
    - Removed auto-launch of Lumen Pond on "Enter the Mind Lab"; both entry buttons now allow choosing any cognitive domain.
    - Connected all cards to `LevelMap.js` allowing players to select any difficulty level from 1 to 30.
    - Added difficulty tier guidance (Calibration 1–5, Intermediate 6–15, Advanced 16–25, Neural Peak 26–30).

- [ ] **STAGE 2: RESPONSIVENESS AND PERFORMANCE**
  - Target: 60 FPS on medium quality, input-to-visual latency < 100 ms.
  - Single RAF loop with clamped delta time.
  - Zero per-frame allocations (vectors, matrices, geometries).
  - InstancedMesh / geometry merging to reduce draw calls.
  - Shadow map & dynamic light budget (<= 4 dynamic lights).
  - PostFX auto-downgrade when FPS < 45.
  - Object/particle pooling & memory leak prevention.

- [ ] **STAGE 3: SHARED MULTIMEDIA KIT**
  - MaterialLib, LightingRigs, Environment, TweenLib + Easing, ParticleFX, CameraRig, JuiceKit, UI polish, procedural AudioKit, VideoTexture support.

- [ ] **STAGE 4: PER-GAME VISUAL AND ANIMATION UPGRADE**
  - Batches of 5 across all 30 games.

- [ ] **STAGE 5: CATALOGUE, HOME AND TRANSITIONS**
  - Live animated 3D backgrounds, smooth page transitions, responsive touch controls.

- [ ] **STAGE 6: FINAL VERIFICATION**
  - Automated bot benchmark across levels 1, 15, 30; final before/after telemetry table.
