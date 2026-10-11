/* ═══════════════════════════════════════════════
   MindShift — ProfileSetup Screen
   ═══════════════════════════════════════════════ */
const AVATARS = ['🧑‍🚀','🧙','👩‍🔬','🤖','👽','🥷'];

export class ProfileSetup {
  constructor(engine) {
    this.engine         = engine;
    this.el             = document.getElementById('profile-setup');
    this._selectedAvatar = 0;
  }

  show() {
    this.el.classList.add('active');
    this._reset();
    this._bindButtons();
    this._bindAvatars();
  }

  hide() {
    this.el.classList.remove('active');
    this.el.classList.add('exiting');
    setTimeout(() => this.el.classList.remove('exiting'), 400);
  }

  _reset() {
    const input = document.getElementById('player-name-input');
    if (input) input.value = '';
    const hint = document.getElementById('name-hint');
    if (hint) hint.textContent = '';
    this._selectedAvatar = 0;
    document.querySelectorAll('.avatar-btn').forEach((btn, i) => {
      btn.classList.toggle('selected', i === 0);
    });
  }

  _bindAvatars() {
    document.querySelectorAll('.avatar-btn').forEach((btn) => {
      btn.onclick = () => {
        this._selectedAvatar = parseInt(btn.dataset.avatar, 10);
        document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.engine.audio?.playClick();
      };
    });
  }

  _bindButtons() {
    const back = document.getElementById('profile-back');
    if (back) back.onclick = () => this.engine.navigate('main-menu');

    const create = document.getElementById('btn-create-profile');
    if (create) {
      create.onclick = () => this._createProfile();
    }

    const input = document.getElementById('player-name-input');
    if (input) {
      input.onkeydown = (e) => { if (e.key === 'Enter') this._createProfile(); };
    }
  }

  _createProfile() {
    const input = document.getElementById('player-name-input');
    const hint  = document.getElementById('name-hint');
    const name  = input?.value?.trim() || '';

    if (!name) {
      if (hint) hint.textContent = 'Please enter a name!';
      input?.focus();
      return;
    }
    if (name.length < 2) {
      if (hint) hint.textContent = 'Name must be at least 2 characters.';
      input?.focus();
      return;
    }
    if (hint) hint.textContent = '';

    const profile = this.engine.profiles.createProfile(name, this._selectedAvatar);
    this.engine.currentPlayer = profile;
    this.engine.audio?.playCorrect();
    this.engine.navigate('difficulty-select');
  }
}
