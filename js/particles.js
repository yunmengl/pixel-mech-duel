// ============================================================
//  PIXEL MECH DUEL · pixel particle system
// ============================================================
(() => {
  const P = (window.PMD = window.PMD || {});
  const R = P.r;

  class Particles {
    constructor() {
      this.items = [];
      this.rings = [];
    }

    add(opts) {
      this.items.push({
        x: opts.x,
        y: opts.y,
        vx: opts.vx || 0,
        vy: opts.vy || 0,
        life: opts.life || 0.5,
        maxLife: opts.life || 0.5,
        size: opts.size || 2,
        color: opts.color || '#ffffff',
        grav: opts.grav !== undefined ? opts.grav : 0,
        drag: opts.drag !== undefined ? opts.drag : 0.98,
        streak: !!opts.streak,
        glow: !!opts.glow,
        smoke: !!opts.smoke,
      });
    }

    spark(x, y, dir, colors, count = 10, power = 1) {
      for (let i = 0; i < count; i++) {
        const a = P.rand(-1.2, 1.2);
        const speed = P.rand(55, 190) * power;
        this.add({
          x: x + P.rand(-4, 4),
          y: y + P.rand(-8, 8),
          vx: Math.cos(a) * speed * (dir || 1),
          vy: Math.sin(a) * speed - 30,
          life: P.rand(0.16, 0.42),
          size: Math.random() > 0.65 ? 2 : 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          grav: 260,
          drag: 0.99,
          streak: true,
          glow: true,
        });
      }
    }

    smoke(x, y, color = '#718192', count = 5, drift = 0) {
      for (let i = 0; i < count; i++) {
        this.add({
          x: x + P.rand(-8, 8),
          y: y + P.rand(-8, 8),
          vx: P.rand(-12, 12) + drift,
          vy: P.rand(-28, -8),
          life: P.rand(0.6, 1.3),
          size: 2 + Math.floor(Math.random() * 5),
          color,
          grav: -8,
          drag: 0.98,
          smoke: true,
        });
      }
    }

    dust(x, y, dir = 1) {
      for (let i = 0; i < 7; i++) {
        this.add({
          x: x + P.rand(-14, 14),
          y: y + P.rand(-2, 3),
          vx: P.rand(10, 60) * dir,
          vy: P.rand(-38, -6),
          life: P.rand(0.3, 0.6),
          size: 1 + Math.floor(Math.random() * 2),
          color: Math.random() > 0.5 ? '#566576' : '#8795a3',
          grav: 40,
          drag: 0.96,
        });
      }
    }

    explosion(x, y, colors) {
      for (let i = 0; i < 42; i++) {
        const a = P.rand(0, Math.PI * 2);
        const speed = P.rand(40, 250);
        this.add({
          x: x + P.rand(-12, 12),
          y: y + P.rand(-20, 20),
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed - 40,
          life: P.rand(0.35, 1.0),
          size: Math.random() > 0.7 ? 3 : 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          grav: 200,
          drag: 0.98,
          streak: true,
          glow: true,
        });
      }
      for (let i = 0; i < 18; i++) {
        this.add({
          x: x + P.rand(-24, 24),
          y: y + P.rand(-30, 18),
          vx: P.rand(-25, 25),
          vy: P.rand(-45, -8),
          life: P.rand(0.9, 1.8),
          size: 4 + Math.floor(Math.random() * 7),
          color: Math.random() > 0.5 ? '#4f5362' : '#2d303b',
          grav: -18,
          drag: 0.985,
          smoke: true,
        });
      }
      this.ring(x, y, colors[0], 2);
      this.ring(x, y, '#fff4cf', 1);
    }

    ring(x, y, color, count = 1) {
      for (let i = 0; i < count; i++) {
        this.rings.push({
          x,
          y,
          radius: 5 + i * 5,
          speed: 70 + i * 25,
          life: 0.34,
          maxLife: 0.34,
          color,
        });
      }
    }

    update(dt) {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const p = this.items[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.items.splice(i, 1);
          continue;
        }
        p.vy += p.grav * dt;
        p.vx *= Math.pow(p.drag, dt * 60);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.smoke) p.size += dt * 2.2;
        if (p.y > P.FLOOR + 2 && p.grav > 0) {
          p.y = P.FLOOR + 2;
          p.vy *= -0.3;
          p.vx *= 0.7;
        }
      }

      for (let i = this.rings.length - 1; i >= 0; i--) {
        const r = this.rings[i];
        r.life -= dt;
        r.radius += r.speed * dt;
        if (r.life <= 0) this.rings.splice(i, 1);
      }
    }

    render(g) {
      for (const r of this.rings) {
        const alpha = Math.max(0, r.life / r.maxLife) * 0.8;
        g.globalAlpha = alpha;
        const segments = 18;
        for (let i = 0; i < segments; i++) {
          const a = (i / segments) * Math.PI * 2;
          R(
            g,
            r.x + Math.cos(a) * r.radius,
            r.y + Math.sin(a) * r.radius * 0.55,
            2,
            2,
            r.color
          );
        }
      }
      g.globalAlpha = 1;

      for (const p of this.items) {
        const alpha = Math.max(0, p.life / p.maxLife);
        g.globalAlpha = alpha;
        if (p.streak) {
          const len = Math.min(8, Math.hypot(p.vx, p.vy) * 0.035 + 2);
          P.pixelLine(g, p.x, p.y, p.x - p.vx * 0.018, p.y - p.vy * 0.018, p.size, p.color);
          if (p.glow) {
            g.globalAlpha = alpha * 0.18;
            R(g, p.x - 2, p.y - 2, p.size + 4, p.size + 4, p.color);
          }
        } else {
          R(g, p.x, p.y, p.size, p.size, p.color);
        }
      }
      g.globalAlpha = 1;
    }
  }

  P.Particles = Particles;
})();
