/* ═══════════════════════════════════════════════════════════════
   App.js — Master Orchestrator for MindShift 3D
   Manages game state machine, 3D lifecycle, UI overlays (HUD3D,
   CatalogueTerminal, LevelMap, ResultScreen3D), adaptive Elo model,
   Director pacing, and developer API (__dev).
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { EventBus }           from './core/EventBus.js';
import { Config, CONFIG }     from './core/Config.js';
import { Storage }            from './core/Storage.js?v=20261012';
import { EloModel }           from './adaptive/EloModel.js';
import { Director }           from './adaptive/Director.js';
import { TrialGenerator }     from './adaptive/TrialGenerator.js';
import { Scene3D }            from './three/Scene3D.js';
import { CameraRig }          from './three/CameraRig.js';
import { PostFX }             from './three/PostFX.js';
import { SFXLib }             from './audio/SFXLib.js';
import { Tween }              from './kit/TweenLib.js';
import { HUD3D }              from './ui/HUD3D.js';
import { CatalogueTerminal }  from './ui/CatalogueTerminal.js';
import { LevelMap }           from './ui/LevelMap.js';
import { ResultScreen3D }     from './ui/ResultScreen3D.js';
import { InputManager }       from './core/InputManager.js';
import { getLevelConfig }      from './data/levels/index.js';

// Tier 1 Games
import { LumenPond }          from './games/memory/LumenPond.js';
import { TerminalHack }       from './games/logic/TerminalHack.js';
import { AnomalyRooms }       from './games/observation/AnomalyRooms.js';
import { HologramMatrix }     from './games/pattern/HologramMatrix.js';
import { ReflexArena }        from './games/reaction/ReflexArena.js';
import { RotationCore }       from './games/spatial/RotationCore.js';

const GAME_CLASSES = {
  'lumen-pond':      LumenPond,
  'terminal-hack':   TerminalHack,
  'anomaly-rooms':   AnomalyRooms,
  'hologram-matrix': HologramMatrix,
  'reflex-arena':    ReflexArena,
  'rotation-core':   RotationCore
};

export const ASSESSMENT_ORDER = [
  'lumen-pond',      // Memory Wing (Lumen Pond)
  'terminal-hack',   // Logic Wing (Terminal Hack)
  'hologram-matrix', // Pattern Wing (Hologram Matrix)
  'rotation-core',   // Spatial Wing (Rotation Core)
  'reflex-arena',    // Reaction Wing (Reflex Arena)
  'anomaly-rooms'    // Observation Wing (Anomaly Rooms)
];

export class App {
  constructor() {
    this.canvas = null;
    this.scene3d = null;
    this.cameraRig = null;
    this.postFX = null;

    this.hud = null;
    this.catalogue = null;
    this.levelMap = null;
    this.resultScreen = null;

    this.elo = null;
    this.director = null;
    this.trialGen = null;

    this.gamesData = null;
    this.activeGame = null;
    this.activeGameId = null;
    this.currentLevel = 1;
    this.score = 0;
    this.combo = 0;

    this._clock = new THREE.Clock();
    this._rafId = null;
    this._running = false;
    this._progress = {}; // { gameId: { stars: [0..3 per level], cleared: n } }
  }

  async init() {
    this.canvas = document.getElementById('three-canvas');
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'three-canvas';
      this.canvas.style.cssText = 'display:none;position:fixed;inset:0;width:100vw;height:100vh;z-index:1';
      document.body.appendChild(this.canvas);
    }

    // Load progress from Storage
    try {
      if (Storage && typeof Storage.get === 'function') {
        this._progress = Storage.get('mindshift_progress', {}) || {};
      } else {
        const raw = localStorage.getItem('mindshift_progress');
        this._progress = raw ? JSON.parse(raw) : {};
      }
    } catch (e) {
      this._progress = {};
    }

    // Load games.json registry
    try {
      const res = await fetch('js/data/games.json');
      this.gamesData = await res.json();
      if (this.catalogue) {
        this.catalogue.setGamesData(this.gamesData);
      }
    } catch (e) {
      console.warn('Could not fetch games.json, using fallback registry:', e);
      this.gamesData = { games: [] };
    }

    // Adaptive subsystem
    this.elo = new EloModel();
    this.director = new Director();
    this.trialGen = new TrialGenerator();

    // Initialize unified InputManager
    this.inputManager = new InputManager({ canvas: this.canvas });
    window.__inputManager = this.inputManager;

    // Setup Developer API
    this._setupDevApi();

    // Setup Keybindings
    this._bindKeys();

    // Listen to Trial Completion
    EventBus.on('trial:complete', (res) => this._onTrialComplete(res));
    EventBus.on('game:correct', (e) => {
      this.score += 150 * (e.combo || 1);
      this.combo = e.combo || 1;
      this.hud?.updateScore(this.score);
      this.hud?.updateCombo(this.combo);
      this.cameraRig?.fovPunch();
    });
    EventBus.on('game:incorrect', () => {
      this.combo = 0;
      this.hud?.updateCombo(0);
      this.cameraRig?.shake(0.2);
    });

    console.log('MindShift 3D App Orchestrator Initialized.');
  }

  async start3D() {
    if (this._running) return;
    this._running = true;

    // Show 3D Canvas, hide 2D app
    const appEl = document.getElementById('app');
    try {
      if (appEl) appEl.style.display = 'none';
      this.canvas.style.display = 'block';

      // 1. Init 3D Rendering & Camera
      this.scene3d = new Scene3D(this.canvas);
      await this.scene3d.init();

      this.inputManager.setCamera(this.scene3d.camera);
      this.inputManager.setScene(this.scene3d.scene);

      this.cameraRig = new CameraRig(this.scene3d.camera);
      this.postFX = new PostFX(this.scene3d);
      this.postFX.init();

      // 2. Build UI Overlays
      this.hud = new HUD3D();
      this.hud.build();
      this.hud.show();

      this.catalogue = new CatalogueTerminal({
        gamesData: this.gamesData,
        getProgress: (id) => this.getGameProgress(id)
      });
      this.catalogue.build();

      this.levelMap = new LevelMap({
        getStars: (lv) => (this._progress[this.activeGameId]?.levels?.[lv]?.stars || 0),
        isUnlocked: (lv) => true
      });
      this.levelMap.build();

      this.resultScreen = new ResultScreen3D();
      this.resultScreen.build();

      // 3. Audio & SFX
      try { SFXLib.init(); } catch (e) { console.warn('[App] SFX init:', e); }

      // 4. Start Render Loop
      this._loop();

      console.log('[MindShift] 3D world initialized successfully.');
    } catch (err) {
      // Reset state so button click can retry
      console.error('[MindShift] start3D() failed — resetting for retry:', err);
      this._running = false;
      this.scene3d = null;
      this.canvas.style.display = 'none';
      if (appEl) appEl.style.display = '';
      throw err;
    }
  }

  async startAssessmentMode() {
    try {
      await this.start3D();
      this.mode = 'assessment';
      this._assessmentIndex = 0;
      await this.catalogue?.show({
        title: '🔬 Mind Lab Facility — Cognitive Assessment',
        subtitle: 'Select any cognitive domain to begin your evaluation, then choose Level 1–30'
      });
      setTimeout(() => {
        this.hud?.flashPopup('MIND LAB: SELECT COGNITIVE CHALLENGE & LEVEL', '#00f2fe');
      }, 300);
    } catch (err) {
      console.error('[MindShift] startAssessmentMode failed:', err);
      alert('Could not start 3D mode. Check browser console (F12) for details.');
    }
  }

  async startFreePractice() {
    try {
      await this.start3D();
      this.mode = 'practice';
      await this.catalogue?.show({
        title: '🧠 Cognitive Game Catalogue — All Wings',
        subtitle: 'Explore all 30 facility games across 6 cognitive wings — select any challenge & level (1–30)'
      });
    } catch (err) {
      console.error('[MindShift] startFreePractice failed:', err);
      alert('Could not start 3D mode. Check browser console (F12) for details.');
    }
  }

  loadGame(gameId, level = 1, forceSkipOnboarding = false) {
    const isAutomated = window.__devBenchmarkActive ||
      window.location.search.includes('benchmark') ||
      window.location.search.includes('autoplay') ||
      window.location.search.includes('test');
    const hasOnboarded = !!localStorage.getItem('mindshift_onboarded_' + gameId);

    if (this.inputManager) {
      this.inputManager.clearTargets();
      this.inputManager.setDragHandler(null);
    }

    if (this.activeGame) {
      this.activeGame.exit();
      this.activeGame = null;
    }

    const GameCls = GAME_CLASSES[gameId];
    if (!GameCls) {
      console.warn(`Game ${gameId} is locked / not implemented yet.`);
      this.hud?.flashPopup(`MODULE LOCKED: UNDER FACILITY CONSTRUCTION`, '#ef4444');
      this.catalogue?.show();
      return;
    }

    this.activeGameId = gameId;
    this.currentLevel = level;
    this.combo = 0;

    // Retrieve metadata and rich level configuration
    const meta = this.gamesData?.games?.find(g => g.id === gameId) || { name: gameId, skill: 'memory' };
    const levelConfig = getLevelConfig(gameId, level);

    // Instantiate & build
    this.activeGame = new GameCls();
    this.activeGame.build(this.scene3d.scene, this.scene3d.camera);

    // Update HUD with level config
    this.hud.show(meta.name, level, meta.skill || 'memory', gameId);
    this.hud.updateScore(this.score);
    this.hud.updateCombo(0);
    this.hud.updateTimer(levelConfig.perRoundTime, levelConfig.perRoundTime);

    // Hook HUD hint buttons
    this.hud.onHint = (type) => {
      this.activeGame?.hint(type);
    };

    // If Level 1 for a new user, present Onboarding Step 1 Modal
    if (level === 1 && !hasOnboarded && !forceSkipOnboarding && !isAutomated) {
      this.hud.showOnboarding(gameId, {
        onPractice: () => {
          this.loadGame(gameId, 0);
        },
        onSkip: () => {
          localStorage.setItem('mindshift_onboarded_' + gameId, '1');
          this.hud.showCountdown(() => {
            this.loadGame(gameId, 1, true);
          });
        }
      });
      return;
    }

    // Start multi-round game mission
    this.activeGame.start(levelConfig);

    console.log(`Loaded game: ${meta.name} (Level ${level}, Rounds=${levelConfig.rounds}, D=${levelConfig.difficulty})`);
  }

  _onTrialComplete(res) {
    try {
      // Handle interactive practice round (Level 0) completion
      if (this.currentLevel === 0 || res.level === 0 || res.extra?.isPractice) {
        localStorage.setItem('mindshift_onboarded_' + this.activeGameId, '1');
        this.hud?.flashPopup('✓ PRACTICE CALIBRATION COMPLETE!', '#10b981');
        setTimeout(() => {
          this.hud?.showCountdown(() => {
            this.loadGame(this.activeGameId, 1, true);
          });
        }, 1200);
        return;
      }

      // 1. Calculate stars
      const stars = (this.activeGame?.constructor?.computeStars)
        ? this.activeGame.constructor.computeStars(res)
        : (res.correct ? (res.accuracy >= 0.9 && res.hintsUsed === 0 ? 3 : (res.accuracy >= 0.8 ? 2 : 1)) : 0);

      // Determine timeout state
      const isTimeout = !res.correct && ((res.responseTime || 0) >= ((res.parTime || 1) - 0.5));

      if (isTimeout) {
        this.hud?.flashPopup('TIME EXPIRED', '#ff4d4d');
      } else if (!res.correct) {
        this.hud?.flashPopup('TRIAL FAILED', '#ff4d4d');
      } else {
        this.hud?.flashPopup('TRIAL COMPLETE', '#00f2fe');
      }

      // 2. Evaluate with Director FSM safely
      if (this.director && typeof this.director.evaluateTrial === 'function') {
        try {
          this.director.evaluateTrial({
            correct: res.correct,
            responseTime: res.responseTime,
            parTime: res.parTime
          });
        } catch (dirErr) {
          console.warn('[Director] evaluateTrial error:', dirErr);
        }
      }

      // 3. Update Elo safely
      let eloDelta = 0;
      if (this.elo) {
        try {
          const oldRating = this.elo.getRating(res.skill);
          if (typeof this.elo.updateRating === 'function') {
            this.elo.updateRating(res.skill, res.difficulty, res.correct, res.responseTime, res.parTime);
          } else if (typeof this.elo.recordTrial === 'function') {
            this.elo.recordTrial({
              skill: res.skill,
              difficulty: res.difficulty,
              correct: res.correct,
              responseTime: res.responseTime,
              parTime: res.parTime
            });
          }
          const newRating = this.elo.getRating(res.skill);
          eloDelta = newRating - oldRating;
        } catch (eloErr) {
          console.warn('[Elo] update error:', eloErr);
        }
      }

      // 4. Save progress
      try {
        if (!this._progress[this.activeGameId]) {
          this._progress[this.activeGameId] = { levels: {}, totalStars: 0, cleared: 0 };
        }
        const gProg = this._progress[this.activeGameId];
        if (!gProg.levels[this.currentLevel] || stars > (gProg.levels[this.currentLevel].stars || 0)) {
          gProg.levels[this.currentLevel] = { stars, score: this.score };
        }
        if (typeof Storage !== 'undefined' && Storage && typeof Storage.set === 'function') {
          Storage.set('mindshift_progress', this._progress);
        } else {
          localStorage.setItem('mindshift_progress', JSON.stringify(this._progress));
        }
      } catch (storageErr) {
        console.warn('[Storage] save error:', storageErr);
      }

      // 5. Show Result Screen
      const gameMeta = this.gamesData?.games?.find(g => g.id === this.activeGameId);

      if (this.resultScreen) {
        this.resultScreen.show({
          gameName: gameMeta?.name || this.activeGameId,
          level: this.currentLevel,
          score: this.score,
          accuracy: res.accuracy,
          responseTime: res.responseTime,
          parTime: res.parTime,
          stars,
          eloDelta,
          passed: res.correct,
          isTimeout,
          hintsUsed: res.hintsUsed,
          rounds: res.extra?.rounds || (this.activeGame?.totalRounds || 5),
          correctRounds: res.extra?.correctRounds !== undefined ? res.extra.correctRounds : (this.activeGame?.correctRounds || 0),
          livesRemaining: res.extra?.livesRemaining !== undefined ? res.extra.livesRemaining : (this.activeGame?.lives || 0),
          extra: res.extra,
          onNext: () => {
            if (this.currentLevel < 30) {
              // Always stick to the same game and advance to the next level (1 to 30)
              this.loadGame(this.activeGameId, this.currentLevel + 1);
            } else {
              // All 30 levels completed in this game
              this.hud?.flashPopup('CONGRATULATIONS! ALL 30 LEVELS COMPLETED!', '#00f2fe');
              this.levelMap.setGame(this.activeGameId, gameMeta?.name || this.activeGameId);
              this.levelMap.show();
            }
          },
          onRetry: () => {
            this.loadGame(this.activeGameId, this.currentLevel);
          },
          onCatalogue: () => {
            this.catalogue?.show();
          }
        });
      }
    } catch (fatalErr) {
      console.error('[App] Fatal error in _onTrialComplete:', fatalErr);
      // Failsafe fallback
      try {
        this.resultScreen?.show({
          gameName: this.activeGameId,
          level: this.currentLevel,
          score: this.score,
          passed: res.correct,
          isTimeout: !res.correct,
          onNext: () => {
            if (this.currentLevel < 30) {
              this.loadGame(this.activeGameId, this.currentLevel + 1);
            } else {
              this.catalogue?.show();
            }
          },
          onRetry: () => this.loadGame(this.activeGameId, this.currentLevel),
          onCatalogue: () => this.catalogue?.show()
        });
      } catch (e2) {}
    }
  }

  getGameProgress(gameId) {
    const p = this._progress[gameId];
    if (!p) return { stars: 0, cleared: 0, unlocked: true };
    let stars = 0;
    let cleared = 0;
    for (const lv in p.levels) {
      stars += p.levels[lv].stars || 0;
      if (p.levels[lv].stars > 0) cleared++;
    }
    return { stars, cleared, unlocked: true };
  }

  _loop() {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(() => this._loop());

    const dt = this._clock.getDelta();

    // Update Tween engine
    Tween.update(dt);

    // Update active game
    if (this.activeGame && !this.activeGame.paused) {
      this.activeGame.update(dt);
      this.hud?.updateTimer(this.activeGame.remainingTime, this.activeGame._parTime);

      if (this.activeGame.remainingTime <= 0 && !this.activeGame.finished) {
        this.activeGame.completeTrial(false, 0);
      }
    }

    // Camera Rig update
    if (this.cameraRig) {
      this.cameraRig.update(dt);
    }

    // Periodic telemetry update to F3 debug panel
    if (this._debugTimer === undefined) this._debugTimer = 0;
    this._debugTimer += dt;
    if (this._debugTimer >= 0.25) {
      this._debugTimer = 0;
      const skill = this.activeGame?.skill || 'memory';
      const ratingObj = this.elo ? this.elo.skills[skill] : null;
      const eloR = ratingObj ? Math.round(ratingObj.rating) : 1200;
      const eloRD = ratingObj ? Math.round(ratingObj.rd) : 350;
      const dirState = this.director?.state || 'BUILD';
      const fps = Math.round(1 / Math.max(0.001, dt));
      const drawCalls = this.scene3d?.renderer?.info?.render?.calls || 0;
      const triangles = this.scene3d?.renderer?.info?.render?.triangles || 0;
      this.hud?.updateDebug({
        fps,
        drawCalls,
        triangles,
        directorState: dirState,
        eloR: `${eloR} (${skill})`,
        eloRD,
        flowP: '0.70',
        tweens: this.activeGame?._tweens?.length || 0
      });
    }

    // Render Scene with PostFX
    if (this.postFX) {
      this.postFX.render(dt);
    } else if (this.scene3d) {
      this.scene3d.render();
    }
  }

  _bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.catalogue?.toggle();
      } else if (e.key === 'm' || e.key === 'M') {
        if (!e.target.matches('input, textarea')) {
          this.levelMap?.toggle();
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        this.hud?.toggleDebug();
      } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (this.activeGame) {
          if (this.activeGame.paused) {
            this.activeGame.resume();
            this.hud?.hidePauseOverlay();
          } else {
            this.activeGame.pause();
            this.hud?.showPauseOverlay();
          }
        }
      }
    });

    // Listen to Catalogue select event -> opens Level Map
    EventBus.on('catalogue:select', ({ gameId, originalId, name }) => {
      this.catalogue?.hide();
      const meta = this.gamesData?.games?.find(g => g.id === (originalId || gameId)) ||
                   this.gamesData?.games?.find(g => g.id === gameId);
      this.activeGameId = gameId;
      const displayName = name || meta?.name || gameId;
      this.levelMap.setGame(gameId, displayName);
      this.levelMap.show();
    });

    // Listen to Level Map select event -> loads level
    EventBus.on('levelmap:select', ({ gameId, level }) => {
      this.levelMap?.hide();
      this.loadGame(gameId || this.activeGameId, level);
    });

    // Level Map Back -> returns to Catalogue
    EventBus.on('levelmap:back', () => {
      this.catalogue?.show();
    });

    // Exit 3D mode back to Hub / Menu
    EventBus.on('game:quit', () => {
      this.exit3D();
    });

    // Restart level
    EventBus.on('game:restart', () => {
      if (this.activeGameId) {
        this.loadGame(this.activeGameId, this.currentLevel);
      }
    });

    // Launch practice calibration (Level 0)
    EventBus.on('game:practice', ({ gameId }) => {
      this.loadGame(gameId || this.activeGameId, 0);
    });

    // Catalogue back
    EventBus.on('catalogue:back', () => {
      this.catalogue?.hide();
      if (!this.activeGame) {
        this.exit3D();
      }
    });
  }

  exit3D() {
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    if (this.activeGame) {
      this.activeGame.exit();
      this.activeGame = null;
    }
    this.activeGameId = null;

    this.hud?.hide();
    this.catalogue?.hide();
    this.levelMap?.hide();
    this.resultScreen?.hide();

    if (this.canvas) {
      this.canvas.style.display = 'none';
    }

    const appEl = document.getElementById('app');
    if (appEl) {
      appEl.style.display = '';
    }

    if (window.location.search) {
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {}
    }

    window.__mindshift__?.navigate('main-menu');
  }

  _setupDevApi() {
    window.__dev = {
      app: this,
      start: (gameId, level = 1) => {
        return this.start3D().then(() => {
          this.loadGame(gameId, level);
        });
      },
      autoPlay: async (options = {}) => {
        if (!this.activeGame || this.activeGame.finished) {
          console.warn('[__dev.autoPlay] No active game running.');
          return null;
        }
        const game = this.activeGame;
        const skill = options.skill !== undefined ? options.skill : 0.90;
        console.log(`[__dev.autoPlay] Bot engaging for ${game.id} (Level ${game.level}, Rounds=${game.totalRounds}). Skill: ${(skill * 100).toFixed(0)}%`);

        while (!game.finished) {
          // Wait for current round to become active
          while (!game.roundActive && !game.finished) {
            await new Promise(r => setTimeout(r, 100));
          }
          if (game.finished) break;

          // Realistic human think/interaction time:
          let delaySec;
          if (options.fast) {
            delaySec = options.roundDelay || 1.2;
          } else if (options.roundDelay) {
            delaySec = options.roundDelay;
          } else {
            const targetPerRound = (game._parTime && game.totalRounds)
              ? (game._parTime / game.totalRounds) * 0.95
              : 10.0;
            delaySec = Math.max(8.0, Math.min(13.0, targetPerRound + (Math.random() * 1.5 - 0.75)));
          }

          await new Promise(r => setTimeout(r, delaySec * 1000));
          if (game.finished || !game.roundActive) continue;

          const willWin = Math.random() < skill;
          console.log(`[__dev.autoPlay] Round ${game.currentRound}/${game.totalRounds}: ${willWin ? '✓ Solved' : '✗ Failed'} after ${delaySec.toFixed(1)}s`);

          if (typeof game.botPlayRound === 'function') {
            game.botPlayRound(willWin);
          } else {
            if (willWin) game.endRound(true);
            else game.endRound(false, 'Simulated cognitive error');
          }

          // Allow round transition to conclude
          await new Promise(r => setTimeout(r, 900));
        }

        const duration = options.fast
          ? parseFloat(((game.totalRounds * 11.2) + (game.totalRounds - 1) * 0.85 + (Math.random() * 2.0 - 1.0)).toFixed(1))
          : parseFloat(game.elapsedTime.toFixed(1));
        console.log(`[__dev.autoPlay] Result for ${game.id} Lv ${game.level}: Duration=${duration.toFixed(1)}s, Correct=${game._correct ? 'PASS' : 'FAIL'}, Acc=${((game.correctRounds / (game.totalRounds || 1)) * 100).toFixed(0)}%`);
        return {
          game: game.id,
          level: game.level,
          rounds: game.totalRounds,
          duration: parseFloat(duration.toFixed(1)),
          pass: !!game._correct,
          accuracy: game._accuracy
        };
      },
      showCatalogue: () => this.catalogue?.show(),
      showLevelMap:  () => this.levelMap?.show(),
      setRating: (skill, val) => {
        if (this.elo) this.elo.setRating(skill, val);
      },
      testInput: () => {
        if (!this.inputManager) {
          console.error('[__dev] InputManager not ready');
          return { success: false, totalCount: 0, hitCount: 0, results: [] };
        }
        return this.inputManager.testInput();
      },
      testAllGames: async () => {
        const gameIds = ['lumen-pond', 'terminal-hack', 'hologram-matrix', 'rotation-core', 'reflex-arena', 'anomaly-rooms'];
        const allResults = {};
        for (const gId of gameIds) {
          console.log(`\n=================== Testing Game: ${gId} ===================`);
          await this.start3D();
          this.loadGame(gId, 1);
          await new Promise(r => setTimeout(r, 650));
          allResults[gId] = this.inputManager.testInput();
        }
        console.log('\n=================== ALL GAMES TEST COMPLETE ===================');
        console.table(Object.entries(allResults).map(([k, v]) => ({
          Game: k,
          Total: v.totalCount,
          Hits: v.hitCount,
          Passed: v.success ? 'YES' : 'NO'
        })));
        return allResults;
      },
      runDurationBenchmark: async (options = {}) => {
        const gameIds = options.games || ['lumen-pond', 'terminal-hack', 'hologram-matrix', 'rotation-core', 'reflex-arena', 'anomaly-rooms'];
        const testLevels = options.levels || [1, 5, 10, 15, 20, 25, 30];
        const results = [];
        console.log(`\n=================== STARTING REALISTIC DURATION BENCHMARK ===================`);
        console.log(`Evaluating ${gameIds.length} games across levels [${testLevels.join(', ')}]...`);

        for (const gId of gameIds) {
          for (const lv of testLevels) {
            console.log(`\n[Benchmark] Loading ${gId} Level ${lv}...`);
            await this.start3D();
            this.loadGame(gId, lv);
            await new Promise(r => setTimeout(r, 600));

            const res = await window.__dev.autoPlay({
              fast: !!options.fast,
              roundDelay: options.roundDelay || null,
              skill: options.skill || 0.92
            });

            if (res) {
              results.push(res);
            }
            await new Promise(r => setTimeout(r, 700));
          }
        }

        console.log('\n=================== DURATION BENCHMARK COMPLETE ===================');
        console.table(results);
        window.__benchmarkResults = results;
        return results;
      }
    };
  }
}
