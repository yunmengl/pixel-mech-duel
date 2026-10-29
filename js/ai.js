// ============================================================
//  PIXEL MECH DUEL · lightweight CPU opponent
// ============================================================
(() => {
  const P = (window.PMD = window.PMD || {});

  class AIController {
    constructor() {
      this.left = false;
      this.right = false;
      this.guard = false;
      this.attackPressed = false;
      this.jumpPressed = false;
      this.thinkTimer = 0;
      this.guardTimer = 0;
      this.reactedTo = -1;
    }

    down(action) {
      if (action === 'guard') return this.guard;
      if (action === 'left') return this.left;
      if (action === 'right') return this.right;
      return false;
    }

    pressed(action) {
      if (action === 'attack' && this.attackPressed) {
        this.attackPressed = false;
        return true;
      }
      if (action === 'jump' && this.jumpPressed) {
        this.jumpPressed = false;
        return true;
      }
      return false;
    }

    update(dt, me, foe, game) {
      this.thinkTimer -= dt;
      this.guardTimer -= dt;

      if (this.guardTimer > 0) {
        this.guard = true;
        this.left = false;
        this.right = false;
        return;
      }
      this.guard = false;

      if (me.state === 'ko' || me.state === 'win' || game.phase !== 'fight') {
        this.left = false;
        this.right = false;
        return;
      }

      const dx = foe.x - me.x;
      const dist = Math.abs(dx);
      const toward = dx > 0 ? 1 : -1;
      const incoming = foe.state === 'attack' && foe.attackT < foe.attackSpec.startup + 0.06;

      // reactive block, once per swing
      if (
        incoming &&
        dist < 112 &&
        me.onGround &&
        me.guardEnergy > 20 &&
        this.reactedTo !== foe.attackSerial &&
        Math.random() < 0.58
      ) {
        this.reactedTo = foe.attackSerial;
        this.guardTimer = 0.34;
        this.guard = true;
        this.left = false;
        this.right = false;
        return;
      }

      if (this.thinkTimer > 0) return;
      this.thinkTimer = 0.16 + Math.random() * 0.14;

      this.left = false;
      this.right = false;

      if (me.state === 'hit') return;

      // keep a comfortable brawling distance
      if (dist > 84) {
        if (toward > 0) this.right = true;
        else this.left = true;
      } else if (dist < 48 && Math.random() < 0.55) {
        if (toward > 0) this.left = true;
        else this.right = true;
      }

      // commit to an attack
      if (dist < 90 && dist > 30 && me.attackCooldown <= 0 && Math.random() < 0.7) {
        this.attackPressed = true;
      }

      // occasional repositioning hop
      if (me.onGround && dist > 120 && Math.random() < 0.13) {
        this.jumpPressed = true;
      }
    }
  }

  P.AIController = AIController;
})();
