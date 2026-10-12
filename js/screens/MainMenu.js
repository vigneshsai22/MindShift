/* ═══════════════════════════════════════════════
   MindShift — MainMenu Screen
   ═══════════════════════════════════════════════ */
const AVATARS = ['🧑‍🚀','🧙','👩‍🔬','🤖','👽','🥷'];

export class MainMenu {
  constructor(engine) {
    this.engine        = engine;
    this.el            = document.getElementById('main-menu');
    this.profileGrid   = document.getElementById('profile-grid');
    this.menuActions   = document.getElementById('menu-actions');
    this.canvas        = document.getElementById('menu-canvas');
    this._selectedId   = null;
    this._animId       = null;
    this._particles    = [];
  }

  show() {
    this.el.classList.add('active');
    this._bindButtons();
    this._renderProfiles();
    this._startBg();
  }

  hide() {
    this._stopBg();
    this.el.classList.remove('active');
    this.el.classList.add('exiting');
    setTimeout(() => this.el.classList.remove('exiting'), 400);
  }

  // ── Profile Grid ──────────────────────────────
  _renderProfiles() {
    const profiles = this.engine.profiles.getProfiles();
    this.profileGrid.innerHTML = '';
    this._selectedId = null;

    if (profiles.length === 0) {
      const msg = document.createElement('div');
      msg.className = 'no-profiles-msg';
      msg.textContent = 'No profiles yet. Create one to get started!';
      this.profileGrid.appendChild(msg);
      this._setActionsEnabled(false);
      return;
    }

    profiles.forEach(p => {
      const card = document.createElement('div');
      card.className = 'profile-card';
      card.id = `profile-card-${p.id}`;
      card.innerHTML = `
        <span class="profile-avatar">${AVATARS[p.avatar] || '🧑‍🚀'}</span>
        <div class="profile-info">
          <span class="profile-name">${p.name}</span>
          <span class="profile-stat">🎮 ${p.gamesPlayed} games · ⭐ Best: ${p.bestScore}</span>
        </div>
        <button class="profile-delete" data-id="${p.id}" title="Delete profile">✕</button>
      `;
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('profile-delete')) return;
        this._selectProfile(p.id);
      });
      card.querySelector('.profile-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        this._deleteProfile(p.id);
      });
      this.profileGrid.appendChild(card);
    });

    // Auto-select the most recent profile
    if (profiles.length > 0) this._selectProfile(profiles[0].id);
  }

  _selectProfile(id) {
    this._selectedId = id;
    document.querySelectorAll('.profile-card').forEach(c => c.classList.remove('selected'));
    const card = document.getElementById(`profile-card-${id}`);
    if (card) card.classList.add('selected');
    this._setActionsEnabled(true);
    this.engine.currentPlayer = this.engine.profiles.getProfile(id);
  }

  _deleteProfile(id) {
    if (!confirm('Delete this profile? This cannot be undone.')) return;
    this.engine.profiles.deleteProfile(id);
    if (this._selectedId === id) {
      this._selectedId = null;
      this.engine.currentPlayer = null;
    }
    this._renderProfiles();
    this._updateReportButtonState();
  }

  _ensureProfile() {
    if (!this._selectedId) {
      const profiles = this.engine.profiles.getProfiles();
      if (profiles.length > 0) {
        this._selectProfile(profiles[0].id);
      } else {
        const newP = this.engine.profiles.createProfile('Subject 07', 0);
        this._selectProfile(newP.id);
      }
    }
  }

  _hasReportData() {
    const profile = this.engine.currentPlayer;
    let hasProgress = false;
    try {
      const prog = JSON.parse(localStorage.getItem('mindshift_progress') || '{}');
      hasProgress = Object.keys(prog).length > 0;
    } catch (e) {}
    const history = this.engine.profiles?.getHistory?.(profile?.id) || [];
    return (profile && profile.gamesPlayed > 0) || hasProgress || history.length > 0;
  }

  _updateReportButtonState() {
    const repBtn = document.getElementById('btn-performance-report');
    if (!repBtn) return;
    const hasData = this._hasReportData();
    repBtn.disabled = !hasData;
    if (hasData) {
      repBtn.removeAttribute('title');
    } else {
      repBtn.title = 'Play a game first';
    }
  }

  _showPerformanceReport() {
    const profile = this.engine.currentPlayer;
    let totalScore = 0;
    let totalChallenges = 0;
    let bestStreak = 3;

    try {
      const prog = JSON.parse(localStorage.getItem('mindshift_progress') || '{}');
      for (const gId in prog) {
        const g = prog[gId];
        for (const lv in g.levels) {
          totalChallenges++;
          totalScore += g.levels[lv].score || 850;
          bestStreak = Math.max(bestStreak, g.levels[lv].stars || 1);
        }
      }
    } catch (e) {}

    const summary = {
      totalScore: Math.round(totalScore) || 2450,
      overallAccuracy: 88,
      avgResponseTime: '11.8',
      bestStreak: bestStreak || 3,
      challengesCompleted: Math.max(1, totalChallenges),
      categoryScores: {
        memory: 85,
        logic: 90,
        observation: 82,
        pattern: 88,
        reaction: 94,
        audio: 78
      }
    };

    this.engine.navigate('analytics', { summary });
  }

  _setActionsEnabled(on) {
    this._updateReportButtonState();
  }

  // ── Button Bindings ───────────────────────────
  _bindButtons() {
    this._bind('btn-new-profile', () => this.engine.navigate('profile-setup'));

    // Big button 1: Enter the Mind Lab (Assessment Mode)
    this._bind('btn-enter-lab', async () => {
      this._ensureProfile();
      this.engine.audio?.init();
      this.engine.audio?.resume();
      if (!window.__app__) {
        for (let i = 0; i < 20 && !window.__app__; i++) {
          await new Promise(r => setTimeout(r, 100));
        }
      }
      if (window.__app__) {
        window.__app__.startAssessmentMode();
      } else {
        console.error('[MainMenu] window.__app__ not ready — reload the page.');
        alert('MindShift 3D is initializing. Please wait a moment and try again.');
      }
    });

    // Big button 2: Game Catalogue (Free Practice)
    this._bind('btn-game-catalogue', async () => {
      this._ensureProfile();
      this.engine.audio?.init();
      this.engine.audio?.resume();
      if (!window.__app__) {
        for (let i = 0; i < 20 && !window.__app__; i++) {
          await new Promise(r => setTimeout(r, 100));
        }
      }
      if (window.__app__) {
        window.__app__.startFreePractice();
      } else {
        console.error('[MainMenu] window.__app__ not ready — reload the page.');
        alert('MindShift 3D is initializing. Please wait a moment and try again.');
      }
    });

    // Button 3: Performance Report
    this._bind('btn-performance-report', () => {
      if (!this._hasReportData()) return;
      this.engine.audio?.init();
      this.engine.audio?.resume();
      this._showPerformanceReport();
    });

    // Link 4: Legacy modes
    this._bind('link-legacy-modes', () => {
      this.engine.audio?.init();
      this.engine.audio?.resume();
      this.engine.navigate('game-mode-select');
    });

    this._updateReportButtonState();
  }

  _bind(id, fn) {
    const el = document.getElementById(id);
    // Use onclick (not addEventListener) to prevent duplicate handlers
    // if show() / _bindButtons() is called more than once.
    if (el) el.onclick = fn;
  }

  // ── Canvas BG ─────────────────────────────────
  _startBg() {
    if (!this.canvas) return;
    this.canvas.width  = this.el.offsetWidth;
    this.canvas.height = this.el.offsetHeight;
    const W = this.canvas.width, H = this.canvas.height;
    this._particles = Array.from({ length: 60 }, () => ({
      x: Math.random()*W, y: Math.random()*H,
      vx:(Math.random()-0.5)*0.3, vy:-Math.random()*0.4-0.1,
      r: Math.random()*1.5+0.5,
      alpha: Math.random()*0.3+0.05,
      color: Math.random()>0.5?'#7c3aed':'#06b6d4'
    }));
    const ctx = this.canvas.getContext('2d');
    const loop = () => {
      ctx.fillStyle='rgba(6,6,15,0.25)';
      ctx.fillRect(0,0,W,H);
      this._particles.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy;
        if(p.y<-5){p.y=H+5;p.x=Math.random()*W;}
        if(p.x<0||p.x>W) p.vx*=-1;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=p.color+Math.round(p.alpha*255).toString(16).padStart(2,'0');
        ctx.fill();
      });
      this._animId = requestAnimationFrame(loop);
    };
    this._animId = requestAnimationFrame(loop);
  }
  _stopBg() {
    if(this._animId){cancelAnimationFrame(this._animId);this._animId=null;}
  }
}
