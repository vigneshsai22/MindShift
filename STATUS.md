# MindShift 3D — System Status & 30-Game Audit

## Overview
MindShift 3D is an adaptive 3D multimedia cognitive challenge game set in a virtual research facility with 6 cognitive skill wings (Memory, Logic, Observation, Pattern, Reaction, Spatial). The system runs natively over HTTP using vanilla ES6 modules and Three.js (r165), with a Glicko-Elo adaptive rating engine, AI Pacing Director FSM, and procedural Web Audio synthesis.

Default entry point is **`http://localhost:8080/`** (no query string required).

---

## 30-Game Audit Table

| # | Game ID | Game Name | Cognitive Skill | Status | Levels Working | Type | Known Bugs / Notes |
|---|---|---|---|:---:|:---:|:---:|---|
| 1 | `lumen-pond` | Lumen Pond | Memory | **Playable** | 1–30 | 3D | None. Radial lily pads with synth pitches and sequence player. |
| 2 | `witness-room` | Witness Room | Memory | **Card-only** | 0 | 3D | Card-only in Catalogue. Video-clue episodic memory scheduled for Tier 2. |
| 3 | `echo-shelves` | Echo Shelves | Memory | **Card-only** | 0 | 3D | Card-only in Catalogue. Spatial memory shelf reconstruction scheduled for Tier 3. |
| 4 | `tone-tower` | Tone Tower | Memory | **Card-only** | 0 | 2.5D | Card-only in Catalogue. Melodic pitch recall scheduled for Tier 2. |
| 5 | `twin-crystals` | Twin Crystals | Memory | **Card-only** | 0 | 2.5D | Card-only in Catalogue. 3D grid pair matching scheduled for Tier 3. |
| 6 | `terminal-hack` | Terminal Hack | Logic | **Playable** | 1–30 | 3D | None. Boolean logic circuits (AND/OR/XOR) with interactive raycast toggle registers. |
| 7 | `gate-circuit` | Gate Circuit | Logic | **Card-only** | 0 | 3D | Card-only in Catalogue. Multi-switch power routing scheduled for Tier 3. |
| 8 | `evidence-board` | Evidence Board | Logic | **Card-only** | 0 | 3D | Card-only in Catalogue. Deduction constraint grid scheduled for Tier 3. |
| 9 | `balance-lab` | Balance Lab | Logic | **Card-only** | 0 | 2.5D | Card-only in Catalogue. Binary-search scale weighing scheduled for Tier 2. |
| 10 | `number-forge` | Number Forge | Logic | **Card-only** | 0 | 2.5D | Card-only in Catalogue. Arithmetic tile solver scheduled for Tier 2. |
| 11 | `anomaly-rooms` | Anomaly Rooms | Observation | **Playable** | 1–30 | 3D | None. 3D containment lab with procedural subtle discrepancy parameters. |
| 12 | `surveillance-wall` | Surveillance Wall | Observation | **Card-only** | 0 | 3D | Card-only in Catalogue. Multi-feed monitoring scheduled for Tier 2. |
| 13 | `hidden-archive` | Hidden Archive | Observation | **Card-only** | 0 | 3D | Card-only in Catalogue. Flashlight search scheduled for Tier 3. |
| 14 | `swarm-count` | Swarm Count | Observation | **Card-only** | 0 | 2.5D | Card-only in Catalogue. Multiple object tracking scheduled for Tier 2. |
| 15 | `flicker-lab` | Flicker Lab | Observation | **Card-only** | 0 | 2.5D | Card-only in Catalogue. Change-blindness flicker testing scheduled for Tier 3. |
| 16 | `hologram-matrix` | Hologram Matrix | Pattern | **Playable** | 1–30 | 3D | None. Raven's Progressive Matrices in 3D holographic projection with candidate matching. |
| 17 | `pattern-wall` | Pattern Wall | Pattern | **Card-only** | 0 | 3D | Card-only in Catalogue. Audiovisual lever sequences scheduled for Tier 2. |
| 18 | `cipher-dials` | Cipher Dials | Pattern | **Card-only** | 0 | 3D | Card-only in Catalogue. Rotational cipher dials scheduled for Tier 3. |
| 19 | `factory-sorter` | Factory Sorter | Pattern | **Card-only** | 0 | 2.5D | Card-only in Catalogue. Mid-run rule switching conveyor scheduled for Tier 2. |
| 20 | `tile-cascade` | Tile Cascade | Pattern | **Card-only** | 0 | 2.5D | Card-only in Catalogue. Sequence prediction cascade scheduled for Tier 3. |
| 21 | `reflex-arena` | Reflex Arena | Reaction | **Playable** | 1–30 | 3D | None. Dome target drone acquisition with Go/No-Go inhibition and latency tracking. |
| 22 | `laser-corridor` | Laser Corridor | Reaction | **Card-only** | 0 | 3D | Card-only in Catalogue. Timed rhythmic laser avoidance scheduled for Tier 2. |
| 23 | `lane-shift` | Lane Shift | Reaction | **Card-only** | 0 | 3D | Card-only in Catalogue. 3D highway runner with divided attention scheduled for Tier 3. |
| 24 | `signal-console` | Signal Console | Reaction | **Card-only** | 0 | 2.5D | Card-only in Catalogue. Choice reaction flip console scheduled for Tier 2. |
| 25 | `reactor-control` | Reactor Control | Reaction | **Card-only** | 0 | 3D | Card-only in Catalogue. Multitasking gauge monitoring scheduled for Tier 3. |
| 26 | `rotation-core` | Rotation Core | Spatial | **Playable** | 1–30 | 3D | None. Shepard-Metzler mental rotation matching 3D polyhedra vs chiral enantiomers. |
| 27 | `net-folder` | Net Folder | Spatial | **Card-only** | 0 | 3D | Card-only in Catalogue. 3D cube net mental folding scheduled for Tier 3. |
| 28 | `mind-map-maze` | Mind Map Maze | Spatial | **Card-only** | 0 | 3D | Card-only in Catalogue. Top-down maze recall scheduled for Tier 3. |
| 29 | `frost-route` | Frost Route | Spatial | **Card-only** | 0 | 2.5D | Card-only in Catalogue. Isometric sliding pathfinding scheduled for Tier 2. |
| 30 | `drop-lab` | Drop Lab | Spatial | **Card-only** | 0 | 3D | Card-only in Catalogue. Physics rope & support chain reaction scheduled for Tier 3. |

**Audit Summary:**
- **Playable Games:** 6 / 30 (100% of Tier 1 reference games across all 6 cognitive skills, with complete procedural level scaling from Level 1 to 30).
- **Card-Only ("Coming soon") Games:** 24 / 30 (accurately labeled in Catalogue Terminal with lock badges; non-playable cards do not trigger false starts).

---

## Files Changed in This Task

1. [`index.html`](file:///c:/2d/index.html):
   - Replaced old four-card menu entry with new **MindShift 3D** Home Screen.
   - Added big button "Enter the Mind Lab" (Assessment Mode).
   - Added big button "Game Catalogue" (Free Practice).
   - Added button "Performance Report" (with tooltip state).
   - Added link "Legacy modes" pointing to legacy 2D screen.
   - Added key hints footer (`<kbd>Tab</kbd>`, `<kbd>M</kbd>`, `<kbd>F3</kbd>`, `<kbd>Esc</kbd>`).
   - Updated splash branding to "MindShift 3D — Adaptive Cognitive Research Facility".
   - Updated `game-mode-select` header to "Legacy Game Modes".

2. [`js/main.js`](file:///c:/2d/js/main.js):
   - Configured default URL `http://localhost:8080/` (no query string) to load the new MindShift 3D home screen directly.
   - Preserved `?3d=1` as an alias that directly launches 3D assessment mode.
   - Preserved `?legacy=1` and `?game=<id>&level=<n>`.

3. [`js/screens/MainMenu.js`](file:///c:/2d/js/screens/MainMenu.js):
   - Added bindings for `btn-enter-lab` (`startAssessmentMode()`).
   - Added bindings for `btn-game-catalogue` (`startFreePractice()`).
   - Added bindings and validation for `btn-performance-report` (`_hasReportData()` check).
   - Added binding for `link-legacy-modes` (`navigate('game-mode-select')`).

4. [`js/App.js`](file:///c:/2d/js/App.js):
   - Added `startAssessmentMode()` to run assessment sequence through the 6 cognitive domains.
   - Added `startFreePractice()` to launch 3D mode directly into Catalogue Terminal.
   - Connected `catalogue:select` to open `LevelMap` before launching a challenge.
   - Connected `levelmap:select` to load the selected level.
   - Connected `levelmap:back` to return to Catalogue.
   - Added real-time telemetry updates to F3 debug overlay (`FPS`, `drawCalls`, `triangles`, `directorState`, `eloR`, `eloRD`).

5. [`js/ui/LevelMap.js`](file:///c:/2d/js/ui/LevelMap.js):
   - Added `setGame(gameId, gameName)` method to dynamically update title and level stars per game.

6. [`js/ui/CatalogueTerminal.js`](file:///c:/2d/js/ui/CatalogueTerminal.js):
   - Implemented honest status badges: `▶ Playable (1-30)` for playable games, `🔒 Coming soon` for card-only games, and `⚠️ Beta` for partial games.
   - Guarded card clicks so card-only games cannot be launched as broken games.

7. [`js/data/games.json`](file:///c:/2d/js/data/games.json):
   - Audited and added explicit `"status": "playable"` or `"status": "card-only"` to all 30 games.

8. [`css/screens.css`](file:///c:/2d/css/screens.css):
   - Styled `.home-cta-container`, `.btn-home-big`, `.btn-enter-lab`, `.btn-game-catalogue`, `.btn-home-secondary`, `.link-legacy-modes`, and `.home-key-hints`.
   - Added styles for `.cat-playable-badge`, `.cat-beta-badge`, and `.cat-lock-badge`.

9. [`DECISIONS.md`](file:///c:/2d/DECISIONS.md):
   - Logged architectural decisions for default entry, home screen CTA design, legacy modes preservation, and honest status audit.
