// ============================================================
//  PIXEL MECH DUEL · game state, HUD, menu + boot
// ============================================================
(() => {
  const P = (window.PMD = window.PMD || {});
  const {
    W, H, MAX_HP, MAX_GUARD, ROUND_TIME,
    clamp, sign, r: R, drawText, pad2,
  } = P;

  class Game {
    constructor(ctx) {
      this.ctx = ctx;
      this.audio = P.audio;
      this.background = new P.ArenaBackground();
      this.particles = new P.Particles();
      this.floaters = [];

      this.time = 0;
      this.phase = 'menu';
      this.paused = false;
      this.mode = 'cpu';
      this.menuIndex = 0;
      this.round = 1;
      this.score = [0, 0];
      this.matchWinner = 0;
      this.roundResult = null;
      this.roundTime = ROUND_TIME;
      this.lastClockSecond = ROUND_TIME;
      this.phaseTimer = 0;
      this.countdownStep = 4;
      this.fightFlash = 0;
      this.hitStop = 0;
      this.shake = 0;
      this.flash = 0;
      this.audioToast = 0;
      this.audioToastText = '';
      this.overHover = '';

      this.menuButtons = [
        { x: 216, y: 158, w: 208, h: 38, mode: 'cpu' },
        { x: 216, y: 204, w: 208, h: 38, mode: 'pvp' },
      ];
      this.overButtons = [
        { x: 196, y: 196, w: 112, h: 32, action: 'rematch', label: 'REMATCH' },
        { x: 332, y: 196, w: 112, h: 32, action: 'menu', label: 'MENU' },
      ];

      this.p1 = new P.Mech(this, 1, 136, 1, new P.HumanController(P.P1_MAP), false);
      this.p2 = new P.Mech(this, 2, 504, -1, new P.AIController(), true);
    }

    // ------------------------------------------------------------
    //  flow
    // ------------------------------------------------------------
    startMatch(mode) {
      this.mode = mode;
      this.score = [0, 0];
      this.round = 1;
      this.matchWinner = 0;
      this.roundResult = null;
      this.p2.isAI = mode === 'cpu';
      this.p2.controller = mode === 'cpu'
        ? new P.AIController()
        : new P.HumanController(P.P2_MAP);
      this.audio.select();
      this.startRound();
    }

    startRound() {
      this.p1.reset(200, 1);
      this.p2.reset(440, -1);
      if (this.p2.isAI) this.p2.controller = new P.AIController();

      this.phase = 'countdown';
      this.paused = false;
      this.phaseTimer = 2.35;
      this.countdownStep = 4;
      this.roundTime = ROUND_TIME;
      this.lastClockSecond = ROUND_TIME;
      this.roundResult = null;
      this.fightFlash = 0;
      this.hitStop = 0;
      this.shake = 0;
      this.flash = 0;
      this.particles.items = [];
      this.particles.rings = [];
      this.floaters = [];
      this.audio.countBeep();
    }

    goMenu() {
      this.phase = 'menu';
      this.paused = false;
      this.round = 1;
      this.score = [0, 0];
      this.matchWinner = 0;
      this.roundResult = null;
      this.p1.reset(136, 1);
      this.p2.reset(504, -1);
      this.particles.items = [];
      this.particles.rings = [];
      this.floaters = [];
      this.shake = 0;
      this.flash = 0;
      this.hitStop = 0;
    }

    autoPause() {
      if (!this.paused && ['countdown', 'fight', 'roundover'].includes(this.phase)) {
        this.paused = true;
        this.audio.pause();
      }
    }

    togglePause() {
      if (!['countdown', 'fight', 'roundover'].includes(this.phase)) return;
      this.paused = !this.paused;
      this.audio.pause();
    }

    // ------------------------------------------------------------
    //  update
    // ------------------------------------------------------------
    update(dt) {
      if (P.Input.pressedAny(['KeyM'])) {
        const enabled = this.audio.toggle();
        this.audioToast = 1.4;
        this.audioToastText = enabled ? 'SOUND ON' : 'SOUND OFF';
      }
      this.audioToast = Math.max(0, this.audioToast - dt);

      if (this.paused) {
        if (P.Input.pressedAny(['Escape', 'KeyP'])) this.togglePause();
        return;
      }

      if (
        this.phase !== 'menu' &&
        this.phase !== 'matchover' &&
        P.Input.pressedAny(['Escape', 'KeyP'])
      ) {
        this.togglePause();
        return;
      }

      this.time += dt;
      this.background.update(dt, this.time);
      this.particles.update(dt);
      this.shake = Math.max(0, this.shake - 30 * dt);
      this.flash = Math.max(0, this.flash - 2.3 * dt);
      this.fightFlash = Math.max(0, this.fightFlash - dt);
      this.updateFloaters(dt);

      if (this.hitStop > 0) {
        this.hitStop -= dt;
        return;
      }

      if (this.phase === 'menu') {
        this.updateMenu(dt);
      } else if (this.phase === 'countdown') {
        this.updateCountdown(dt);
      } else if (this.phase === 'fight') {
        this.updateFight(dt);
      } else if (this.phase === 'roundover') {
        this.updateRoundOver(dt);
      } else if (this.phase === 'matchover') {
        this.updateMatchOver(dt);
      }
    }

    updateMenu(dt) {
      if (P.Input.pressedAny(['ArrowUp', 'KeyW'])) {
        this.menuIndex = (this.menuIndex + this.menuButtons.length - 1) % this.menuButtons.length;
        this.audio.menuMove();
      }
      if (P.Input.pressedAny(['ArrowDown', 'KeyS'])) {
        this.menuIndex = (this.menuIndex + 1) % this.menuButtons.length;
        this.audio.menuMove();
      }

      if (P.Input.pressedAny(['Digit1'])) {
        this.startMatch('cpu');
        return;
      }
      if (P.Input.pressedAny(['Digit2'])) {
        this.startMatch('pvp');
        return;
      }
      if (P.Input.pressedAny(['Enter', 'NumpadEnter', 'Space'])) {
        this.startMatch(this.menuButtons[this.menuIndex].mode);
        return;
      }

      this.p1.update(dt, this.p2, this);
      this.p2.update(dt, this.p1, this);
    }

    updateCountdown(dt) {
      this.p1.update(dt, this.p2, this);
      this.p2.update(dt, this.p1, this);
      this.phaseTimer -= dt;

      const step = Math.max(0, Math.ceil(this.phaseTimer / 0.75));
      if (step > 0 && step !== this.countdownStep) {
        this.countdownStep = step;
        this.audio.countBeep(step === 1);
      }

      if (this.phaseTimer <= 0) {
        this.phase = 'fight';
        this.roundTime = ROUND_TIME;
        this.lastClockSecond = ROUND_TIME;
        this.fightFlash = 0.6;
        this.audio.fight();
      }
    }

    updateFight(dt) {
      if (this.p2.isAI) {
        this.p2.controller.update(dt, this.p2, this.p1, this);
      }

      this.p1.update(dt, this.p2, this);
      this.p2.update(dt, this.p1, this);
      this.resolveAttack(this.p1, this.p2);
      this.resolveAttack(this.p2, this.p1);
      if (this.phase !== 'fight') return;

      this.separateBodies();

      this.roundTime = Math.max(0, this.roundTime - dt);
      const sec = Math.ceil(this.roundTime);
      if (sec !== this.lastClockSecond) {
        this.lastClockSecond = sec;
        if (sec <= 5 && sec > 0) this.audio.countBeep(sec === 1);
      }

      if (this.roundTime <= 0) {
        this.finishTimeOut();
      }
    }

    updateRoundOver(dt) {
      this.p1.update(dt, this.p2, this);
      this.p2.update(dt, this.p1, this);
      this.phaseTimer -= dt;

      if (this.phaseTimer > 0) return;

      if (this.matchWinner) {
        this.phase = 'matchover';
        this.audio.select();
      } else if (this.roundResult && this.roundResult.winner === 0) {
        this.startRound();
      } else {
        this.round += 1;
        this.startRound();
      }
    }

    updateMatchOver(dt) {
      this.p1.update(dt, this.p2, this);
      this.p2.update(dt, this.p1, this);

      if (P.Input.pressedAny(['KeyR', 'Enter', 'NumpadEnter'])) {
        this.startMatch(this.mode);
      } else if (P.Input.pressedAny(['Escape'])) {
        this.goMenu();
      }
    }

    // ------------------------------------------------------------
    //  combat
    // ------------------------------------------------------------
    resolveAttack(attacker, defender) {
      if (this.phase !== 'fight') return;
      if (!attacker.isAttackActive()) return;
      if (defender.state === 'ko') return;

      const attackBox = attacker.getAttackBox();
      const hurtBox = defender.getHurtBox();
      if (!P.aabb(attackBox, hurtBox)) return;

      attacker.attackHasHit = true;
      const dir = attacker.facing;
      const contactX = defender.x + defender.facing * 18;
      const contactY = defender.y - 66;
      const blocking =
        defender.state === 'guard' &&
        defender.facing === -dir &&
        defender.guardEnergy > 0;

      if (blocking) {
        defender.receiveBlock(2, dir, this);
        attacker.vx = -dir * 34;
        this.audio.hit(true);
        this.particles.spark(contactX, contactY, -dir, ['#8ff4ff', '#d8ffff', '#ffd45e'], 12, 0.7);
        this.particles.ring(contactX, contactY, defender.palette.primary, 1);
        this.addFloater('BLOCK', contactX, contactY - 26, '#9ff7ff', 1, 0.55);
        this.hitStop = Math.max(this.hitStop, 0.035);
        this.shake = Math.max(this.shake, 3);
        return;
      }

      const killed = defender.receiveHit(attacker.attackSpec.damage, dir, this);
      this.audio.hit(false);
      this.particles.spark(
        contactX,
        contactY,
        dir,
        ['#ffffff', '#ffd45e', attacker.palette.light, attacker.palette.primary],
        18,
        1.15
      );
      this.particles.ring(contactX, contactY, '#ffd45e', 1);
      this.addFloater('-13', defender.x, defender.y - 108, '#ffffff', 2, 0.72);
      this.shake = Math.max(this.shake, killed ? 15 : 5);
      this.flash = Math.max(this.flash, killed ? 0.55 : 0.025);
      this.hitStop = Math.max(this.hitStop, killed ? 0.12 : 0.055);
    }

    separateBodies() {
      const minDist = 54;
      const dx = this.p2.x - this.p1.x;
      const dist = Math.abs(dx);
      if (dist >= minDist) return;
      const dir = dx === 0 ? 1 : sign(dx);
      const push = (minDist - dist) / 2;
      this.p1.x = clamp(this.p1.x - dir * push, P.ARENA_LEFT, P.ARENA_RIGHT);
      this.p2.x = clamp(this.p2.x + dir * push, P.ARENA_LEFT, P.ARENA_RIGHT);
    }

    finishTimeOut() {
      this.audio.timeout();
      if (this.p1.health === this.p2.health) {
        this.finishRound(0, 'draw');
      } else {
        this.finishRound(this.p1.health > this.p2.health ? 1 : 2, 'time');
      }
    }

    finishRound(winner, reason) {
      if (this.phase !== 'fight') return;
      this.phase = 'roundover';
      this.phaseTimer = reason === 'ko' ? 3.1 : reason === 'draw' ? 2.8 : 2.6;
      this.roundResult = { winner, reason };

      if (winner) {
        this.score[winner - 1] += 1;
        if (this.score[winner - 1] >= 2) this.matchWinner = winner;
        const champ = winner === 1 ? this.p1 : this.p2;
        if (champ.state !== 'ko') {
          champ.state = 'win';
          champ.winTimer = 0;
        }
      }
    }

    onKnockout(loser) {
      const winner = loser === this.p1 ? 2 : 1;
      this.audio.ko();
      this.particles.explosion(loser.x, loser.y - 58, [
        loser.palette.light,
        loser.palette.primary,
        loser.palette.accent,
        '#ffffff',
        '#ff7a42',
      ]);
      this.shake = 16;
      this.flash = 0.6;
      this.finishRound(winner, 'ko');
    }

    // ------------------------------------------------------------
    //  floating labels
    // ------------------------------------------------------------
    addFloater(text, x, y, color, scale = 1, life = 0.8) {
      this.floaters.push({
        text,
        x,
        y,
        color,
        scale,
        life,
        maxLife: life,
        drift: P.rand(-8, 8),
      });
    }

    updateFloaters(dt) {
      for (let i = this.floaters.length - 1; i >= 0; i--) {
        const f = this.floaters[i];
        f.life -= dt;
        f.y -= 34 * dt;
        f.x += f.drift * dt;
        if (f.life <= 0) this.floaters.splice(i, 1);
      }
    }

    drawFloaters(g) {
      for (const f of this.floaters) {
        const a = clamp(f.life / f.maxLife, 0, 1);
        g.globalAlpha = Math.min(1, a * 1.8);
        drawText(g, f.text, f.x, f.y, f.scale, f.color, 'center', '#02040a');
      }
      g.globalAlpha = 1;
    }

    // ------------------------------------------------------------
    //  pointer
    // ------------------------------------------------------------
    pointerMove(x, y) {
      if (this.phase === 'menu') {
        for (let i = 0; i < this.menuButtons.length; i++) {
          const b = this.menuButtons[i];
          if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
            this.menuIndex = i;
          }
        }
      } else if (this.phase === 'matchover') {
        this.overHover = '';
        for (const b of this.overButtons) {
          if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
            this.overHover = b.action;
          }
        }
      }
    }

    pointerDown(x, y) {
      this.audio.unlock();
      if (this.paused) {
        this.togglePause();
        return;
      }
      if (this.phase === 'menu') {
        for (let i = 0; i < this.menuButtons.length; i++) {
          const b = this.menuButtons[i];
          if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
            this.menuIndex = i;
            this.startMatch(b.mode);
            return;
          }
        }
        return;
      }
      if (this.phase === 'matchover') {
        for (const b of this.overButtons) {
          if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
            if (b.action === 'rematch') this.startMatch(this.mode);
            else this.goMenu();
            return;
          }
        }
      }
    }

    // ------------------------------------------------------------
    //  render
    // ------------------------------------------------------------
    render() {
      const g = this.ctx;
      g.imageSmoothingEnabled = false;
      R(g, 0, 0, W, H, '#04060d');

      g.save();
      if (this.shake > 0.2) {
        g.translate(
          Math.round(P.rand(-this.shake, this.shake) * 0.7),
          Math.round(P.rand(-this.shake, this.shake) * 0.5)
        );
      }

      this.background.render(g, this.time);
      this.p1.render(g, this.time);
      this.p2.render(g, this.time);
      this.particles.render(g);
      this.drawFloaters(g);
      g.restore();

      if (this.flash > 0.01) {
        g.globalAlpha = Math.min(0.72, this.flash);
        R(g, 0, 0, W, H, '#ffffff');
        g.globalAlpha = 1;
      }

      if (this.phase === 'menu') {
        this.drawMenu(g);
      } else {
        this.drawHUD(g);
        if (this.phase === 'countdown') this.drawCountdown(g);
        if (this.phase === 'fight' && this.fightFlash > 0) this.drawFight(g);
        if (this.phase === 'roundover') this.drawRoundOver(g);
        if (this.phase === 'matchover') this.drawMatchOver(g);
      }

      if (this.paused) this.drawPause(g);
      this.drawToast(g);
    }

    drawHUD(g) {
      R(g, 0, 0, W, 48, 'rgba(3,6,13,0.62)');
      R(g, 0, 47, W, 1, 'rgba(102,160,196,0.18)');

      const p1name = this.p1.name;
      const p2name = `${this.p2.name} [${this.mode === 'cpu' ? 'CPU' : 'P2'}]`;
      drawText(g, p1name, 18, 6, 1, this.p1.palette.light, 'left');
      drawText(g, p2name, W - 18, 6, 1, this.p2.palette.light, 'right');

      this.drawPips(g, 18, 14, this.score[0], this.p1.palette.primary, false);
      this.drawPips(g, W - 18, 14, this.score[1], this.p2.palette.primary, true);

      this.drawHealthBar(g, this.p1, false);
      this.drawHealthBar(g, this.p2, true);

      this.drawGuardBar(g, this.p1, false);
      this.drawGuardBar(g, this.p2, true);

      // timer box
      R(g, 293, 5, 54, 40, 'rgba(2,5,11,0.86)');
      R(g, 293, 5, 54, 1, '#314a63');
      R(g, 293, 44, 54, 1, '#172535');
      R(g, 294, 6, 2, 38, '#0a1320');
      R(g, 344, 6, 2, 38, '#0a1320');
      const lowTime = this.roundTime <= 10 && this.phase === 'fight';
      drawText(g, 'TIME', 320, 8, 1, '#6f8ca3', 'center');
      drawText(
        g,
        pad2(Math.ceil(this.roundTime)),
        320,
        17,
        2,
        lowTime && Math.sin(this.time * 12) > 0 ? '#ff6a42' : '#e7f8ff',
        'center'
      );
      drawText(g, `R${this.round}`, 320, 35, 1, '#6b849a', 'center');

      // round marker tabs
      R(g, 18, 43, 5, 2, this.p1.palette.primary);
      R(g, W - 23, 43, 5, 2, this.p2.palette.primary);
    }

    drawPips(g, anchorX, y, score, color, right) {
      for (let i = 0; i < 2; i++) {
        const px = right ? anchorX - 5 - i * 8 : anchorX + i * 8;
        R(g, px, y, 5, 4, '#050a11');
        R(g, px + 1, y + 1, 3, 2, score > i ? color : '#26384c');
      }
    }

    drawHealthBar(g, mech, right) {
      const barW = 246;
      const barH = 13;
      const y = 21;
      const x = right ? W - 18 - barW : 18;
      const innerW = barW - 4;
      const innerH = barH - 4;
      const ghost = clamp(mech.healthGhost / MAX_HP, 0, 1);
      const ratio = clamp(mech.health / MAX_HP, 0, 1);
      const low = mech.health <= 25;
      const fill = low && Math.sin(this.time * 12) > 0 ? '#ff6a42' : mech.palette.primary;

      R(g, x, y, barW, barH, '#02050a');
      R(g, x + 1, y + 1, barW - 2, barH - 2, '#0b1420');
      R(g, x + 2, y + 2, innerW, innerH, '#161018');

      if (right) {
        const ghostW = Math.round(innerW * ghost);
        R(g, x + 2 + innerW - ghostW, y + 2, ghostW, innerH, '#733038');
        const fillW = Math.round(innerW * ratio);
        R(g, x + 2 + innerW - fillW, y + 2, fillW, innerH, fill);
        R(g, x + 2 + innerW - fillW, y + 2, fillW, 2, mech.palette.light);
      } else {
        const ghostW = Math.round(innerW * ghost);
        R(g, x + 2, y + 2, ghostW, innerH, '#733038');
        const fillW = Math.round(innerW * ratio);
        R(g, x + 2, y + 2, fillW, innerH, fill);
        R(g, x + 2, y + 2, fillW, 2, mech.palette.light);
      }

      for (let i = 1; i < 10; i++) {
        const sx = x + 2 + Math.round(innerW * (i / 10));
        R(g, sx, y + 2, 1, innerH, 'rgba(2,5,10,0.4)');
      }

      const bracket = low ? '#ff6a42' : '#3c566f';
      R(g, x, y, 1, barH, bracket);
      R(g, x, y, barW, 1, bracket);
      R(g, x + barW - 1, y, 1, barH, bracket);
      R(g, x, y + barH - 1, barW, 1, bracket);
      R(g, x, y, 4, 2, mech.palette.accent);
      R(g, right ? x + barW - 4 : x, y, 4, 2, mech.palette.accent);
    }

    drawGuardBar(g, mech, right) {
      const w = 104;
      const y = 37;
      const x = right ? W - 18 - w : 18;
      const ratio = clamp(mech.guardEnergy / MAX_GUARD, 0, 1);
      const low = ratio <= 0.25;
      R(g, x, y, w, 4, '#02050a');
      R(g, x + 1, y + 1, w - 2, 2, '#1a2635');
      const fillW = Math.round((w - 2) * ratio);
      const color = low && Math.sin(this.time * 14) > 0 ? '#ff5a3c' : mech.palette.accent;
      if (right) R(g, x + w - 1 - fillW, y + 1, fillW, 2, color);
      else R(g, x + 1, y + 1, fillW, 2, color);
    }

    drawCountdown(g) {
      R(g, 184, 100, 272, 82, 'rgba(3,6,12,0.78)');
      R(g, 184, 100, 272, 1, '#35516a');
      R(g, 184, 181, 272, 1, '#101a28');
      R(g, 184, 100, 3, 82, '#263f58');
      R(g, 453, 100, 3, 82, '#263f58');

      drawText(g, `ROUND ${this.round}`, 320, 112, 3, '#e9fbff', 'center');
      drawText(g, 'AZURE-01  //  CRIMSON-02', 320, 143, 1, '#84a2b8', 'center');

      const active = Math.max(1, Math.min(3, Math.ceil(this.phaseTimer / 0.75)));
      for (let i = 0; i < 3; i++) {
        const on = i < active;
        R(g, 288 + i * 18, 160, 12, 4, '#07101a');
        R(g, 289 + i * 18, 161, 10, 2, on ? '#ffd45e' : '#2a3c4e');
      }
      drawText(g, 'COMBAT LINK', 320, 169, 1, '#617c92', 'center');
    }

    drawFight(g) {
      const a = clamp(this.fightFlash / 0.6, 0, 1);
      g.globalAlpha = Math.min(1, a * 1.6);
      drawText(g, 'FIGHT!', 320 - 2, 116, 4, '#ff365f', 'center', null);
      drawText(g, 'FIGHT!', 320 + 2, 116, 4, '#17eaff', 'center', null);
      drawText(g, 'FIGHT!', 320, 116, 4, '#fff7d2', 'center');
      drawText(g, 'ENGAGE', 320, 149, 1, '#ffd45e', 'center');
      g.globalAlpha = 1;
    }

    drawRoundOver(g) {
      if (!this.roundResult) return;
      const { winner, reason } = this.roundResult;
      const big = reason === 'ko' ? 'K.O.' : reason === 'time' ? 'TIME UP' : 'DRAW';
      const color = reason === 'ko' ? '#ff6a42' : '#ffd45e';

      R(g, 176, 94, 288, 102, 'rgba(3,6,12,0.8)');
      R(g, 176, 94, 288, 1, color);
      R(g, 176, 195, 288, 1, '#101a28');
      R(g, 176, 94, 3, 102, color);
      R(g, 461, 94, 3, 102, '#26384a');

      drawText(g, big, 320, 104, 4, color, 'center');
      const champ = winner === 1 ? this.p1 : winner === 2 ? this.p2 : null;
      const sub = champ ? `${champ.name} WINS ROUND` : 'ROUND WILL REPLAY';
      drawText(g, sub, 320, 143, 1, champ ? champ.palette.light : '#8aa4b8', 'center');
      drawText(g, `${this.score[0]}  -  ${this.score[1]}`, 320, 161, 2, '#e7f7ff', 'center');
      drawText(g, this.matchWinner ? 'MATCH COMPLETE' : 'NEXT ROUND IN A MOMENT', 320, 181, 1, '#637f94', 'center');
    }

    drawMatchOver(g) {
      R(g, 0, 0, W, H, 'rgba(2,5,11,0.78)');
      const champ = this.matchWinner === 1 ? this.p1 : this.p2;
      const color = champ.palette.primary;

      R(g, 146, 58, 348, 248, 'rgba(4,8,15,0.92)');
      R(g, 146, 58, 348, 1, color);
      R(g, 146, 305, 348, 1, '#1a2a3b');
      R(g, 146, 58, 3, 248, color);
      R(g, 491, 58, 3, 248, '#26384a');

      drawText(g, '// MATCH COMPLETE', 320, 72, 1, '#738fa5', 'center');
      drawText(g, champ.name, 320, 90, 3, color, 'center');
      drawText(g, 'WINS THE DUEL', 320, 122, 1, '#b9d1e2', 'center');

      R(g, 246, 138, 148, 1, '#233648');
      drawText(g, `${this.score[0]}  -  ${this.score[1]}`, 320, 146, 2, '#effaff', 'center');
      drawText(g, `BEST OF 3 // ROUND ${this.round}`, 320, 168, 1, '#607a90', 'center');

      for (const b of this.overButtons) {
        const hover = this.overHover === b.action;
        R(g, b.x, b.y, b.w, b.h, hover ? 'rgba(26,57,72,0.95)' : 'rgba(8,16,27,0.9)');
        R(g, b.x, b.y, b.w, 1, hover ? color : '#365069');
        R(g, b.x, b.y + b.h - 1, b.w, 1, '#152538');
        R(g, b.x, b.y, 1, b.h, hover ? color : '#1e3043');
        drawText(g, b.label, b.x + b.w / 2, b.y + 9, 2, hover ? '#ffffff' : '#9eb8cc', 'center');
      }

      drawText(g, 'R: REMATCH     ESC: MENU', 320, 244, 1, '#678196', 'center');
      drawText(g, 'PIXEL MECH DUEL // SECTOR 07', 320, 276, 1, '#3d566a', 'center');
    }

    drawMenu(g) {
      R(g, 0, 0, W, H, 'rgba(2,5,13,0.55)');
      R(g, 0, 0, W, 18, 'rgba(2,5,13,0.85)');
      R(g, 0, H - 18, W, 18, 'rgba(2,5,13,0.85)');

      drawText(g, 'PIXEL MECH COMBAT SYSTEM // MK.II', 320, 30, 1, '#6d8ba4', 'center');

      const jitter = Math.sin(this.time * 16) > 0.82 ? 2 : 0;
      g.globalAlpha = 0.55;
      drawText(g, 'MECH DUEL', 317 - jitter, 50, 4, '#ff315f', 'center', null);
      drawText(g, 'MECH DUEL', 323 + jitter, 50, 4, '#16e5ff', 'center', null);
      g.globalAlpha = 1;
      drawText(g, 'MECH DUEL', 320, 50, 4, '#ecfbff', 'center');

      drawText(g, 'NEON FOUNDRY // SECTOR 07', 320, 86, 1, '#ffbf8a', 'center');

      R(g, 178, 138, 80, 1, '#273f55');
      R(g, 382, 138, 80, 1, '#273f55');
      drawText(g, 'SELECT MODE', 320, 135, 1, '#85a2b8', 'center');

      for (let i = 0; i < this.menuButtons.length; i++) {
        const b = this.menuButtons[i];
        const selected = i === this.menuIndex;
        const pulse = selected ? 0.09 + Math.sin(this.time * 5) * 0.02 : 0;
        R(g, b.x, b.y, b.w, b.h, selected ? 'rgba(14,35,49,0.94)' : 'rgba(5,10,18,0.82)');
        if (selected) {
          g.globalAlpha = pulse;
          R(g, b.x, b.y, b.w, b.h, '#24d8ff');
          g.globalAlpha = 1;
        }
        R(g, b.x, b.y, b.w, 1, selected ? this.p1.palette.primary : '#2a4056');
        R(g, b.x, b.y + b.h - 1, b.w, 1, selected ? '#1a3c4f' : '#101a27');
        R(g, b.x, b.y, 1, b.h, selected ? '#2f6f85' : '#1b2b3d');
        R(g, b.x + b.w - 1, b.y, 1, b.h, selected ? '#2f6f85' : '#1b2b3d');

        if (selected) {
          R(g, b.x - 9, b.y, 4, b.h, '#24d8ff');
          R(g, b.x + b.w + 5, b.y, 4, b.h, '#ff5a3c');
        }

        const title = i === 0 ? 'VS CPU' : 'LOCAL 2P';
        const sub = i === 0 ? 'SINGLE PLAYER' : 'FRIEND VS FRIEND';
        drawText(g, title, 320, b.y + 7, 2, selected ? '#f2feff' : '#8ca7bc', 'center');
        drawText(g, sub, 320, b.y + 26, 1, selected ? '#ffd45e' : '#516b82', 'center');
      }

      const blink = Math.sin(this.time * 3.2) > -0.2;
      drawText(g, 'BEST OF 3  //  60 SEC ROUNDS', 320, 266, 1, '#6d889e', 'center');
      if (blink) drawText(g, '>  SELECT YOUR COMBAT FRAME  <', 320, 286, 1, '#ffd45e', 'center');

      drawText(g, 'ARROWS / W S: SELECT     ENTER: DEPLOY', 320, 316, 1, '#8ca4b6', 'center');
      drawText(g, 'M: SOUND', 320, 338, 1, this.audio.enabled ? '#53748a' : '#ff7a55', 'center');
    }

    drawPause(g) {
      R(g, 0, 0, W, H, 'rgba(2,5,11,0.72)');
      R(g, 200, 122, 240, 104, 'rgba(4,9,17,0.9)');
      R(g, 200, 122, 240, 1, '#3d5d77');
      R(g, 200, 225, 240, 1, '#101b29');
      R(g, 200, 122, 3, 104, '#24d8ff');
      drawText(g, 'PAUSED', 320, 137, 4, '#e9fbff', 'center');
      drawText(g, 'SYSTEM HALTED', 320, 174, 1, '#6e899f', 'center');
      drawText(g, 'ESC / P OR CLICK TO RESUME', 320, 200, 1, '#ffd45e', 'center');
    }

    drawToast(g) {
      if (this.audioToast > 0) {
        g.globalAlpha = clamp(this.audioToast * 1.5, 0, 1);
        drawText(g, this.audioToastText, W - 18, H - 14, 1, '#ffd45e', 'right');
        g.globalAlpha = 1;
      }
    }
  }

  P.Game = Game;

  // ------------------------------------------------------------
  //  boot
  // ------------------------------------------------------------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const game = new Game(ctx);
  P.game = game;
  window.PIXEL_MECH = game;

  const toCanvas = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width * W,
      y: (event.clientY - rect.top) / rect.height * H,
    };
  };

  canvas.addEventListener('pointermove', (e) => {
    const p = toCanvas(e);
    game.pointerMove(p.x, p.y);
  });

  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    game.pointerDown(p.x, p.y);
  });

  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    game.update(dt);
    game.render();
    P.Input.endFrame();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();
