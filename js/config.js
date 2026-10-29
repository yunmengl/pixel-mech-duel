// ============================================================
//  PIXEL MECH DUEL · config / math / palette
// ============================================================
(() => {
  const P = (window.PMD = window.PMD || {});

  P.W = 640;
  P.H = 360;
  P.FLOOR = 294;
  P.ARENA_LEFT = 92;
  P.ARENA_RIGHT = 548;
  P.MAX_HP = 100;
  P.MAX_GUARD = 100;
  P.ROUND_TIME = 60;
  P.WINDOW = { x: 78, y: 34, w: 484, h: 226 };

  P.P1_MAP = {
    left: ['KeyA'],
    right: ['KeyD'],
    jump: ['KeyW'],
    attack: ['KeyJ'],
    guard: ['KeyK'],
  };

  P.P2_MAP = {
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    jump: ['ArrowUp'],
    attack: ['Enter', 'NumpadEnter'],
    guard: ['ShiftRight'],
  };

  P.PREVENT_KEYS = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Space', 'Enter', 'NumpadEnter',
  ]);

  P.PALETTES = [
    {
      outline: '#060a16',
      dark: '#122238',
      steel: '#2b4a6d',
      light: '#8adcff',
      primary: '#24d8ff',
      accent: '#ffd45e',
      core: '#ff5b8d',
      name: 'AZURE-01',
    },
    {
      outline: '#190810',
      dark: '#34121c',
      steel: '#6a2731',
      light: '#ffbca3',
      primary: '#ff5a3c',
      accent: '#ffd45e',
      core: '#45f0ff',
      name: 'CRIMSON-02',
    },
  ];

  P.FLASH_PALETTE = {
    outline: '#5e0b14',
    dark: '#ff8b78',
    steel: '#fff0dd',
    light: '#ffffff',
    primary: '#ffffff',
    accent: '#fff7bf',
    core: '#ffffff',
  };

  P.clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
  P.approach = (value, target, amount) => {
    if (value < target) return Math.min(value + amount, target);
    return Math.max(value - amount, target);
  };
  P.rand = (min, max) => min + Math.random() * (max - min);
  P.irand = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
  P.sign = (v) => (v < 0 ? -1 : 1);
  P.easeOut = (t) => 1 - Math.pow(1 - t, 3);

  P.aabb = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  P.pad2 = (n) => String(n).padStart(2, '0');

  P.mulberry32 = (seed) => {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  P.r = (g, x, y, w, h, color) => {
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  P.pixelLine = (g, x1, y1, x2, y2, size, color) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    g.fillStyle = color;
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      g.fillRect(
        Math.round(x1 + dx * t - size / 2),
        Math.round(y1 + dy * t - size / 2),
        Math.round(size),
        Math.round(size)
      );
    }
  };

  P.pixelDisc = (g, cx, cy, radius, color) => {
    g.fillStyle = color;
    const r = Math.round(radius);
    for (let y = -r; y <= r; y++) {
      const half = Math.sqrt(r * r - y * y);
      g.fillRect(Math.round(cx - half), Math.round(cy + y), Math.round(half * 2), 1);
    }
  };

  P.pixelEllipse = (g, cx, cy, rx, ry, color) => {
    g.fillStyle = color;
    for (let y = -ry; y <= ry; y++) {
      const half = rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)));
      g.fillRect(Math.round(cx - half), Math.round(cy + y), Math.round(half * 2), 1);
    }
  };

  P.hexToRgb = (hex) => {
    const clean = hex.replace('#', '');
    const n = parseInt(clean, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };

  P.mixHex = (a, b, t) => {
    const ca = P.hexToRgb(a);
    const cb = P.hexToRgb(b);
    const r = Math.round(ca.r + (cb.r - ca.r) * t);
    const g = Math.round(ca.g + (cb.g - ca.g) * t);
    const bl = Math.round(ca.b + (cb.b - ca.b) * t);
    return `rgb(${r},${g},${bl})`;
  };
})();
