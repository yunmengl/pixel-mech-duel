// ============================================================
//  PIXEL MECH DUEL · mech fighter + human controller
// ============================================================
(() => {
  const P = (window.PMD = window.PMD || {});
  const {
    W, H, FLOOR, MAX_HP, MAX_GUARD, ARENA_LEFT, ARENA_RIGHT,
    clamp, approach, sign, r: R, pixelLine, pixelDisc, pixelEllipse,
  } = P;

  class HumanController {
    constructor(map) {
      this.map = map;
    }
    down(action) {
      return P.Input.down(this.map[action]);
    }
    pressed(action) {
      return P.Input.pressedAny(this.map[action]);
    }
  }

  class Mech {
    constructor(game, index, x, facing, controller, isAI = false) {
      this.game = game;
      this.index = index;
      this.controller = controller;
      this.isAI = isAI;
      this.palette = P.PALETTES[index - 1];
      this.name = this.palette.name;

      this.x = x;
      this.homeX = x;
      this.homeFacing = facing;
      this.y = FLOOR;
      this.facing = facing;
      this.vx = 0;
      this.vy = 0;
      this.onGround = true;

      this.maxHp = MAX_HP;
      this.health = MAX_HP;
      this.healthGhost = MAX_HP;
      this.guardEnergy = MAX_GUARD;
      this.guardRegenDelay = 0;

      this.state = 'idle';
      this.animTime = 0;
      this.walkPhase = 0;
      this.bodyBob = 0;
      this.landSquash = 0;
      this.hitFlash = 0;
      this.guardFlash = 0;
      this.stunTimer = 0;
      this.koTimer = 0;
      this.koRot = 0;
      this.koSmokeTimer = 0;
      this.winTimer = 0;

      this.attackSpec = {
        startup: 0.14,
        active: 0.10,
        recovery: 0.28,
        damage: 13,
        reach: 66,
      };
      this.attackT = 0;
      this.attackHasHit = false;
      this.attackCooldown = 0;
      this.attackSerial = 0;
    }

    reset(x, facing) {
      this.x = x;
      this.y = FLOOR;
      this.vx = 0;
      this.vy = 0;
      this.onGround = true;
      this.facing = facing;
      this.health = MAX_HP;
      this.healthGhost = MAX_HP;
      this.guardEnergy = MAX_GUARD;
      this.guardRegenDelay = 0;
      this.state = 'idle';
      this.attackT = 0;
      this.attackHasHit = false;
      this.attackCooldown = 0;
      this.attackSerial = 0;
      this.stunTimer = 0;
      this.hitFlash = 0;
      this.guardFlash = 0;
      this.koTimer = 0;
      this.koRot = 0;
      this.koSmokeTimer = 0;
      this.winTimer = 0;
      this.landSquash = 0;
      this.walkPhase = 0;
    }

    get totalAttackTime() {
      const s = this.attackSpec;
      return s.startup + s.active + s.recovery;
    }

    getAttackBox() {
      const s = this.attackSpec;
      const top = this.y - 98;
      return {
        x: this.facing > 0 ? this.x + 18 : this.x - 18 - s.reach,
        y: top,
        w: s.reach,
        h: 58,
      };
    }

    getHurtBox() {
      return { x: this.x - 24, y: this.y - 100, w: 48, h: 97 };
    }

    isAttackActive() {
      if (this.state !== 'attack' || this.attackHasHit) return false;
      const s = this.attackSpec;
      return this.attackT >= s.startup && this.attackT <= s.startup + s.active;
    }

    startAttack() {
      this.state = 'attack';
      this.attackT = 0;
      this.attackHasHit = false;
      this.attackSerial += 1;
      this.attackCooldown = 0.58;
      this.vx = this.facing * 52;
      this.game.audio.swing();
      const fistX = this.x + this.facing * 58;
      this.game.particles.spark(fistX, this.y - 68, this.facing, ['#ffffff', this.palette.primary], 4, 0.35);
    }

    enterGuard() {
      this.state = 'guard';
      this.guardRegenDelay = 0.55;
    }

    guardBreak() {
      if (this.state === 'ko' || this.state === 'hit') return;
      this.state = 'hit';
      this.stunTimer = 0.82;
      this.hitFlash = 0.14;
      this.guardEnergy = 30;
      this.guardRegenDelay = 0.9;
      this.vx = -this.facing * 90;
      this.game.audio.guardBreak();
      this.game.shake = Math.max(this.game.shake, 9);
      this.game.particles.spark(this.x + this.facing * 38, this.y - 66, this.facing, ['#8ff4ff', '#ffffff', '#ffd45e'], 16, 1);
      this.game.addFloater('GUARD BREAK', this.x, this.y - 112, '#8ff4ff', 1, 1.0);
    }

    receiveBlock(damage, dir, game) {
      this.health = Math.max(0, this.health - damage);
      this.guardEnergy -= 18;
      this.guardFlash = 0.16;
      this.vx = dir * 75;
      if (this.guardEnergy <= 0) {
        this.guardEnergy = 0;
        this.guardBreak();
      }
      if (this.health <= 0) this.knockout(dir, game);
    }

    receiveHit(damage, dir, game) {
      this.health = Math.max(0, this.health - damage);
      this.hitFlash = 0.18;
      if (this.health <= 0) {
        this.knockout(dir, game);
        return true;
      }
      this.state = 'hit';
      this.stunTimer = 0.26;
      this.vx = dir * 168;
      if (this.onGround) {
        this.vy = -42;
        this.onGround = false;
      }
      this.attackT = 0;
      this.attackHasHit = false;
      return false;
    }

    knockout(dir, game) {
      this.health = 0;
      this.healthGhost = 0;
      this.state = 'ko';
      this.koTimer = 0;
      this.koRot = 0;
      this.vx = dir * 230;
      this.vy = -175;
      this.onGround = false;
      game.onKnockout(this);
    }

    applyPhysics(dt, moveAxis = 0) {
      const canMove = this.state !== 'guard' && this.state !== 'hit' && this.state !== 'attack' && this.state !== 'win' && this.state !== 'ko';
      const maxSpeed = this.onGround ? 158 : 112;
      const accel = this.onGround ? 900 : 420;
      if (canMove && moveAxis !== 0) {
        this.vx = approach(this.vx, moveAxis * maxSpeed, accel * dt);
      } else {
        this.vx = approach(this.vx, 0, (this.onGround ? 760 : 260) * dt);
      }

      this.x += this.vx * dt;
      if (this.x < ARENA_LEFT) {
        this.x = ARENA_LEFT;
        this.vx = 0;
      } else if (this.x > ARENA_RIGHT) {
        this.x = ARENA_RIGHT;
        this.vx = 0;
      }

      if (!this.onGround) {
        this.vy += 760 * dt;
        this.y += this.vy * dt;
      }

      if (this.y >= FLOOR) {
        if (!this.onGround) {
          const impact = this.vy;
          this.onGround = true;
          this.vy = 0;
          if (this.state === 'jump') this.state = 'idle';
          if (impact > 80) {
            this.landSquash = 0.18;
            this.game.particles.dust(this.x, FLOOR, this.facing);
            this.game.audio.land();
          }
        }
        this.y = FLOOR;
      }
    }

    update(dt, foe, game) {
      this.animTime += dt;
      this.attackCooldown = Math.max(0, this.attackCooldown - dt);
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      this.guardFlash = Math.max(0, this.guardFlash - dt);
      this.landSquash = Math.max(0, this.landSquash - dt);
      this.guardRegenDelay = Math.max(0, this.guardRegenDelay - dt);

      if (this.healthGhost > this.health) {
        this.healthGhost = Math.max(this.health, this.healthGhost - 26 * dt);
      }

      if (this.state === 'ko') {
        this.koTimer += dt;
        const t = Math.min(1, this.koTimer / 0.85);
        this.koRot = P.easeOut(t) * 1.42;
        this.applyPhysics(dt);
        this.koSmokeTimer -= dt;
        if (this.koSmokeTimer <= 0) {
          this.koSmokeTimer = 0.16;
          game.particles.smoke(this.x + P.rand(-18, 18), this.y - 54, '#4c5260', 2);
        }
        return;
      }

      if (this.state === 'win') {
        this.winTimer += dt;
        this.applyPhysics(dt);
        return;
      }

      if (this.state === 'hit') {
        this.stunTimer = Math.max(0, this.stunTimer - dt);
        if (this.stunTimer <= 0) this.state = 'idle';
        this.applyPhysics(dt);
        this.regenGuard(dt);
        return;
      }

      const canAct = game.phase === 'fight';
      if (this.state === 'attack') {
        this.attackT += dt;
        if (this.attackT >= this.totalAttackTime) {
          this.state = 'idle';
          this.attackT = 0;
        }
        this.applyPhysics(dt);
        this.regenGuard(dt);
        return;
      }

      let moveAxis = 0;
      let guardHeld = false;

      if (canAct) {
        if (this.state !== 'guard' && Math.abs(foe.x - this.x) > 8) {
          this.facing = sign(foe.x - this.x);
        }

        if (this.controller.pressed('attack') && this.onGround && this.attackCooldown <= 0 && this.guardEnergy > 0) {
          this.startAttack();
          this.applyPhysics(dt);
          this.regenGuard(dt);
          return;
        }

        guardHeld = this.controller.down('guard') && this.onGround && this.guardEnergy > 0;
        if (guardHeld) {
          if (this.state !== 'guard') this.enterGuard();
        } else if (this.state === 'guard') {
          this.state = 'idle';
        }

        if (this.state !== 'guard') {
          if (this.controller.pressed('jump') && this.onGround) {
            this.vy = -300;
            this.onGround = false;
            this.state = 'jump';
            this.game.audio.jump();
            this.game.particles.dust(this.x, FLOOR, this.facing);
          }

          if (this.controller.down('left')) moveAxis -= 1;
          if (this.controller.down('right')) moveAxis += 1;
        }
      } else if (this.state === 'guard') {
        this.state = 'idle';
      }

      if (this.state === 'guard') {
        this.guardEnergy = Math.max(0, this.guardEnergy - 4.2 * dt);
        this.guardRegenDelay = 0.55;
        if (this.guardEnergy <= 0) {
          this.guardBreak();
          this.applyPhysics(dt);
          this.regenGuard(dt);
          return;
        }
      } else {
        this.regenGuard(dt);
      }

      if (!this.onGround) {
        if (this.state !== 'hit' && this.state !== 'ko' && this.state !== 'attack') {
          this.state = 'jump';
        }
      } else if (this.state === 'jump') {
        this.state = 'idle';
      } else if (this.state !== 'guard' && moveAxis !== 0) {
        this.state = 'walk';
        this.walkPhase += Math.abs(this.vx) * dt * 0.075 + dt * 2;
      } else if (this.state !== 'guard') {
        this.state = 'idle';
      }

      this.applyPhysics(dt, moveAxis);
    }

    regenGuard(dt) {
      if (this.state === 'guard' || this.state === 'hit' || this.state === 'ko') return;
      if (this.guardRegenDelay <= 0) {
        this.guardEnergy = Math.min(MAX_GUARD, this.guardEnergy + 21 * dt);
      }
    }

    render(g, time) {
      const p = this.hitFlash > 0 && Math.floor(this.animTime * 55) % 2 === 0
        ? P.FLASH_PALETTE
        : this.palette;

      // floor identity marker
      g.globalAlpha = 0.3;
      R(g, this.x - 34, FLOOR + 1, 8, 1, p.primary);
      R(g, this.x + 26, FLOOR + 1, 8, 1, p.primary);
      R(g, this.x - 15, FLOOR + 3, 30, 1, p.primary);
      g.globalAlpha = 1;

      // shadow
      const air = Math.max(0, FLOOR - this.y);
      const sw = clamp(42 - air * 0.12, 24, 42);
      g.globalAlpha = 0.25;
      pixelEllipse(g, this.x, FLOOR + 2, sw, 4, '#000000');
      g.globalAlpha = 1;

      g.save();
      g.translate(Math.round(this.x), Math.round(this.y));
      g.scale(this.facing, 1);

      if (this.state === 'ko') {
        g.translate(0, -3);
        g.rotate(-this.koRot);
      }

      const bob = this.getBob(time);
      const yb = bob + (this.landSquash > 0 ? 1 : 0);
      const lean = this.state === 'hit' ? -5 : 0;
      g.translate(lean, 0);

      const jump = !this.onGround;
      const walking = this.state === 'walk';
      const guard = this.state === 'guard';
      const attack = this.state === 'attack';
      const win = this.state === 'win';

      let swingA = 0;
      let swingB = 0;
      let liftA = 0;
      let liftB = 0;
      if (walking) {
        swingA = Math.sin(this.walkPhase) * 5;
        swingB = Math.sin(this.walkPhase + Math.PI) * 5;
        liftA = Math.max(0, Math.sin(this.walkPhase)) * 4;
        liftB = Math.max(0, Math.sin(this.walkPhase + Math.PI)) * 4;
      } else if (jump) {
        liftA = 7;
        liftB = 8;
        swingA = -2;
        swingB = 3;
      } else if (guard) {
        swingA = -3;
        swingB = 3;
      } else if (attack) {
        swingA = -4;
        swingB = 4;
      } else if (win) {
        swingA = -2;
        swingB = 2;
      }

      // back leg
      this.drawLeg(g, p, -8, swingA, liftA, true, guard);
      // back arm
      this.drawBackArm(g, p, yb, guard, win);
      // backpack
      this.drawBackpack(g, p, yb, jump, time);
      // torso
      this.drawTorso(g, p, yb, time);
      // head
      this.drawHead(g, p, yb, time);
      // front leg
      this.drawLeg(g, p, 8, swingB, liftB, false, guard);
      // shoulders
      this.drawShoulders(g, p, yb);
      // front arm
      this.drawFrontArm(g, p, yb, guard, attack, win, jump, time);

      if (guard) this.drawShield(g, p, time);

      g.restore();
    }

    getBob(time) {
      if (this.state === 'idle') return Math.round(Math.sin(time * 2.2 + this.index) * 1.2);
      if (this.state === 'walk') return Math.round(Math.abs(Math.sin(this.walkPhase)) * 1.5);
      if (this.state === 'guard') return 2;
      if (this.state === 'attack') return 0;
      if (this.state === 'win') return Math.round(Math.sin(time * 4) * 2);
      return 1;
    }

    drawLeg(g, p, hipX, swing, lift, back, guard) {
      const s = Math.round(swing);
      const l = Math.round(lift);
      const main = back ? p.dark : p.steel;
      const hi = back ? p.steel : p.light;
      const spread = guard ? (back ? -2 : 2) : 0;
      const hx = hipX + spread;

      R(g, hx - 5 + Math.round(s * 0.3), -49, 11, 22, p.outline);
      R(g, hx - 4 + Math.round(s * 0.4), -47, 8, 18, main);
      R(g, hx - 3 + Math.round(s * 0.4), -45, 2, 11, hi);
      R(g, hx - 4 + Math.round(s * 0.7), -31, 9, 4, p.dark);
      R(g, hx - 2 + Math.round(s * 0.7), -31, 6, 1, hi);

      const shinY = -27 - Math.round(l * 0.55);
      R(g, hx - 4 + Math.round(s * 0.8), shinY, 9, 19, p.outline);
      R(g, hx - 3 + Math.round(s * 0.9), shinY + 1, 7, 16, main);
      R(g, hx - 2 + Math.round(s * 0.9), shinY + 3, 2, 10, hi);

      const footY = -9 - l;
      R(g, hx - 7 + s, footY, 18, 8, p.outline);
      R(g, hx - 6 + s, footY + 1, 15, 4, main);
      R(g, hx - 5 + s, footY + 1, 8, 1, hi);
      R(g, hx + 7 + s, footY + 4, 3, 3, main);
      R(g, hx - 7 + s, footY + 6, 16, 1, p.dark);
    }

    drawBackpack(g, p, yb, jump, time) {
      R(g, -31, -88 + yb, 14, 27, p.outline);
      R(g, -29, -86 + yb, 10, 22, p.dark);
      R(g, -28, -84 + yb, 2, 14, p.steel);
      R(g, -25, -82 + yb, 2, 6, p.primary);
      R(g, -32, -65 + yb, 7, 8, p.steel);
      R(g, -30, -63 + yb, 3, 3, p.primary);

      if (jump) {
        const flick = Math.floor(time * 28) % 3;
        g.globalAlpha = 0.22;
        P.pixelDisc(g, -26, -54 + yb, 8 + flick, p.primary);
        g.globalAlpha = 1;
        R(g, -29, -57 + yb, 7, 8 + flick * 2, p.core);
        R(g, -27, -55 + yb, 3, 9 + flick * 2, '#fff4c5');
      }
    }

    drawTorso(g, p, yb, time) {
      R(g, -21, -89 + yb, 42, 37, p.outline);
      R(g, -19, -87 + yb, 38, 33, p.steel);
      R(g, -16, -84 + yb, 32, 14, p.light);
      R(g, -17, -85 + yb, 34, 2, '#dff8ff');
      R(g, -19, -68 + yb, 38, 2, p.dark);
      R(g, -15, -66 + yb, 30, 6, p.dark);
      R(g, -13, -60 + yb, 26, 9, p.outline);
      R(g, -12, -58 + yb, 24, 6, p.steel);
      R(g, -17, -58 + yb, 3, 13, p.primary);
      R(g, 14, -58 + yb, 3, 13, p.accent);

      // armour panel seams
      R(g, -13, -82 + yb, 1, 11, p.dark);
      R(g, -3, -83 + yb, 1, 12, p.dark);
      R(g, 7, -82 + yb, 1, 11, p.dark);
      R(g, -15, -71 + yb, 8, 2, p.dark);
      R(g, 8, -71 + yb, 8, 2, p.dark);

      // reactor
      const glow = 0.14 + Math.sin(time * 4 + this.index) * 0.04;
      g.globalAlpha = glow;
      pixelDisc(g, 0, -75 + yb, 10, p.core);
      g.globalAlpha = 1;
      R(g, -4, -80 + yb, 8, 2, p.core);
      R(g, -6, -78 + yb, 12, 6, p.core);
      R(g, -4, -72 + yb, 8, 2, p.core);
      R(g, -2, -77 + yb, 4, 4, '#ffffff');
      R(g, -1, -76 + yb, 2, 2, '#fff8d6');

      // small status lights
      const blink = Math.sin(time * 6 + this.index) > 0;
      R(g, -16, -89 + yb, 3, 2, blink ? p.accent : p.dark);
      R(g, 14, -89 + yb, 2, 2, p.primary);
    }

    drawHead(g, p, yb, time) {
      const y = yb + (this.state === 'hit' ? -1 : 0);
      R(g, -4, -94 + y, 9, 5, p.dark);
      R(g, -12, -108 + y, 24, 18, p.outline);
      R(g, -10, -106 + y, 20, 15, p.light);
      R(g, -12, -101 + y, 3, 8, p.steel);
      R(g, -7, -103 + y, 15, 4, p.primary);
      R(g, -5, -103 + y, 10, 1, '#eaffff');
      R(g, -6, -96 + y, 12, 3, p.dark);
      R(g, -3, -96 + y, 6, 1, p.steel);
      R(g, -3, -110 + y, 7, 2, p.accent);
      R(g, 6, -99 + y, 2, 2, p.core);

      // antenna
      const blink = Math.sin(time * 5 + this.index) > 0.2;
      R(g, -14, -111 + y, 2, 8, p.dark);
      g.globalAlpha = blink ? 0.9 : 0.25;
      R(g, -15, -113 + y, 4, 2, p.accent);
      g.globalAlpha = 1;
    }

    drawShoulders(g, p, yb) {
      // back pad
      R(g, -33, -88 + yb, 16, 24, p.outline);
      R(g, -31, -86 + yb, 12, 20, p.steel);
      R(g, -30, -84 + yb, 3, 10, p.primary);
      R(g, -31, -68 + yb, 10, 3, p.dark);

      // front pad
      R(g, 16, -90 + yb, 17, 25, p.outline);
      R(g, 18, -88 + yb, 13, 21, p.steel);
      R(g, 20, -86 + yb, 4, 10, p.accent);
      R(g, 18, -68 + yb, 11, 3, p.dark);
      R(g, 25, -88 + yb, 1, 16, p.light);
    }

    drawBackArm(g, p, yb, guard, win) {
      if (guard) {
        pixelLine(g, -27, -76 + yb, -8, -64 + yb, 9, p.outline);
        pixelLine(g, -27, -76 + yb, -6, -64 + yb, 6, p.dark);
        R(g, -10, -70 + yb, 8, 8, p.steel);
        return;
      }
      const ex = win ? -20 : -26;
      const ey = win ? -94 + yb : -55 + yb;
      pixelLine(g, -25, -76 + yb, ex, ey, 9, p.outline);
      pixelLine(g, -25, -76 + yb, ex, ey, 6, p.dark);
      R(g, ex - 4, ey - 4, 9, 9, p.outline);
      R(g, ex - 3, ey - 3, 7, 7, p.steel);
    }

    drawFrontArm(g, p, yb, guard, attack, win, jump, time) {
      let ex = 28;
      let ey = -56 + yb;
      let fx = 27;
      let fy = -44 + yb;

      if (guard) {
        ex = 31;
        ey = -64 + yb;
        fx = 31;
        fy = -46 + yb;
      } else if (attack) {
        const s = this.attackSpec;
        let ext;
        if (this.attackT < s.startup) {
          ext = -0.2 * (this.attackT / s.startup);
        } else if (this.attackT < s.startup + s.active) {
          ext = P.easeOut((this.attackT - s.startup) / s.active);
        } else {
          ext = 1 - P.easeOut((this.attackT - s.startup - s.active) / s.recovery);
        }
        ex = 28 + ext * 9;
        ey = -68 + yb;
        fx = 28 + ext * 38;
        fy = -67 + yb;
      } else if (win) {
        ex = 31;
        ey = -94 + yb;
        fx = 31;
        fy = -108 + yb;
      } else if (jump) {
        ex = 31;
        ey = -64 + yb;
        fx = 36;
        fy = -50 + yb;
      }

      const sx = 27;
      const sy = -76 + yb;

      if (attack) {
        const s = this.attackSpec;
        if (this.attackT >= s.startup && this.attackT <= s.startup + s.active) {
          g.globalAlpha = 0.22;
          R(g, fx - 22, fy - 2, 24, 2, p.primary);
          R(g, fx - 16, fy - 9, 18, 2, p.primary);
          g.globalAlpha = 1;
        }
      }

      pixelLine(g, sx, sy, ex, ey, 10, p.outline);
      pixelLine(g, sx, sy, ex, ey, 7, p.steel);
      pixelLine(g, ex, ey, fx, fy, 9, p.outline);
      pixelLine(g, ex, ey, fx, fy, 6, p.steel);
      R(g, ex - 2, ey - 3, 6, 2, p.light);
      R(g, fx - 5, fy - 5, 11, 11, p.outline);
      R(g, fx - 4, fy - 4, 9, 9, attack ? p.light : p.steel);
      R(g, fx - 2, fy - 3, 5, 4, p.primary);
      R(g, fx + 2, fy + 3, 3, 3, p.dark);

      if (attack) {
        const s = this.attackSpec;
        if (this.attackT >= s.startup && this.attackT <= s.startup + s.active + 0.04) {
          g.globalAlpha = 0.15;
          pixelDisc(g, fx, fy, 11, p.primary);
          g.globalAlpha = 1;
        }
      } else if (win) {
        const blink = Math.sin(time * 5 + this.index) > 0;
        if (blink) {
          g.globalAlpha = 0.8;
          R(g, fx - 2, fy - 10, 2, 3, p.accent);
          R(g, fx + 3, fy - 8, 2, 2, p.accent);
          g.globalAlpha = 1;
        }
      }
    }

    drawShield(g, p, time) {
      const cx = 42;
      const cy = -66;
      const rh = 31;
      const flash = this.guardFlash > 0 ? 0.5 : 0;
      const pulse = 0.24 + Math.sin(time * 9) * 0.04 + flash;
      g.globalAlpha = pulse;
      for (let yy = -rh; yy <= rh; yy += 2) {
        const t = Math.abs(yy) / rh;
        const half = 16 * (1 - t * 0.48) + (1 - t) * 4;
        R(g, cx - half, cy + yy, half * 2, 2, p.primary);
      }
      g.globalAlpha = 1;

      // shield outline
      const points = [
        [cx - 20, cy - 22],
        [cx + 14, cy - 31],
        [cx + 23, cy],
        [cx + 14, cy + 31],
        [cx - 20, cy + 22],
      ];
      for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        pixelLine(g, a[0], a[1], b[0], b[1], 1, p.light);
      }
      for (let yy = -24; yy <= 24; yy += 6) {
        g.globalAlpha = 0.34 + flash;
        R(g, cx - 14, cy + yy, 28, 1, '#ffffff');
      }
      g.globalAlpha = 0.45;
      R(g, cx - 2, cy - 20, 2, 40, p.light);
      g.globalAlpha = 1;

      // guard gauge arc
      const ratio = this.guardEnergy / MAX_GUARD;
      g.globalAlpha = 0.85;
      R(g, cx - 14, cy + 37, 30, 3, '#06101a');
      R(g, cx - 13, cy + 38, 28 * ratio, 1, ratio > 0.25 ? p.accent : '#ff6257');
      g.globalAlpha = 1;
    }
  }

  P.HumanController = HumanController;
  P.Mech = Mech;
})();
