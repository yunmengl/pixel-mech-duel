// ============================================================
//  PIXEL MECH DUEL · procedural neon foundry stage
// ============================================================
(() => {
  const P = (window.PMD = window.PMD || {});
  const { W, H, WINDOW: WIN, drawText } = P;

  const R = P.r;

  function cable(g, x1, y1, x2, y2, sag, color) {
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t + Math.sin(Math.PI * t) * sag;
      g.fillStyle = color;
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }

  function drawWindows(g, x, top, w, h, color, density, rng) {
    for (let wy = top + 5; wy < top + h - 4; wy += 5) {
      for (let wx = x + 3; wx < x + w - 3; wx += 4) {
        if (rng() < density) {
          g.fillStyle = color;
          g.fillRect(wx, wy, 2, 2);
        }
      }
    }
  }

  function buildBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    const rng = P.mulberry32(0x51ce77);

    // ---- base / ceiling -------------------------------------------------
    R(g, 0, 0, W, H, '#060811');
    R(g, 0, 0, W, 28, '#070a12');
    R(g, 0, 0, W, 7, '#151b29');
    R(g, 0, 7, W, 2, '#2b3448');
    R(g, 0, 9, W, 1, '#05070d');

    // ceiling pipes
    R(g, 0, 17, W, 3, '#121828');
    R(g, 0, 20, W, 1, '#2a354b');
    for (let x = 8; x < W; x += 32) {
      R(g, x, 15, 4, 8, '#1c2638');
      R(g, x + 1, 16, 2, 4, '#394963');
    }
    R(g, 0, 24, W, 2, '#0a0e18');

    // hanging cables
    cable(g, 58, 18, 210, 26, 10, '#05070d');
    cable(g, 210, 26, 382, 22, 14, '#05070d');
    cable(g, 382, 22, 586, 18, 9, '#05070d');
    cable(g, 86, 26, 292, 40, 20, '#0c1320');
    cable(g, 548, 26, 348, 42, 18, '#0c1320');

    // ceiling lamp housings
    for (const lx of [112, 528]) {
      R(g, lx - 10, 22, 20, 7, '#101724');
      R(g, lx - 7, 25, 14, 3, '#3e526b');
      R(g, lx - 3, 27, 6, 2, lx < 300 ? '#7fe9ff' : '#ffb080');
    }

    // ---- window sky -----------------------------------------------------
    g.save();
    g.beginPath();
    g.rect(WIN.x, WIN.y, WIN.w, WIN.h);
    g.clip();

    const stops = [
      [0, '#070a18'],
      [0.25, '#10132a'],
      [0.48, '#282043'],
      [0.68, '#5c2e47'],
      [0.84, '#b6534c'],
      [0.94, '#ea8458'],
      [1, '#f2a168'],
    ];
    for (let y = 0; y < WIN.h; y += 2) {
      const t = y / WIN.h;
      let a = stops[0];
      let b = stops[stops.length - 1];
      for (let i = 0; i < stops.length - 1; i++) {
        if (t >= stops[i][0] && t <= stops[i + 1][0]) {
          a = stops[i];
          b = stops[i + 1];
          break;
        }
      }
      const local = (t - a[0]) / Math.max(0.0001, b[0] - a[0]);
      R(g, WIN.x, WIN.y + y, WIN.w, 2, P.mixHex(a[1], b[1], local));
    }

    // stars
    for (let i = 0; i < 46; i++) {
      const sx = WIN.x + 4 + Math.floor(rng() * (WIN.w - 8));
      const sy = WIN.y + 4 + Math.floor(rng() * 130);
      const size = rng() > 0.85 ? 2 : 1;
      g.globalAlpha = 0.35 + rng() * 0.6;
      R(g, sx, sy, size, size, rng() > 0.75 ? '#ffd7af' : '#bfe6ff');
    }
    g.globalAlpha = 1;

    // moon
    for (let i = 4; i >= 1; i--) {
      g.globalAlpha = 0.018 * i;
      P.pixelDisc(g, 474, 82, 20 + i * 4, '#ffdca8');
    }
    g.globalAlpha = 1;
    P.pixelDisc(g, 474, 82, 18, '#f7d29d');
    P.pixelDisc(g, 470, 78, 13, '#ffe1b3');
    R(g, 466, 76, 4, 3, '#d7ad82');
    R(g, 478, 86, 5, 3, '#d7ad82');
    R(g, 469, 88, 2, 2, '#d7ad82');
    R(g, 480, 74, 2, 1, '#fff0cf');

    // low haze
    for (let i = 0; i < 6; i++) {
      g.globalAlpha = 0.07 + i * 0.012;
      R(g, WIN.x, WIN.y + 168 + i * 8, WIN.w, 4, '#ffb07c');
    }
    g.globalAlpha = 1;

    // ---- skyline --------------------------------------------------------
    const baseY = WIN.y + WIN.h;
    g.save();
    g.beginPath();
    g.rect(WIN.x, WIN.y, WIN.w, WIN.h);
    g.clip();

    // far silhouettes
    let x = WIN.x + 2;
    while (x < WIN.x + WIN.w) {
      const w = 8 + Math.floor(rng() * 24);
      const h = 32 + Math.floor(rng() * 74);
      R(g, x, baseY - h, w, h, '#242039');
      R(g, x, baseY - h, w, 1, '#332c4c');
      drawWindows(g, x, baseY - h, w, h, '#7d6170', 0.12, rng);
      if (rng() > 0.82) {
        R(g, x + Math.floor(w / 2), baseY - h - 7, 1, 7, '#17152a');
        R(g, x + Math.floor(w / 2), baseY - h - 8, 2, 2, '#a84f50');
      }
      x += w + 2 + Math.floor(rng() * 4);
    }

    // mid silhouettes
    x = WIN.x - 4;
    while (x < WIN.x + WIN.w) {
      const w = 10 + Math.floor(rng() * 24);
      const h = 28 + Math.floor(rng() * 86);
      R(g, x, baseY - h, w, h, '#14182b');
      R(g, x + 1, baseY - h, Math.max(2, w - 2), 1, '#222940');
      drawWindows(g, x, baseY - h, w, h, '#d98157', 0.17, rng);
      drawWindows(g, x, baseY - h, w, h, '#53c4d2', 0.07, rng);
      if (rng() > 0.7) {
        R(g, x + w / 2, baseY - h - 10, 1, 10, '#0d1120');
        R(g, x + w / 2 - 1, baseY - h - 11, 3, 1, '#ff7a5a');
      }
      x += w + 3 + Math.floor(rng() * 8);
    }

    // landmark tower
    R(g, 292, 152, 36, 108, '#101426');
    R(g, 292, 152, 36, 2, '#2d3854');
    R(g, 300, 143, 20, 9, '#0c101d');
    R(g, 306, 122, 2, 21, '#0a0e19');
    R(g, 305, 120, 3, 2, '#ff5f59');
    drawWindows(g, 292, 152, 36, 108, '#ffcf8a', 0.23, rng);
    R(g, 318, 166, 2, 82, '#3e2a38');
    for (let yy = 170; yy < 246; yy += 9) R(g, 318, yy, 2, 4, '#ff9366');

    // near silhouettes
    x = WIN.x;
    while (x < WIN.x + WIN.w) {
      const w = 7 + Math.floor(rng() * 18);
      const h = 12 + Math.floor(rng() * 42);
      R(g, x, baseY - h, w, h, '#080c16');
      R(g, x, baseY - h, w, 1, '#141a28');
      drawWindows(g, x, baseY - h, w, h, '#e1a066', 0.1, rng);
      x += w + 8 + Math.floor(rng() * 18);
    }

    // rooftop cranes / antennas
    R(g, 128, 198, 2, 60, '#080b14');
    R(g, 112, 202, 34, 2, '#080b14');
    R(g, 112, 200, 1, 8, '#080b14');
    R(g, 144, 204, 1, 30, '#080b14');
    R(g, 452, 188, 2, 70, '#070b13');
    R(g, 436, 204, 34, 2, '#070b13');
    R(g, 436, 202, 1, 6, '#070b13');

    // glass reflection
    g.globalAlpha = 0.08;
    g.fillStyle = '#9ddcff';
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(WIN.x + 34 + i * 90, WIN.y);
      g.lineTo(WIN.x + 92 + i * 90, WIN.y);
      g.lineTo(WIN.x + i * 90 - 18, WIN.y + WIN.h);
      g.lineTo(WIN.x + i * 90 - 78, WIN.y + WIN.h);
      g.closePath();
      g.fill();
    }
    g.globalAlpha = 1;

    // window sill haze
    g.globalAlpha = 0.18;
    R(g, WIN.x, WIN.y + WIN.h - 18, WIN.w, 18, '#3b2338');
    g.globalAlpha = 1;
    g.restore();

    // ---- window frame ---------------------------------------------------
    R(g, WIN.x - 8, WIN.y - 8, WIN.w + 16, 8, '#090d17');
    R(g, WIN.x - 8, WIN.y + WIN.h, WIN.w + 16, 8, '#090d17');
    R(g, WIN.x - 8, WIN.y - 8, 8, WIN.h + 16, '#090d17');
    R(g, WIN.x + WIN.w, WIN.y - 8, 8, WIN.h + 16, '#090d17');
    R(g, WIN.x - 8, WIN.y - 8, WIN.w + 16, 1, '#34445c');
    R(g, WIN.x - 1, WIN.y - 1, 1, WIN.h + 2, '#283950');
    R(g, WIN.x + WIN.w, WIN.y - 1, 1, WIN.h + 2, '#283950');
    R(g, WIN.x - 1, WIN.y - 1, WIN.w + 2, 1, '#283950');

    // mullions
    R(g, 302, WIN.y, 5, WIN.h, '#0a0f1a');
    R(g, 302, WIN.y, 1, WIN.h, '#26364c');
    R(g, 481, WIN.y, 4, WIN.h, '#0a0f1a');
    R(g, 481, WIN.y, 1, WIN.h, '#1d2a3e');
    R(g, WIN.x, 139, WIN.w, 5, '#0a0f1a');
    R(g, WIN.x, 139, WIN.w, 1, '#2b3b52');

    // rivets on frame
    for (let rx = WIN.x + 2; rx < WIN.x + WIN.w; rx += 28) {
      R(g, rx, WIN.y - 6, 2, 2, '#52647a');
      R(g, rx, WIN.y + WIN.h + 2, 2, 2, '#445468');
    }

    // hanging sector sign
    R(g, 260, 59, 120, 18, '#05070e');
    R(g, 260, 59, 120, 1, '#45566c');
    R(g, 260, 76, 120, 1, '#1e2939');
    R(g, 267, 62, 2, 12, '#26374b');
    R(g, 371, 62, 2, 12, '#26374b');
    drawText(g, 'SECTOR 07', 320, 65, 1, '#ffd45e', 'center', '#02040a');
    cable(g, 290, 28, 290, 59, 7, '#080b13');
    cable(g, 350, 28, 350, 59, 7, '#080b13');

    // ---- side columns ---------------------------------------------------
    for (const side of [0, 1]) {
      const baseX = side === 0 ? 0 : W - 72;
      const trim = side === 0 ? '#24d8ff' : '#ff5a3c';
      R(g, baseX, 0, 72, H, '#080c15');
      R(g, baseX + (side === 0 ? 61 : 0), 0, 11, H, '#101827');
      R(g, baseX + (side === 0 ? 67 : 0), 0, 5, H, '#1b2a3e');
      R(g, baseX + (side === 0 ? 70 : 2), 0, 2, H, '#2e4056');

      // panels
      const px = side === 0 ? 8 : W - 60;
      R(g, px, 44, 48, 76, '#0c1320');
      R(g, px, 44, 48, 1, '#26364d');
      R(g, px + 4, 49, 40, 2, '#070b12');
      R(g, px, 128, 48, 88, '#0c1320');
      R(g, px, 128, 48, 1, '#26364d');
      R(g, px + 4, 133, 40, 2, '#070b12');
      R(g, px, 224, 48, 34, '#0c1320');
      R(g, px, 224, 48, 1, '#26364d');

      // panel pipes / lights
      for (let i = 0; i < 4; i++) {
        R(g, px + 8 + i * 9, 56, 4, 26, '#151f30');
        R(g, px + 9 + i * 9, 58, 2, 18, '#31425a');
        R(g, px + 8 + i * 9, 58, 4, 2, trim);
      }
      for (let i = 0; i < 5; i++) {
        R(g, px + 8, 140 + i * 13, 30, 2, '#070b12');
        R(g, px + 40, 140 + i * 13, 3, 2, i % 2 ? '#ffd45e' : trim);
      }

      // big bay number
      g.globalAlpha = 0.32;
      drawText(g, side === 0 ? '01' : '02', px + 24, 72, 2, trim, 'center', null);
      g.globalAlpha = 1;

      // warning band
      R(g, px, 262, 48, 9, '#1a1713');
      for (let i = 0; i < 7; i++) {
        R(g, px + i * 7, 264, 4, 5, '#caa33a');
      }
      R(g, px, 271, 48, 1, '#070a10');

      // neon strip
      R(g, baseX + (side === 0 ? 65 : 2), 54, 3, 204, trim);
      R(g, baseX + (side === 0 ? 66 : 3), 58, 1, 196, '#e9fbff');
      // bracket details
      R(g, baseX + (side === 0 ? 56 : 8), 36, 10, 3, '#26374d');
      R(g, baseX + (side === 0 ? 56 : 8), 248, 10, 3, '#26374d');
    }

    // ---- back wall + floor ---------------------------------------------
    R(g, 70, 260, 500, 34, '#0a0f1a');
    R(g, 70, 260, 500, 2, '#1a2638');
    for (let bx = 82; bx < 566; bx += 34) {
      R(g, bx, 266, 1, 24, '#121a28');
      R(g, bx + 6, 286, 8, 3, '#172233');
    }
    R(g, 70, 290, 500, 4, '#0d1521');
    R(g, 70, 292, 500, 1, '#203a50');

    // floor plane
    R(g, 70, 294, 500, 23, '#121a28');
    R(g, 70, 294, 500, 2, '#2b4158');
    R(g, 70, 297, 500, 1, '#1a2a3c');
    for (let fy = 301; fy < 317; fy += 5) R(g, 70, fy, 500, 1, '#1b293c');
    for (let fx = 84; fx < 570; fx += 24) {
      R(g, fx, 296, 1, 20, '#1b293c');
    }

    // warm / cool reflections on floor
    g.globalAlpha = 0.16;
    for (let i = 0; i < 14; i++) {
      R(g, 176 + i * 5, 294 + i, 60 - i * 2, 1, '#27d9ff');
      R(g, 414 + i * 5, 294 + i, 52 - i * 2, 1, '#ff5a3c');
    }
    g.globalAlpha = 1;

    // hazard edge
    R(g, 70, 316, 500, 9, '#181a1d');
    for (let i = 0; i < 43; i++) {
      R(g, 72 + i * 12, 317, 7, 7, i % 2 ? '#b89032' : '#29261d');
    }
    R(g, 70, 316, 500, 1, '#4b4431');
    R(g, 70, 325, 500, 1, '#05070c');

    // front face
    R(g, 70, 326, 500, 34, '#070b12');
    for (let fx = 70; fx <= 570; fx += 62) {
      R(g, fx, 326, 2, 34, '#0d1420');
      R(g, fx + 2, 329, 1, 24, '#1a2739');
    }
    g.globalAlpha = 0.18;
    drawText(g, '07', 320, 332, 3, '#2e455f', 'center', null);
    g.globalAlpha = 1;
    R(g, 70, 330, 500, 1, '#172233');
    R(g, 70, 352, 500, 1, '#111a29');

    // floor grates / vents
    for (const vx of [116, 524]) {
      R(g, vx - 14, 291, 28, 4, '#05080e');
      for (let i = 0; i < 5; i++) R(g, vx - 12 + i * 5, 292, 3, 2, '#29384c');
      R(g, vx - 15, 295, 30, 1, '#0b1420');
    }

    // stage edge columns
    for (const side of [0, 1]) {
      const ex = side === 0 ? 60 : 548;
      R(g, ex, 278, 32, 82, '#0a0f19');
      R(g, ex + (side === 0 ? 0 : 30), 278, 2, 82, '#223246');
      R(g, ex, 278, 32, 2, '#24374d');
      R(g, ex + 4, 286, 24, 3, '#172334');
      R(g, ex + 4, 330, 24, 2, '#172334');
      R(g, ex + 4, 348, 24, 1, '#172334');
      R(g, ex + (side === 0 ? 28 : 2), 294, 2, 54, side === 0 ? '#24d8ff' : '#ff5a3c');
    }

    // light shafts
    g.globalAlpha = 0.035;
    g.fillStyle = '#7fe9ff';
    g.beginPath();
    g.moveTo(96, 24);
    g.lineTo(54, 296);
    g.lineTo(226, 296);
    g.lineTo(132, 24);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffab84';
    g.beginPath();
    g.moveTo(508, 24);
    g.lineTo(414, 296);
    g.lineTo(588, 296);
    g.lineTo(548, 24);
    g.closePath();
    g.fill();
    g.globalAlpha = 1;

    // foreground vignette-ish shading
    g.globalAlpha = 0.18;
    R(g, 0, 0, W, 10, '#010206');
    R(g, 0, H - 10, W, 10, '#010206');
    g.globalAlpha = 1;

    return canvas;
  }

  class ArenaBackground {
    constructor() {
      this.static = buildBackground();
      this.embers = [];
      this.steam = [];
      this.spawnTimer = 0;
      this.rng = P.mulberry32(0xfee1);
      this.vents = [116, 524];

      for (let i = 0; i < 30; i++) {
        this.embers.push({
          x: P.rand(76, 564),
          y: P.rand(286, 358),
          vy: P.rand(8, 30),
          phase: P.rand(0, Math.PI * 2),
          size: Math.random() > 0.75 ? 2 : 1,
          cyan: Math.random() > 0.78,
          life: P.rand(0.4, 1),
        });
      }
    }

    update(dt, time) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = 0.5 + this.rng() * 0.4;
        const vx = this.vents[Math.floor(this.rng() * this.vents.length)];
        this.steam.push({
          x: vx + P.rand(-8, 8),
          y: 291,
          vx: P.rand(-4, 4),
          vy: P.rand(-16, -7),
          life: P.rand(1.3, 2.4),
          maxLife: 2.4,
          size: 2 + Math.floor(this.rng() * 4),
        });
      }

      for (const p of this.embers) {
        p.y -= p.vy * dt;
        p.x += Math.sin(time * 2 + p.phase) * 2.2 * dt;
        p.life -= dt * 0.22;
        if (p.y < 278 || p.life <= 0) {
          p.x = this.rng() > 0.45
            ? (this.rng() > 0.5 ? 112 + P.rand(-14, 14) : 528 + P.rand(-14, 14))
            : P.rand(80, 560);
          p.y = 294 + P.rand(0, 20);
          p.life = P.rand(0.7, 1.4);
          p.vy = P.rand(10, 34);
        }
      }

      for (let i = this.steam.length - 1; i >= 0; i--) {
        const s = this.steam[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy *= 0.995;
        s.life -= dt;
        if (s.life <= 0) this.steam.splice(i, 1);
      }
    }

    render(g, time) {
      g.drawImage(this.static, 0, 0);
      this.drawTraffic(g, time);
      this.drawNeon(g, time);
      this.drawAmbient(g);
    }

    drawTraffic(g, time) {
      g.save();
      g.beginPath();
      g.rect(WIN.x, WIN.y, WIN.w, WIN.h);
      g.clip();

      for (let i = 0; i < 4; i++) {
        const speed = 12 + i * 9;
        const px = WIN.x + ((time * speed + i * 143) % (WIN.w + 40)) - 20;
        const py = WIN.y + 148 + i * 17;
        g.globalAlpha = 0.18;
        R(g, px - 12, py, 12, 1, i % 2 ? '#ff8966' : '#7bdfff');
        g.globalAlpha = 1;
        R(g, px, py, 3, 1, i % 2 ? '#ffb08a' : '#aff4ff');
      }

      const blink = Math.sin(time * 2.4 + 0.5) > 0.2;
      if (blink) {
        g.globalAlpha = 0.9;
        R(g, 467, 120, 3, 2, '#ff6363');
        g.globalAlpha = 0.25;
        P.pixelDisc(g, 468, 121, 5, '#ff3a3a');
        g.globalAlpha = 1;
      }
      g.restore();
    }

    drawNeon(g, time) {
      const flicker = 0.72 + Math.sin(time * 18) * 0.04 + (Math.sin(time * 2.7) > 0.93 ? 0.16 : 0);
      g.save();
      g.globalCompositeOperation = 'lighter';

      g.globalAlpha = 0.12 * flicker;
      R(g, 60, 50, 12, 212, '#24d8ff');
      g.globalAlpha = 0.18 * flicker;
      R(g, 64, 52, 6, 208, '#24d8ff');
      g.globalAlpha = 1;

      g.globalAlpha = 0.12 * flicker;
      R(g, 568, 50, 12, 212, '#ff5a3c');
      g.globalAlpha = 0.18 * flicker;
      R(g, 570, 52, 6, 208, '#ff5a3c');
      g.globalAlpha = 1;

      const signFlicker = Math.sin(time * 31) > -0.85 ? flicker : 0.2;
      g.globalAlpha = 0.08 * signFlicker;
      R(g, 250, 30, 140, 34, '#ffd45e');
      g.globalAlpha = 0.04 * signFlicker;
      R(g, 232, 18, 176, 56, '#ffb347');
      g.globalAlpha = 1;

      // floor light rail
      g.globalAlpha = 0.06;
      R(g, 92, 291, 456, 5, '#7fe9ff');
      g.globalAlpha = 1;

      g.restore();
    }

    drawAmbient(g) {
      for (const s of this.steam) {
        const alpha = Math.max(0, s.life / s.maxLife) * 0.16;
        g.globalAlpha = alpha;
        R(g, s.x, s.y, s.size, s.size, '#96a9b8');
      }
      g.globalAlpha = 1;

      for (const p of this.embers) {
        const alpha = Math.max(0.1, Math.min(1, p.life)) * 0.7;
        g.globalAlpha = alpha;
        R(g, p.x, p.y, p.size, p.size, p.cyan ? '#4ce6ff' : '#ffb25e');
      }
      g.globalAlpha = 1;
    }
  }

  P.ArenaBackground = ArenaBackground;
})();
