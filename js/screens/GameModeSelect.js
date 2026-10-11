/* ═══════════════════════════════════════════════
   MindShift — GameModeSelect Screen
   3 animated mode cards: Classic / IQ / Mixed
   ═══════════════════════════════════════════════ */
export class GameModeSelect {
  constructor(engine) {
    this.engine    = engine;
    this.el        = document.getElementById('game-mode-select');
    this._canvas   = document.getElementById('mode-canvas');
    this._animId   = null;
    this._particles = [];
  }

  show() {
    this.el.classList.add('active');
    this._startBg();
    this._bind();
  }

  hide() {
    this._stopBg();
    this.el.classList.remove('active');
    this.el.classList.add('exiting');
    setTimeout(() => this.el.classList.remove('exiting'), 400);
  }

  _bind() {
    const back = document.getElementById('mode-back');
    if (back) back.onclick = () => this.engine.navigate('main-menu');

    document.querySelectorAll('.mode-card').forEach(card => {
      card.onclick = () => {
        const mode = card.dataset.mode;
        this.engine.currentMode = mode;
        this.engine.audio?.playClick();
        if (mode === '3d') {
          this.engine.start3DMode();
        } else {
          this.engine.navigate('difficulty-select');
        }
      };
    });
  }

  // ── Particle canvas background ────────────────
  _startBg() {
    if (!this._canvas) return;
    this._canvas.width  = this.el.offsetWidth  || window.innerWidth;
    this._canvas.height = this.el.offsetHeight || window.innerHeight;
    const W = this._canvas.width, H = this._canvas.height;
    const colors = ['#7c3aed', '#06b6d4', '#f59e0b'];
    this._particles = Array.from({ length: 70 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      vx:    (Math.random() - 0.5) * 0.45,
      vy:    -Math.random() * 0.55 - 0.1,
      r:     Math.random() * 1.8 + 0.4,
      alpha: Math.random() * 0.35 + 0.05,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    const ctx = this._canvas.getContext('2d');
    const loop = () => {
      ctx.fillStyle = 'rgba(6,6,15,0.22)';
      ctx.fillRect(0, 0, W, H);
      this._particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
        if (p.x < 0 || p.x > W) p.vx *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });
      this._animId = requestAnimationFrame(loop);
    };
    this._animId = requestAnimationFrame(loop);
  }

  _stopBg() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
  }
}
