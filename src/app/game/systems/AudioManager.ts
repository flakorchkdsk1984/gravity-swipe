import { EventBus } from './EventBus';
import { GameEvent, DashPayload, HitPayload, ComboPayload } from '../config/types';

// ─────────────────────────────────────────────────────────────────────────────
// AudioManager — all sounds synthesised via Web Audio API, no asset files.
// ─────────────────────────────────────────────────────────────────────────────
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterVolume = 0.6;

  // Active charge oscillator so we can stop it on release
  private chargeOsc: OscillatorNode | null = null;
  private chargeGain: GainNode | null = null;

  constructor() {}

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  init(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this._bindEvents();
    } catch (e) {
      console.warn('[AudioManager] Web Audio API not available', e);
    }
  }

  private _bindEvents(): void {
    (EventBus as any).on(GameEvent.CHARGE_UPDATE, (payload: { level: number }) => {
      this.playCharge(payload?.level ?? 0);
    }, this);

    (EventBus as any).on(GameEvent.CHARGE_RELEASE, (payload: { level: number }) => {
      this.playRelease(payload?.level ?? 0.5);
    }, this);

    (EventBus as any).on(GameEvent.PLAYER_BOUNCE, (payload: HitPayload) => {
      const speed = payload ? Math.hypot(payload.velocity.x, payload.velocity.y) : 300;
      this.playBounce(speed);
    }, this);

    (EventBus as any).on(GameEvent.OBSTACLE_HIT, () => this.playObstacleHit(), this);
    (EventBus as any).on(GameEvent.OBSTACLE_DESTROY, () => this.playObstacleDestroy(), this);
    (EventBus as any).on(GameEvent.ENEMY_DESTROY, () => this.playEnemyDie(), this);

    (EventBus as any).on(GameEvent.COMBO_INCREMENT, (payload: ComboPayload) => {
      this.playComboUp(payload?.count ?? 1);
    }, this);

    (EventBus as any).on(GameEvent.PLAYER_NEAR_MISS, () => this.playNearMiss(), this);
    (EventBus as any).on(GameEvent.SLOW_MOTION_START, () => this.playSlowMotion(), this);
    (EventBus as any).on(GameEvent.PLAYER_DIED, () => this.playGameOver(), this);
    (EventBus as any).on(GameEvent.GAME_RESTART, () => this.playRestart(), this);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private _ctx(): AudioContext | null {
    if (!this.ctx) return null;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private _out(): GainNode | null {
    return this.masterGain;
  }

  private _makeGain(value: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(value, this.ctx!.currentTime);
    return g;
  }

  private _makeOsc(type: OscillatorType, freq: number): OscillatorNode {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.ctx!.currentTime);
    return o;
  }

  /** White-noise buffer (1s mono) — reused. */
  private _noiseBuffer(): AudioBuffer {
    const rate = this.ctx!.sampleRate;
    const buf = this.ctx!.createBuffer(1, rate, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < rate; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private _makeNoise(): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this._noiseBuffer();
    return src;
  }

  // Simple short reverb via delay
  private _addDelay(input: AudioNode, out: AudioNode, delayTime = 0.06, feedback = 0.3, mix = 0.25): void {
    const delay = this.ctx!.createDelay(0.5);
    delay.delayTime.value = delayTime;
    const fbGain = this._makeGain(feedback);
    const wetGain = this._makeGain(mix);
    input.connect(delay);
    delay.connect(fbGain);
    fbGain.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(out);
  }

  // ── Public Sound API ──────────────────────────────────────────────────────

  /**
   * Continuous growing hum while charging. Sawtooth + pitch ramp.
   * level 0→1 maps 80→400 Hz.
   */
  playCharge(level: number): void {
    const ctx = this._ctx();
    if (!ctx || !this._out()) return;

    const targetFreq = 80 + level * 320;

    if (!this.chargeOsc) {
      // Spawn the persistent charge oscillator
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, ctx.currentTime);

      // Mild waveshaper distortion
      const ws = ctx.createWaveShaper();
      ws.curve = this._makeDistortionCurve(20);
      ws.oversample = '2x';

      const g = this._makeGain(0.04); // very quiet
      osc.connect(ws);
      ws.connect(g);
      g.connect(this._out()!);
      osc.start();

      this.chargeOsc = osc;
      this.chargeGain = g;
    }

    // Ramp frequency to target
    this.chargeOsc.frequency.linearRampToValueAtTime(targetFreq, ctx.currentTime + 0.05);
  }

  private _stopCharge(): void {
    if (this.chargeOsc) {
      try { this.chargeOsc.stop(); } catch (_) {}
      this.chargeOsc = null;
      this.chargeGain = null;
    }
  }

  private _makeDistortionCurve(amount: number): Float32Array {
    const n = 256;
    const curve = new Float32Array(n);
    const deg = Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  /**
   * Explosive release: sine sweep 200→800Hz (50ms) + bass thump (sine 60Hz).
   */
  playRelease(level: number): void {
    const ctx = this._ctx();
    if (!ctx || !this._out()) return;
    this._stopCharge();

    const t = ctx.currentTime;
    const vol = 0.3 + level * 0.4;

    // ── Sweep
    const sweep = this._makeOsc('sine', 200);
    const sweepGain = this._makeGain(vol);
    sweep.frequency.linearRampToValueAtTime(800 * (0.5 + level * 0.5), t + 0.05);
    sweepGain.gain.linearRampToValueAtTime(0, t + 0.12);
    sweep.connect(sweepGain);
    sweepGain.connect(this._out()!);
    sweep.start(t);
    sweep.stop(t + 0.13);

    // ── Bass thump
    const bass = this._makeOsc('sine', 60 + level * 20);
    const bassGain = this._makeGain(0.6 * vol);
    bassGain.gain.linearRampToValueAtTime(0, t + 0.18);
    bass.connect(bassGain);
    bassGain.connect(this._out()!);
    bass.start(t + 0.04);
    bass.stop(t + 0.2);
  }

  /**
   * Snappy click/ping on bounce.
   */
  playBounce(velocity: number): void {
    const ctx = this._ctx();
    if (!ctx || !this._out()) return;

    const t = ctx.currentTime;
    const vol = Math.min(0.35, 0.1 + velocity / 3000);
    const freq = 280 + Math.min(velocity / 10, 200);

    const osc = this._makeOsc('square', freq);
    const g = this._makeGain(vol);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.connect(g);
    this._addDelay(g, this._out()!, 0.04, 0.2, 0.15);
    g.connect(this._out()!);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  /**
   * Clean triangle ping, pitch scales with combo.
   */
  playRicochet(combo: number): void {
    const ctx = this._ctx();
    if (!ctx || !this._out()) return;

    const t = ctx.currentTime;
    const freq = 400 + combo * 100;
    const osc = this._makeOsc('triangle', Math.min(freq, 2000));
    const g = this._makeGain(0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(g);
    g.connect(this._out()!);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  /**
   * White noise burst + sine sweep 800→200Hz.
   */
  playEnemyDie(): void {
    const ctx = this._ctx();
    if (!ctx || !this._out()) return;

    const t = ctx.currentTime;

    // Noise burst
    const noise = this._makeNoise();
    const noiseGain = this._makeGain(0.4);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.8;
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this._out()!);
    noise.start(t);
    noise.stop(t + 0.11);

    // Sweep
    const osc = this._makeOsc('sine', 800);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);
    const g = this._makeGain(0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g);
    g.connect(this._out()!);
    osc.start(t);
    osc.stop(t + 0.19);
  }

  /**
   * Low sine 150Hz, heavy compression — obstacle hit thud.
   */
  playObstacleHit(): void {
    const ctx = this._ctx();
    if (!ctx || !this._out()) return;

    const t = ctx.currentTime;
    const osc = this._makeOsc('sine', 150);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 12;
    const g = this._makeGain(0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(comp);
    comp.connect(g);
    g.connect(this._out()!);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  /**
   * Noise burst + 3-oscillator detuned chord crunch.
   */
  playObstacleDestroy(): void {
    const ctx = this._ctx();
    if (!ctx || !this._out()) return;

    const t = ctx.currentTime;

    // Noise burst
    const noise = this._makeNoise();
    const ng = this._makeGain(0.5);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    noise.connect(filter);
    filter.connect(ng);
    ng.connect(this._out()!);
    noise.start(t);
    noise.stop(t + 0.22);

    // Detuned chord
    const freqs = [200, 201.5, 198.5];
    freqs.forEach(f => {
      const osc = this._makeOsc('sawtooth', f);
      const g = this._makeGain(0.18);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(g);
      g.connect(this._out()!);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  /**
   * Ascending pentatonic chime — higher notes for higher combo level.
   */
  playComboUp(level: number): void {
    const ctx = this._ctx();
    if (!ctx || !this._out()) return;

    // Pentatonic scale ratios (C major pentatonic relative to base)
    const pentatonic = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2];
    const baseFreq = 440;
    const noteCount = Math.min(Math.max(level, 1), 5);
    let t = ctx.currentTime;

    for (let i = 0; i < noteCount; i++) {
      const freq = baseFreq * pentatonic[i % pentatonic.length];
      const osc = this._makeOsc('triangle', freq);
      const g = this._makeGain(0.2);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      osc.connect(g);
      g.connect(this._out()!);
      osc.start(t);
      osc.stop(t + 0.11);
      t += 0.07;
    }
  }

  /**
   * Sine sweep 200→600→200Hz + tension bell.
   */
  playNearMiss(): void {
    const ctx = this._ctx();
    if (!ctx || !this._out()) return;

    const t = ctx.currentTime;

    // Swoosh
    const osc = this._makeOsc('sine', 200);
    osc.frequency.linearRampToValueAtTime(600, t + 0.15);
    osc.frequency.linearRampToValueAtTime(200, t + 0.3);
    const g = this._makeGain(0.25);
    g.gain.linearRampToValueAtTime(0, t + 0.32);
    osc.connect(g);
    g.connect(this._out()!);
    osc.start(t);
    osc.stop(t + 0.33);

    // Bell
    const bell = this._makeOsc('sine', 880);
    const bg = this._makeGain(0.15);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    bell.connect(bg);
    bg.connect(this._out()!);
    bell.start(t + 0.25);
    bell.stop(t + 0.42);
  }

  /**
   * Pitch-down bass drone effect.
   */
  playSlowMotion(): void {
    const ctx = this._ctx();
    if (!ctx || !this._out()) return;

    const t = ctx.currentTime;
    const osc = this._makeOsc('sine', 120);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    const g = this._makeGain(0.35);
    g.gain.setValueAtTime(0.35, t);
    g.gain.linearRampToValueAtTime(0, t + 0.8);
    osc.connect(g);
    g.connect(this._out()!);
    osc.start(t);
    osc.stop(t + 0.82);
  }

  /**
   * Descending minor chord sweep.
   */
  playGameOver(): void {
    const ctx = this._ctx();
    if (!ctx || !this._out()) return;

    // A minor chord: A3, C4, E4 descending
    const notes = [
      { freq: 220.0, delay: 0 },
      { freq: 261.6, delay: 0.15 },
      { freq: 329.6, delay: 0.3 },
    ];

    notes.forEach(({ freq, delay }) => {
      const osc = this._makeOsc('triangle', freq * 1.5);
      const t = ctx.currentTime + delay;
      osc.frequency.linearRampToValueAtTime(freq * 0.8, t + 0.5);
      const g = this._makeGain(0.25);
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      osc.connect(g);
      g.connect(this._out()!);
      osc.start(t);
      osc.stop(t + 0.72);
    });
  }

  /**
   * Ascending major sweep with reverb — restart/power-up feel.
   */
  playRestart(): void {
    const ctx = this._ctx();
    if (!ctx || !this._out()) return;

    // C major arpeggio C4→E4→G4→C5
    const freqs = [261.6, 329.6, 392.0, 523.3];
    let t = ctx.currentTime;

    freqs.forEach(freq => {
      const osc = this._makeOsc('triangle', freq);
      const g = this._makeGain(0.22);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(g);
      this._addDelay(g, this._out()!, 0.08, 0.25, 0.2);
      g.connect(this._out()!);
      osc.start(t);
      osc.stop(t + 0.2);
      t += 0.1;
    });
  }

  // ── Volume & teardown ─────────────────────────────────────────────────────

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  destroy(): void {
    this._stopCharge();
    (EventBus as any).off(GameEvent.CHARGE_UPDATE, undefined, this);
    (EventBus as any).off(GameEvent.CHARGE_RELEASE, undefined, this);
    (EventBus as any).off(GameEvent.PLAYER_BOUNCE, undefined, this);
    (EventBus as any).off(GameEvent.OBSTACLE_HIT, undefined, this);
    (EventBus as any).off(GameEvent.OBSTACLE_DESTROY, undefined, this);
    (EventBus as any).off(GameEvent.ENEMY_DESTROY, undefined, this);
    (EventBus as any).off(GameEvent.COMBO_INCREMENT, undefined, this);
    (EventBus as any).off(GameEvent.PLAYER_NEAR_MISS, undefined, this);
    (EventBus as any).off(GameEvent.SLOW_MOTION_START, undefined, this);
    (EventBus as any).off(GameEvent.PLAYER_DIED, undefined, this);
    (EventBus as any).off(GameEvent.GAME_RESTART, undefined, this);
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.masterGain = null;
    }
  }
}
