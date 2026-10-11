# MIND SHIFT – Adaptive 3D Multimedia Cognitive Challenge Game
## BTech Information Technology Semester Project – Unity 3D Project Guide

---

### Project Overview
**MindShift 3D** is an adaptive cognitive gaming environment developed in Unity (C#) where players explore the **Mind Lab Research Facility** and undergo multimedia cognitive challenges across six testing domains:
1. **Memory Lab**: 3D object observation, blackout recall, and spatial change detection.
2. **Observation Lab**: CCTV surveillance scanning, video anomaly tagging, and detail tracking.
3. **Logic Lab**: Mechanism circuits, logic switches, conditional compound rules.
4. **Reaction Lab**: Reflex matrix, rapid signal detection, and decoy filtering.
5. **Spatial Lab**: 3D rotational puzzle matching and multi-axis socket alignment.
6. **Audio / Pattern Lab**: Acoustic sequence recall and neural grid illumination.

---

### Unity Environment Setup

#### Recommended Unity Versions:
- **Unity 2022.3 LTS** or **Unity 2023.2 / Unity 6**
- Render Pipeline: Universal Render Pipeline (URP) or Built-in Render Pipeline

#### Tags & Layers Setup
In Unity Editor (`Edit -> Project Settings -> Tags and Layers`):
- **Tags**:
  - `Player`
  - `Interactable`
- **Layers**:
  - `Interactable` (Layer 8)
  - `Ignore Raycast` (Layer 2)

---

### Architecture & Folder Structure

```
MindShift3D/
└── Assets/
    ├── Scripts/
    │   ├── Core/               # GameManager, SceneLoader, Singleton
    │   ├── Player/             # PlayerController, CameraController, InteractionSystem
    │   ├── Challenges/         # ChallengeBase, ChallengeManager, ChallengeConfig
    │   │   ├── Memory/         # MemoryChallenge, MemoryObjectPedestal
    │   │   ├── Observation/    # ObservationChallenge, AnomalyObject
    │   │   ├── Logic/          # LogicChallenge, LogicSwitch
    │   │   ├── Reaction/       # ReactionChallenge, ReactionPanel
    │   │   ├── Spatial/        # SpatialChallenge, RotatableShape
    │   │   ├── Audio/          # AudioChallenge, SoundButton
    │   │   └── Pattern/        # PatternChallenge, PatternPanel
    │   ├── Adaptive/           # AdaptiveDifficultyEngine (PS algorithm)
    │   ├── Scoring/            # ScoringSystem (time & accuracy modifiers)
    │   ├── Hints/              # HintSystem (3-tier progressive)
    │   ├── Progression/        # ProgressionSystem, AchievementSystem
    │   ├── Analytics/          # AnalyticsManager (insight engine)
    │   ├── Profile/            # PlayerProfile, SessionData, CognitiveScoreData
    │   ├── Storage/            # SaveLoadManager (JSON persistence)
    │   ├── Audio/              # AudioManager (BGM crossfade, SFX, 3D sound)
    │   ├── Media/              # VideoManager (CCTV video playback & cutscenes)
    │   ├── Environment/        # DoorController, HologramDisplay (ARIA AI)
    │   └── UI/                 # UIManager, HUDController, ResultsUI, RadarChart, BarChart, LineChart
    └── Resources/
        └── ChallengeConfigs/   # MemoryConfig.json, LogicConfig.json, ReactionConfig.json
```

---

### Key Algorithms & Features

#### 1. Adaptive Difficulty Engine (`AdaptiveDifficultyEngine.cs`)
- Computes **Performance Score ($PS$)**:
  $$PS = (W_{acc} \times Acc) + (W_{speed} \times Speed) - (W_{hints} \times Hints)$$
- Calculates rolling exponential moving average across recent challenges.
- Per-category adaptation: Player might face Hard Memory challenges while staying on Medium Logic.

#### 2. Scoring Algorithm (`ScoringSystem.cs`)
- Calculates base score scaled by difficulty multiplier ($1.0\times$ Easy, $1.5\times$ Medium, $2.0\times$ Hard).
- Applies accuracy multiplier, speed bonus ($T_{limit} - T_{taken}$), streak multiplier, and progressive hint penalties.

#### 3. Data Persistence (`SaveLoadManager.cs`)
- Persists player profile, level, unlocked achievements, and full multi-session history to JSON at:
  `Application.persistentDataPath/profiles/{PlayerName}_profile.json`

#### 4. Procedural Canvas Charts (`RadarChart.cs`, `BarChart.cs`, `LineChart.cs`)
- Custom `MaskableGraphic` implementations drawing polygonal spider charts, category benchmarks, and session trend lines directly via `VertexHelper` with zero external dependencies.

---

### Faculty Demonstration Checklist
1. **Launch Scene**: Start from `Bootstrap` or `MainMenu`.
2. **Player Profile**: Enter a student/player name to show JSON persistence.
3. **Lobby & ARIA**: Walk through the 3D lobby, interact with ARIA (AI Guide), demonstrate blast door sliding animation.
4. **Memory Lab**: Observe objects, trigger blackout, demonstrate recall detection and score banner.
5. **Logic / Reaction Lab**: Showcase interactive switches and timing reflex matrix.
6. **Adaptive AI Verification**: Demonstrate in Inspector how high score dynamically upgrades subsequent challenge difficulty.
7. **Analytics Dashboard**: Show final Results screen featuring the 6-axis Radar Chart, benchmark Bar Chart, and textual insight diagnostics.
