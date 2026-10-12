/* ═══════════════════════════════════════════════════════════════
   Director.js — AI Pacing Director Finite State Machine
   States:
   - BUILD: Standard tension buildup, baseline challenge pacing
   - PEAK: High-flow state (streak >= 3 or boss trial), elevated audiovisual intensity
   - RELIEF: Post-boss or post-climax decompression, calm ambient breathing room
   - RECOVER: Frustration/failure streak response, lowered tension & ARIA support
   ═══════════════════════════════════════════════════════════════ */

import { CONFIG } from '../core/Config.js';
import { EventBus } from '../core/EventBus.js';

export const DIRECTOR_STATES = {
  BUILD:   'BUILD',
  PEAK:    'PEAK',
  RELIEF:  'RELIEF',
  RECOVER: 'RECOVER'
};

export class Director {
  constructor() {
    this.state = DIRECTOR_STATES.BUILD;
    this.history = [];
    this.consecutiveWins = 0;
    this.consecutiveLosses = 0;
    this.trialsInCurrentState = 0;

    // Frustration telemetry counters
    this.rapidMisclicks = 0;
    this.lastClickTime = 0;
    this.idleTime = 0;

    // World modulation tokens
    this.worldModulation = {
      lightIntensity: 1.0,
      fogDensityMult: 1.0,
      musicIntensity: 2,   // 1=calm, 2=focused, 3=intense, 4=critical
      ariaTone: 'neutral'
    };
  }

  reset() {
    this.state = DIRECTOR_STATES.BUILD;
    this.history = [];
    this.consecutiveWins = 0;
    this.consecutiveLosses = 0;
    this.trialsInCurrentState = 0;
    this.rapidMisclicks = 0;
    this._applyState(this.state);
  }

  /**
   * Evaluates trial outcome and transitions the FSM
   */
  evaluateTrial({ correct, responseTime, parTime = 15.0, isBoss = false }) {
    this.history.push({ correct, responseTime, isBoss, timestamp: Date.now() });
    this.trialsInCurrentState++;

    if (correct) {
      this.consecutiveWins++;
      this.consecutiveLosses = 0;
    } else {
      this.consecutiveLosses++;
      this.consecutiveWins = 0;
    }

    // Determine state transition
    let nextState = this.state;
    const frustrationStreak = CONFIG.ADAPTIVE?.DIRECTOR?.FRUSTRATION_STREAK ?? CONFIG.DIRECTOR?.RECOVER_FAIL_STREAK ?? 2;
    const peakStreak = CONFIG.ADAPTIVE?.DIRECTOR?.PEAK_STREAK ?? CONFIG.DIRECTOR?.PEAK_STREAK_THRESHOLD ?? 3;

    // 1. RECOVER trigger: 2+ consecutive failures or high frustration
    if (this.consecutiveLosses >= frustrationStreak || this.rapidMisclicks >= 4) {
      nextState = DIRECTOR_STATES.RECOVER;
      this.rapidMisclicks = 0;
    }
    // 2. RELIEF trigger: After a successful boss trial or after 2 trials in PEAK
    else if ((isBoss && correct) || (this.state === DIRECTOR_STATES.PEAK && this.trialsInCurrentState >= 2)) {
      nextState = DIRECTOR_STATES.RELIEF;
    }
    // 3. PEAK trigger: 3+ consecutive wins or entering boss fight
    else if (isBoss || this.consecutiveWins >= peakStreak) {
      nextState = DIRECTOR_STATES.PEAK;
    }
    // 4. Return to BUILD: After 1 trial in RELIEF or recovering from RECOVER
    else if (this.state === DIRECTOR_STATES.RELIEF || (this.state === DIRECTOR_STATES.RECOVER && correct)) {
      nextState = DIRECTOR_STATES.BUILD;
    }

    if (nextState !== this.state) {
      this.transitionTo(nextState);
    } else {
      this._dispatchModulation();
    }

    return this.state;
  }

  /**
   * Tracks user interaction cadence to detect frustration
   */
  registerClick(validTarget = true) {
    const now = performance.now();
    const interval = now - this.lastClickTime;
    this.lastClickTime = now;

    if (!validTarget && interval < 350) {
      this.rapidMisclicks++;
      if (this.rapidMisclicks >= 4 && this.state !== DIRECTOR_STATES.RECOVER) {
        this.transitionTo(DIRECTOR_STATES.RECOVER);
      }
    } else if (validTarget) {
      this.rapidMisclicks = Math.max(0, this.rapidMisclicks - 1);
    }
  }

  transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    this.trialsInCurrentState = 0;
    this._applyState(newState);

    EventBus.emit('director:state', {
      state: newState,
      previousState: oldState,
      consecutiveWins: this.consecutiveWins,
      consecutiveLosses: this.consecutiveLosses
    });
  }

  _applyState(state) {
    switch (state) {
      case DIRECTOR_STATES.BUILD:
        this.worldModulation = {
          lightIntensity: 1.0,
          fogDensityMult: 1.0,
          musicIntensity: 2,
          ariaTone: 'analytical',
          difficultyOffset: 0
        };
        break;

      case DIRECTOR_STATES.PEAK:
        this.worldModulation = {
          lightIntensity: 1.35,
          fogDensityMult: 1.25,
          musicIntensity: 4,
          ariaTone: 'urgent',
          difficultyOffset: 60 // slightly push player limit
        };
        break;

      case DIRECTOR_STATES.RELIEF:
        this.worldModulation = {
          lightIntensity: 0.85,
          fogDensityMult: 0.8,
          musicIntensity: 1,
          ariaTone: 'praise',
          difficultyOffset: -75 // breather trial
        };
        break;

      case DIRECTOR_STATES.RECOVER:
        this.worldModulation = {
          lightIntensity: 0.9,
          fogDensityMult: 0.9,
          musicIntensity: 1,
          ariaTone: 'supportive',
          difficultyOffset: -120 // ease up to restore confidence
        };
        break;
    }

    this._dispatchModulation();
  }

  _dispatchModulation() {
    EventBus.emit('director:modulate', this.worldModulation);
  }

  getDifficultyModifier() {
    return this.worldModulation.difficultyOffset || 0;
  }
}
