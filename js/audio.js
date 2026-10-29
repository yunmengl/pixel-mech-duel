// ============================================================
//  PIXEL MECH DUEL · tiny WebAudio synthesizer
// ============================================================
(() => {
  const P = (window.PMD = window.PMD || {});

  class SoundFX {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.noiseBuffer = null;
      this.enabled = true;
    }

    unlock() {
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? 0.22 : 0;
        this.master.connect(this.ctx.destination);
        this.buildNoise();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    buildNoise() {
      const length = Math.floor(this.ctx.sampleRate * 1.0);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }

    toggle() {
      this.enabled = !this.enabled;
      this.unlock();
      if (this.master) {
        this.master.gain.setTargetAtTime(this.enabled ? 0.22 : 0, this.ctx.currentTime, 0.02);
      }
      return this.enabled;
    }

    tone(freq, dur, type = 'square', vol = 0.08, endFreq = 0, delay = 0) {
      if (!this.enabled || !this.ctx) return;
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), t);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    }

    noise(dur, vol = 0.1, cutoff = 1200, delay = 0) {
      if (!this.enabled || !this.ctx || !this.noiseBuffer) return;
      const t = this.ctx.currentTime + delay;
      const src = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      src.buffer = this.noiseBuffer;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff, t);
      filter.frequency.exponentialRampToValueAtTime(Math.max(120, cutoff * 0.35), t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t);
      src.stop(t + dur + 0.02);
    }

    menuMove() {
      this.tone(520, 0.055, 'square', 0.035, 720);
    }

    select() {
      this.tone(480, 0.08, 'square', 0.04, 840);
      this.tone(840, 0.12, 'square', 0.03, 1260, 0.06);
    }

    swing() {
      this.tone(220, 0.09, 'sawtooth', 0.035, 95);
      this.noise(0.06, 0.02, 600);
    }

    hit(blocked = false) {
      if (blocked) {
        this.tone(1040, 0.08, 'square', 0.045, 1480);
        this.noise(0.045, 0.035, 3200);
        return;
      }
      this.noise(0.11, 0.12, 950);
      this.tone(120, 0.16, 'sawtooth', 0.075, 48);
      this.tone(460, 0.05, 'square', 0.035, 280, 0.02);
    }

    guardBreak() {
      this.tone(170, 0.28, 'sawtooth', 0.09, 55);
      this.noise(0.22, 0.09, 1800);
    }

    jump() {
      this.tone(190, 0.11, 'square', 0.035, 360);
    }

    land() {
      this.noise(0.06, 0.035, 520);
      this.tone(80, 0.06, 'square', 0.025, 48);
    }

    ko() {
      this.noise(0.4, 0.16, 1600);
      this.tone(220, 0.55, 'sawtooth', 0.12, 34);
      this.tone(110, 0.7, 'square', 0.08, 28, 0.04);
    }

    countBeep(final = false) {
      this.tone(final ? 720 : 380, final ? 0.16 : 0.08, 'square', 0.05, final ? 980 : 0);
    }

    fight() {
      this.tone(520, 0.08, 'square', 0.06);
      this.tone(660, 0.08, 'square', 0.06, 0, 0.08);
      this.tone(920, 0.16, 'square', 0.06, 1180, 0.16);
    }

    timeout() {
      this.tone(330, 0.12, 'square', 0.05);
      this.tone(260, 0.12, 'square', 0.05, 0, 0.13);
      this.tone(180, 0.22, 'square', 0.05, 140, 0.26);
    }

    pause() {
      this.tone(420, 0.06, 'square', 0.035, 260);
    }
  }

  P.SoundFX = SoundFX;
})();
