// ============================================================
//  PIXEL MECH DUEL · keyboard input + shared audio instance
// ============================================================
(() => {
  const P = (window.PMD = window.PMD || {});

  P.audio = new P.SoundFX();

  class InputState {
    constructor() {
      this.held = new Set();
      this.pressed = new Set();
      this.bind();
    }

    bind() {
      window.addEventListener('keydown', (e) => {
        if (P.PREVENT_KEYS.has(e.code)) e.preventDefault();
        P.audio.unlock();
        if (!e.repeat) this.pressed.add(e.code);
        this.held.add(e.code);
      });

      window.addEventListener('keyup', (e) => {
        this.held.delete(e.code);
        if (P.PREVENT_KEYS.has(e.code)) e.preventDefault();
      });

      window.addEventListener('blur', () => {
        this.held.clear();
        this.pressed.clear();
        if (P.game && typeof P.game.autoPause === 'function') P.game.autoPause();
      });
    }

    down(codes) {
      for (const code of codes) if (this.held.has(code)) return true;
      return false;
    }

    pressedAny(codes) {
      for (const code of codes) if (this.pressed.has(code)) return true;
      return false;
    }

    endFrame() {
      this.pressed.clear();
    }
  }

  P.Input = new InputState();
})();
