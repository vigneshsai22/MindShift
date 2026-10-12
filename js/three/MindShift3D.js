/* ═══════════════════════════════════════════════════════════════
   MindShift 3D — MindShift3D.js
   3D Entry point: start() launches the 3D lab facility; dispose() tears it down.
   Integrates Scene3D, PostFX, PlayerController, JuiceFX, ParticlePool,
   AdaptiveMusic, ARIA, SpatialAudio, and EventBus.
   ═══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { EventBus }           from '../core/EventBus.js';
import { CONFIG }             from '../core/Config.js';
import { Scene3D }            from './Scene3D.js';
import { FacilityBuilder }    from './FacilityBuilder.js';
import { PlayerController }   from './PlayerController.js';
import { ARIA }               from './ARIA.js';
import { SpatialAudio }       from './SpatialAudio.js';
import { AdaptiveMusic }      from './AdaptiveMusic.js';
import { PostFX }             from './PostFX.js';
import { VideoScreens }       from './VideoScreens.js';
import { BrainMap }           from './BrainMap.js';
import { UIOverlay3D }        from './UIOverlay3D.js';
import { JuiceFX }            from './fx/JuiceFX.js';
import { ParticlePool }       from './fx/ParticlePool.js';

import { MemoryVault }        from './labs/MemoryVault.js';
import { LogicLab }           from './labs/LogicLab.js';
import { PatternGallery }     from './labs/PatternGallery.js';
import { ObservationChamber } from './labs/ObservationChamber.js';
import { ReactionArena }      from './labs/ReactionArena.js';
import { SpatialLab }         from './labs/SpatialLab.js';

import { AdaptiveEngine }     from '../engine/AdaptiveEngine.js';
import { SessionManager }     from '../engine/SessionManager.js';

export const DIFF_THEMES = {
  1: { ambient: 0x001133, fog: 0x000a1a, fogDensity: 0.018, accent: 0x0077ff, label: 'Calm' },
  2: { ambient: 0x002233, fog: 0x001020, fogDensity: 0.022, accent: 0x00cccc, label: 'Focused' },
  3: { ambient: 0x1a0033, fog: 0x0d0020, fogDensity: 0.026, accent: 0xaa00ff, label: 'Intense' },
  4: { ambient: 0x331100, fog: 0x200800, fogDensity: 0.032, accent: 0xff6600, label: 'Critical' },
  5: { ambient: 0x330000, fog: 0x1a0000, fogDensity: 0.040, accent: 0xff2200, label: 'Expert' },
};

const LAB_DEFS = [
  { id: 'memory',      label: 'Memory Vault',        angle: 0,                Cls: MemoryVault },
  { id: 'logic',       label: 'Logic Lab',           angle: Math.PI / 3,      Cls: LogicLab },
  { id: 'pattern',     label: 'Pattern Gallery',     angle: 2 * Math.PI / 3,  Cls: PatternGallery },
  { id: 'observation', label: 'Observation Chamber', angle: Math.PI,          Cls: ObservationChamber },
  { id: 'reaction',    label: 'Reaction Arena',      angle: 4 * Math.PI / 3,  Cls: ReactionArena },
  { id: 'spatial',     label: 'Spatial Lab',         angle: 5 * Math.PI / 3,  Cls: SpatialLab },
];

export class MindShift3D {
  constructor({ canvas, profile, onExit }) {
    this.canvas     = canvas;
    this.profile    = profile;
    this.onExit     = onExit;
    this.adaptive   = new AdaptiveEngine();
    this.session    = new SessionManager();
    this._running   = false;
    this._labs      = {};
    this._activeLab = null;
    this._disposed  = false;
    this._clock     = new THREE.Clock();
    this._rafId     = null;
    this._unsubs    = [];
  }

  async start(startDifficulty = 3) {
    if (this._running) return;
    if (!this._checkWebGL()) return;
    this._running = true;
    this.adaptive.setDifficulty(startDifficulty);
    this.session.start(startDifficulty);

    // 1. Scene3D & Post-Processing
    this.scene3d = new Scene3D(this.canvas);
    await this.scene3d.init();

    this.postFX = new PostFX(this.scene3d);
    this.postFX.init();

    // 2. Juice & Particle Pools
    this.juice = new JuiceFX(this.scene3d.camera, this.postFX);
    this.particles = new ParticlePool(this.scene3d.scene);

    // 3. Facility Geometry
    this.facility = new FacilityBuilder(this.scene3d, LAB_DEFS);
    this.facility.build();

    // 4. Locomotion & Interaction
    this.player = new PlayerController(this.canvas, this.scene3d.camera, this.facility);
    this.player.init();

    // 5. Procedural Audio & Music
    this.spatialAudio = new SpatialAudio(this.scene3d.camera);
    await this.spatialAudio.init();

    this.music = new AdaptiveMusic(this.spatialAudio);
    this.music.start();

    // 6. AI Avatar ARIA
    this.aria = new ARIA(this.scene3d.scene, this.spatialAudio, this.scene3d.camera);
    this.aria.init();

    // 7. Video Screens & Terminals
    this.videoScreens = new VideoScreens(this.scene3d.scene);
    this.videoScreens.init();

    // 8. HUD & UI Overlay
    this.ui = new UIOverlay3D({
      adaptive: this.adaptive,
      session:  this.session,
      onHint:   () => this._useHint(),
      onExit:   () => this._endSession(),
    });
    this.ui.init();

    // 9. Instantiate Labs
    for (const def of LAB_DEFS) {
      this._labs[def.id] = new def.Cls({
        scene3d:      this.scene3d,
        adaptive:     this.adaptive,
        session:      this.session,
        spatialAudio: this.spatialAudio,
        aria:         this.aria,
        ui:           this.ui,
        videoScreens: this.videoScreens,
        onComplete:   (metrics) => this._onLabComplete(def.id, metrics),
      });
    }

    // 10. Bind EventBus controls
    this._bindGlobalEvents();

    await this._introSequence();
    this.facility.onDoorEnter = (labId) => this._enterLab(labId);
    this.facility.onDoorExit  = ()      => this._exitLab();

    this.aria.speak(
      "Welcome to the Mind Lab Research Facility, Subject 07. I am ARIA, your adaptive intelligence supervisor. " +
      "Approach any sector gateway to begin cognitive benchmarking.",
      'welcome'
    );

    window.__mindshift3d__ = this;
    this._applyTheme(startDifficulty);
    EventBus.emit('run:start', { profile: this.profile, difficulty: startDifficulty });
    this._renderLoop();
  }

  _bindGlobalEvents() {
    this._unsubs.push(
      EventBus.on('graphics:quality_change', (data) => {
        this.postFX?.setQuality(data.quality);
      }),
      EventBus.on('audio:volume_change', (data) => {
        this.spatialAudio?.setVolume(data.volume);
        if (this.music) this.music._volume = data.volume;
      }),
      EventBus.on('hud:abort', () => {
        this._endSession();
      }),
      EventBus.on('player:step', () => {
        // Step sound through procedural audio
        this.spatialAudio?.playFootstep?.();
      })
    );
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._running  = false;
    delete window.__mindshift3d__;
    cancelAnimationFrame(this._rafId);

    this._unsubs.forEach(u => u());
    this._unsubs = [];

    Object.values(this._labs).forEach(l => l.dispose?.());
    this.player?.dispose();
    this.aria?.dispose();
    this.music?.stop();
    this.spatialAudio?.dispose();
    this.juice?.dispose();
    this.particles?.dispose();
    this.postFX?.dispose();
    this.videoScreens?.dispose();
    this.ui?.dispose();
    this.scene3d?.dispose();
  }

  _checkWebGL() {
    try {
      const c = document.createElement('canvas');
      if (c.getContext('webgl2') || c.getContext('webgl')) return true;
    } catch {}
    const err = document.createElement('div');
    err.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;font-size:1.5rem;z-index:9999;text-align:center;padding:2rem';
    err.textContent = 'WebGL is not supported in this browser. Please use Chrome, Firefox, or Edge.';
    document.body.appendChild(err);
    return false;
  }

  async _introSequence() {
    const cam    = this.scene3d.camera;
    const target = new THREE.Vector3(0, 1.7, 0);
    const start  = new THREE.Vector3(0, 20, 2);
    cam.position.copy(start);
    cam.lookAt(0, 0, 0);
    const duration = 2800;
    const t0 = performance.now();
    let skipped = false;
    const skip = () => { skipped = true; };
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('pointerdown', skip, { once: true });

    await new Promise(resolve => {
      const tick = (now) => {
        if (skipped || now - t0 >= duration) {
          window.removeEventListener('keydown', skip);
          cam.position.copy(target);
          return resolve();
        }
        const e = 1 - Math.pow(1 - (now - t0) / duration, 3);
        cam.position.lerpVectors(start, target, e);
        cam.lookAt(0, 0, 0);
        this.postFX.render(0);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    this.player.enable();
  }

  _enterLab(labId) {
    if (this._activeLab) return;
    const lab = this._labs[labId];
    if (!lab) return;
    this._activeLab = labId;
    this._savedCamPos = this.scene3d.camera.position.clone();
    this._savedCamRot = this.scene3d.camera.quaternion.clone();
    this.player.disable();

    if (labId === 'memory') {
      this.scene3d.camera.position.set(0, 3.8, -10.5);
      this.scene3d.camera.lookAt(0, 0.1, -15);
    } else if (labId === 'logic') {
      this.scene3d.camera.position.set(0, 1.8, -13);
      this.scene3d.camera.lookAt(0, 2.2, -20);
    } else if (labId === 'pattern') {
      this.scene3d.camera.position.set(0, 2.5, -12);
      this.scene3d.camera.lookAt(0, 2.8, -23);
    } else if (labId === 'observation') {
      this.scene3d.camera.position.set(0, 2.5, -11);
      this.scene3d.camera.lookAt(0, 2.5, -20);
    } else if (labId === 'reaction') {
      this.scene3d.camera.position.set(0, 1.7, -15);
      this.scene3d.camera.lookAt(0, 2, -23);
    } else if (labId === 'spatial') {
      this.scene3d.camera.position.set(0, 2.8, -11.5);
      this.scene3d.camera.lookAt(0, 3, -21);
    }

    lab.enter(this.adaptive.getDifficulty());
    const label = LAB_DEFS.find(d => d.id === labId)?.label ?? labId;
    this.ui.showLabName(label);
  }

  _exitLab() {
    if (!this._activeLab) return;
    this._labs[this._activeLab]?.exit?.();
    this._activeLab = null;
    if (this._savedCamPos) {
      this.scene3d.camera.position.copy(this._savedCamPos);
      this.scene3d.camera.quaternion.copy(this._savedCamRot);
    }
    this.player.enable();
    this.ui.hideLabName();
  }

  _onLabComplete(labId, metrics) {
    this.session.record(metrics);
    this.adaptive.update(metrics);
    const newDiff = this.adaptive.getDifficulty();
    this._applyTheme(newDiff);
    this.music.setDifficulty(newDiff, this.session._currentStreak ?? 0);
    this.ui.flashResult(metrics.correct);

    // Juice impact
    if (metrics.correct) {
      this.juice?.onCorrectAnswer();
      this.particles?.spawnBurst(this.scene3d.camera.position.clone().add(new THREE.Vector3(0, 0, -2)), 0x00ffcc, 40);
    } else {
      this.juice?.onError();
    }

    this.aria.speak(this.adaptive.getAdaptiveMessage(metrics.correct), metrics.correct ? 'praise' : 'encourage');
    setTimeout(() => this._exitLab(), 2200);

    const count = this.session._challenges?.length ?? 0;
    if (count >= 10) setTimeout(() => this._endSession(), 3500);
  }

  _useHint() {
    if (!this._activeLab) return;
    this._labs[this._activeLab]?.giveHint?.();
    this.aria.speak("Analytical cue provided. Hint penalty applied to final score.", 'hint');
  }

  _endSession() {
    this._running = false;
    cancelAnimationFrame(this._rafId);
    const summary = {
      totalScore:       this.session._totalScore,
      overallAccuracy:  this.session._challenges?.length
                        ? Math.round(this.session._challenges.filter(c => c.correct).length
                          / this.session._challenges.length * 100) : 0,
      bestStreak:       this.session._bestStreak,
      avgResponseTime:  this.session._challenges?.length
                        ? (this.session._challenges.reduce((s, c) => s + c.responseTime, 0)
                          / this.session._challenges.length).toFixed(2) : 0,
      challenges:       this.session._challenges ?? [],
    };
    const catPerf = this.adaptive.categoryPerformance();

    EventBus.emit('run:end', { summary, catPerf });

    this.scene3d.fadeOut(() => {
      this.brainMap = new BrainMap({
        scene3d:   this.scene3d,
        summary,
        catPerf,
        profile:   this.profile,
        adaptive:  this.adaptive,
        onRestart: () => {
          this.brainMap?.dispose();
          this.onExit();
        },
      });
      this.brainMap.init();
      this._running = true;
      this._renderLoop();
    });
  }

  _applyTheme(diff) {
    const theme = DIFF_THEMES[diff] ?? DIFF_THEMES[3];
    const { scene, ambientLight, accentLight } = this.scene3d;
    scene.fog.color.setHex(theme.fog);
    scene.fog.density = theme.fogDensity;
    scene.background.setHex(theme.fog);
    ambientLight.color.setHex(theme.ambient);

    const from = accentLight.color.clone();
    const to   = new THREE.Color(theme.accent);
    let p = 0;
    const anim = () => {
      p = Math.min(1, p + 0.03);
      accentLight.color.lerpColors(from, to, p);
      if (p < 1) requestAnimationFrame(anim);
    };
    anim();

    this.facility.setDoorGlow(theme.accent);
    this.postFX.setBloomStrength(0.4 + diff * 0.12);
    this.ui.setDifficultyTheme(diff, theme.label);
  }

  _renderLoop() {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(() => this._renderLoop());
    const delta = this._clock.getDelta();

    // 1. Systems update
    this.player?.update(delta);
    if (!this._activeLab && this.scene3d?.camera) {
      this.facility?.checkDoorProximity(this.scene3d.camera.position);
    }
    this.facility?.update(delta);
    this.spatialAudio?.updateListener();
    this.aria?.update(delta);
    this.music?.update(delta);
    if (this._activeLab) this._labs[this._activeLab]?.update?.(delta);
    this.brainMap?.update?.(delta);
    this.videoScreens?.update?.(delta);

    // 2. Juice & Particles
    this.juice?.update(delta);
    this.particles?.update(delta);

    // 3. Post-processing render
    this.postFX.render(delta);

    // 4. Telemetry push for F3 Debug Overlay
    EventBus.emit('telemetry:update', {
      fps: this.scene3d.fps,
      drawCalls: this.scene3d.drawCalls,
      flowP: 0.70,
      eloR: 1200 + this.adaptive.getDifficulty() * 95,
      eloRD: Math.max(100, 350 - (this.session._challenges?.length || 0) * 20),
      trialD: 1000 + this.adaptive.getDifficulty() * 120
    });
  }
}
