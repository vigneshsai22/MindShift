/* ═══════════════════════════════════════════════
   MindShift — SplashScreen
   Animated intro with particle canvas
   ═══════════════════════════════════════════════ */
export class SplashScreen {
  constructor(engine) {
    this.engine   = engine;
    this.el       = document.getElementById('splash-screen');
    this.canvas   = document.getElementById('splash-canvas');
    this.bar      = document.getElementById('splash-loader-bar');
    this.text     = document.getElementById('splash-loader-text');
    this._animId  = null;
    this._particles = [];
  }

  show() {
    this.el.classList.add('active');
    this._resizeCanvas();
    this._initParticles();
    this._startAnim();
    this._runLoader();
  }

  hide() {
    this._stopAnim();
    this.el.classList.remove('active');
    this.el.classList.add('exiting');
    setTimeout(() => this.el.classList.remove('exiting'), 400);
  }

  // ── Loader ────────────────────────────────────
  _runLoader() {
    const steps = [
      [10,  'Loading assets…'],
      [35,  'Building challenge pool…'],
      [60,  'Warming up adaptive engine…'],
      [80,  'Setting up audio…'],
      [100, 'Ready!']
    ];
    let i = 0;
    const tick = () => {
      if (i >= steps.length) {
        setTimeout(() => {
          this.hide();
          this.engine.navigate('main-menu');
        }, 400);
        return;
      }
      const [pct, label] = steps[i++];
      if (this.bar)  this.bar.style.width  = pct + '%';
      if (this.text) this.text.textContent  = label;
      setTimeout(tick, 320 + Math.random() * 200);
    };
    setTimeout(tick, 500);
  }

  // ── Particle Canvas ───────────────────────────
  _resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _initParticles() {
    if (!this.canvas) return;
    const W = this.canvas.width, H = this.canvas.height;
    this._particles = Array.from({ length: 120 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      vx:    (Math.random() - 0.5) * 0.5,
      vy:    -Math.random() * 0.8 - 0.2,
      r:     Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.5 ? '#7c3aed' : '#06b6d4'
    }));
  }

  _startAnim() {
    const ctx = this.canvas?.getContext('2d');
    if (!ctx) return;
    const W = this.canvas.width, H = this.canvas.height;
    const loop = () => {
      ctx.fillStyle = 'rgba(6,6,15,0.15)';
      ctx.fillRect(0, 0, W, H);
      this._particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -5)  { p.y = H + 5; p.x = Math.random() * W; }
        if (p.x < 0 || p.x > W) p.vx *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2,'0');
        ctx.fill();
      });
      this._animId = requestAnimationFrame(loop);
    };
    this._animId = requestAnimationFrame(loop);
  }

  _stopAnim() {
    if (this._animId) { cancelAnimationFrame(this._animId); this._animId = null; }
  }
}
