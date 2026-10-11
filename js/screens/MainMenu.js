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
  }

  _setActionsEnabled(on) {
    ['btn-play','btn-history','btn-achievements','btn-3d-lab'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = !on;
    });
  }

  // ── Button Bindings ───────────────────────────
  _bindButtons() {
    this._bind('btn-new-profile',  () => this.engine.navigate('profile-setup'));
    this._bind('btn-play',         () => {
      if (!this._selectedId) return;
      this.engine.audio.init();
      this.engine.audio.resume();
      this.engine.navigate('game-mode-select'); // → mode select → difficulty → game
    });
    this._bind('btn-3d-lab',       () => {
      if (!this._selectedId) {
        const profiles = this.engine.profiles.getProfiles();
        if (profiles.length > 0) {
          this._selectProfile(profiles[0].id);
        } else {
          const newP = this.engine.profiles.createProfile('Player 1', 0);
          this._selectProfile(newP.id);
        }
      }
      this.engine.audio.init();
      this.engine.audio.resume();
      this.engine.start3DMode();
    });
    this._bind('btn-history',      () => this.engine.navigate('history'));
    this._bind('btn-achievements', () => this.engine.navigate('achievements'));
  }

  _bind(id, fn) {
    const el = document.getElementById(id);
    if (el) { el.onclick = null; el.addEventListener('click', fn); }
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
