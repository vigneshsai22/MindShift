/* ═══════════════════════════════════════════════
   MindShift — DifficultySelect Screen
   ═══════════════════════════════════════════════ */
export class DifficultySelect {
  constructor(engine) {
    this.engine   = engine;
    this.el       = document.getElementById('difficulty-select');
    this._selected = 3; // default: medium
  }

  show() {
    this.el.classList.add('active');
    this._bind();
    this._selectCard(this._selected);
  }

  hide() {
    this.el.classList.remove('active');
    this.el.classList.add('exiting');
    setTimeout(() => this.el.classList.remove('exiting'), 400);
  }

  _bind() {
    document.querySelectorAll('.diff-card').forEach(card => {
      card.onclick = () => {
        const d = parseInt(card.dataset.diff, 10);
        this._selectCard(d);
        this.engine.audio?.playClick();
      };
    });

    const back  = document.getElementById('btn-diff-back');
    const start = document.getElementById('btn-start-game');
    if (back)  back.onclick  = () => this.engine.navigate('game-mode-select');
    if (start) start.onclick = () => {
      this.engine.audio?.playLevelUp();
      if (this.engine.currentMode === '3d') {
        this.engine.start3DMode(this._selected);
      } else {
        this.engine.navigate('game', { difficulty: this._selected });
      }
    };
  }

  _selectCard(d) {
    this._selected = d;
    document.querySelectorAll('.diff-card').forEach(c => {
      c.classList.toggle('selected', parseInt(c.dataset.diff) === d);
    });
  }
}
