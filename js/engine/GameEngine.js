/* ═══════════════════════════════════════════════
   MindShift — GameEngine
   Central state machine + screen router
   ═══════════════════════════════════════════════ */
import { AudioEngine }        from './AudioEngine.js';
import { ProfileManager }     from './ProfileManager.js';
import { SessionManager }     from './SessionManager.js';
import { AdaptiveEngine }     from './AdaptiveEngine.js';
import { HUDOverlay }         from '../ui/HUDOverlay.js';

import { SplashScreen }       from '../screens/SplashScreen.js';
import { MainMenu }           from '../screens/MainMenu.js';
import { ProfileSetup }       from '../screens/ProfileSetup.js';
import { DifficultySelect }   from '../screens/DifficultySelect.js';
import { GameModeSelect }     from '../screens/GameModeSelect.js';
import { GameScreen }         from '../screens/GameScreen.js';
import { ResultsScreen }      from '../screens/ResultsScreen.js';
import { AnalyticsDashboard } from '../screens/AnalyticsDashboard.js';
import { AchievementsScreen, HistoryScreen } from '../screens/AchievementsScreen.js';
import { getAchievement }     from '../data/achievements.js';

// Classic challenge classes
import { LogicalReasoning }   from '../challenges/LogicalReasoning.js';
import { PatternRecognition } from '../challenges/PatternRecognition.js';
import { MemoryChallenge }    from '../challenges/MemoryChallenge.js';
import { VisualObservation }  from '../challenges/VisualObservation.js';
import { ReactionTime }       from '../challenges/ReactionTime.js';
import { AudioChallenge }     from '../challenges/AudioChallenge.js';

// IQ challenge classes
import { NumberSequence }       from '../challenges/iq/NumberSequence.js';
import { VisualPatternPuzzle }  from '../challenges/iq/VisualPatternPuzzle.js';
import { MatrixPuzzle }         from '../challenges/iq/MatrixPuzzle.js';
import { OddOneOut }            from '../challenges/iq/OddOneOut.js';
import { SpatialReasoning }     from '../challenges/iq/SpatialReasoning.js';
import { LogicPuzzle }          from '../challenges/iq/LogicPuzzle.js';
import { MemoryReasoning }      from '../challenges/iq/MemoryReasoning.js';

/** Map challenge category → constructor */
export const CHALLENGE_CLASSES = {
  logical:      LogicalReasoning,
  pattern:      PatternRecognition,
  memory:       MemoryChallenge,
  visual:       VisualObservation,
  reaction:     ReactionTime,
  audio:        AudioChallenge,
  'iq-number':  NumberSequence,
  'iq-pattern': VisualPatternPuzzle,
  'iq-matrix':  MatrixPuzzle,
  'iq-odd':     OddOneOut,
  'iq-spatial': SpatialReasoning,
  'iq-logic':   LogicPuzzle,
  'iq-memory':  MemoryReasoning,
};

export class GameEngine {
  constructor() {
    // Subsystems
    this.audio    = new AudioEngine();
    this.profiles = new ProfileManager();
    this.session  = new SessionManager();
    this.adaptive = new AdaptiveEngine();
    this.hud      = new HUDOverlay();

    // State
    this.currentPlayer  = null;
    this.currentScreen  = null;
    this.sessionMeta    = {};
    this.currentMode    = 'classic'; // 'classic' | 'iq' | 'mixed'

    // Canvas (shared for challenge rendering)
    this.canvas = document.getElementById('game-canvas');
    this.ctx    = this.canvas?.getContext('2d') || null;

    // Screens map
    this.screens = {};
  }

  init() {
    this.screens.splash              = new SplashScreen(this);
    this.screens.menu                = new MainMenu(this);
    this.screens['main-menu']        = this.screens.menu;
    this.screens.profile             = new ProfileSetup(this);
    this.screens['profile-setup']    = this.screens.profile;
    this.screens['game-mode-select'] = new GameModeSelect(this);
    this.screens.difficulty          = new DifficultySelect(this);
    this.screens['difficulty-select']= this.screens.difficulty;
    this.screens.game                = new GameScreen(this);
    this.screens['game-screen']      = this.screens.game;
    this.screens.results             = new ResultsScreen(this);
    this.screens['results-screen']   = this.screens.results;
    this.screens.analytics           = new AnalyticsDashboard(this);
    this.screens['analytics-dashboard'] = this.screens.analytics;
    this.screens.achievements        = new AchievementsScreen(this);
    this.screens['achievements-screen'] = this.screens.achievements;
    this.screens.history             = new HistoryScreen(this);
    this.screens['history-screen']   = this.screens.history;

    window.addEventListener('resize', () => this._onResize());
    this.navigate('splash');
  }

  navigate(name, data = {}) {
    if (this.currentScreen && typeof this.currentScreen.hide === 'function') {
      this.currentScreen.hide();
    }
    const screen = this.screens[name];
    if (!screen) { console.error(`GameEngine: unknown screen "${name}"`); return; }
    this.currentScreen = screen;
    setTimeout(() => { if (typeof screen.show === 'function') screen.show(data); }, 80);
  }

  showAchievement(id) {
    const ach = getAchievement(id);
    if (!ach) return;
    const popup  = document.getElementById('achievement-popup');
    const iconEl = document.getElementById('ach-popup-icon');
    const nameEl = document.getElementById('ach-popup-name');
    if (!popup) return;
    if (iconEl) iconEl.textContent = ach.icon;
    if (nameEl) nameEl.textContent = ach.name;
    popup.classList.add('show');
    this.audio?.playLevelUp();
    setTimeout(() => popup.classList.remove('show'), 3200);
  }

  async start3DMode(startDifficulty = 3) {
    if (this.currentScreen && typeof this.currentScreen.hide === 'function') {
      this.currentScreen.hide();
    }
    const appEl = document.getElementById('app');
    const threeCanvas = document.getElementById('three-canvas');
    if (appEl) appEl.style.display = 'none';
    if (threeCanvas) threeCanvas.style.display = 'block';

    try {
      const { MindShift3D } = await import('../three/MindShift3D.js');
      this.threeMode = new MindShift3D({
        canvas: threeCanvas,
        profile: this.currentPlayer,
        onExit: () => {
          this.threeMode?.dispose();
          this.threeMode = null;
          if (threeCanvas) threeCanvas.style.display = 'none';
          if (appEl) appEl.style.display = '';
          this.navigate('menu');
        }
      });
      await this.threeMode.start(startDifficulty);
    } catch (err) {
      console.error('Failed to start 3D mode:', err);
      if (threeCanvas) threeCanvas.style.display = 'none';
      if (appEl) appEl.style.display = '';
      this.navigate('menu');
    }
  }

  _onResize() {
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper || !this.canvas) return;
    this.canvas.width  = wrapper.clientWidth;
    this.canvas.height = wrapper.clientHeight;
  }
}
