/**
 * VictoryMusicSystem — procedural 5-second Indian-style melody
 * using Web Audio API. No external files needed.
 *
 * Uses Raga Yaman (raised 4th = Teevra Madhyam):
 *   Sa  Re  Ga  Ma#  Pa  Dha  Ni  Sa
 *   C   D   E   F#   G   A    B   C
 * Characteristic bright/victorious feel with tanpura drone and
 * sitar-like sawtooth timbre + slight gamak (pitch ornament).
 */
export class VictoryMusicSystem {
  private static _ctx: AudioContext | null = null;

  static play(): void {
    try {
      if (!window.AudioContext && !(window as unknown as Record<string, unknown>)['webkitAudioContext']) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AC: typeof AudioContext = (window as any).AudioContext ?? (window as any).webkitAudioContext;
      if (!VictoryMusicSystem._ctx || VictoryMusicSystem._ctx.state === 'closed') {
        VictoryMusicSystem._ctx = new AC();
      }
      const ctx = VictoryMusicSystem._ctx;
      if (ctx.state === 'suspended') ctx.resume();
      VictoryMusicSystem._playMelody(ctx);
    } catch (_) { /* Web Audio not available — silent fail */ }
  }

  private static _playMelody(ctx: AudioContext): void {
    const now = ctx.currentTime + 0.05;

    // Raga Yaman — just-intonation approximation in Hz (root = C4 = 261.63 Hz)
    const sa  = 261.63;
    const re  = sa * (9 / 8);      // D  — 294.33
    const ga  = sa * (5 / 4);      // E  — 327.03
    const ma  = sa * (45 / 32);    // F# — 367.92  ← Teevra Madhyam (raised 4th)
    const pa  = sa * (3 / 2);      // G  — 392.44
    const dha = sa * (5 / 3);      // A  — 436.05
    const ni  = sa * (15 / 8);     // B  — 490.55
    const SA  = sa * 2;            // C5 — 523.25  (upper octave)
    const PA  = pa * 0.5;          // G3 — drone bass

    // ── Tanpura drone (Sa + Pa lower octave, fades in/out) ────────────────────
    VictoryMusicSystem._drone(ctx, sa * 0.5, now, 5.2, 0.05); // Sa bass
    VictoryMusicSystem._drone(ctx, PA,        now, 5.2, 0.03); // Pa bass
    VictoryMusicSystem._drone(ctx, sa,        now, 5.2, 0.03); // Sa mid

    // ── Melody: Yaman ascent → ornament → descent → final cadence ─────────────
    // tempo ≈ 84 BPM: quarter = 0.71s, eighth = 0.36s, sixteenth = 0.18s
    const q = 0.50;   // quarter note duration (seconds)
    const e = q / 2;  // eighth
    const h = q * 2;  // half

    const melody: [number, number][] = [
      // ascending mukhda (opening phrase) — hallmark of Yaman
      [PA,  e ],   // Pa (low) pickup
      [sa,  e ],   // Sa
      [re,  e ],   // Re
      [ga,  e ],   // Ga
      [ma,  q ],   // Ma# ← characteristic Yaman note, slight emphasis
      [pa,  e ],   // Pa
      [dha, e ],   // Dha
      [ni,  e ],   // Ni
      [SA,  h ],   // SA (high) — peak, held
      // descending gamak phrase
      [ni,  e ],   // Ni
      [dha, e ],   // Dha
      [pa,  q ],   // Pa — breathing point
      [ma,  e ],   // Ma#
      [ga,  e ],   // Ga
      [re,  e ],   // Re
      [sa,  h ],   // Sa — final rest note (sam)
    ];

    let t = now;
    for (const [freq, dur] of melody) {
      VictoryMusicSystem._note(ctx, freq, t, dur);
      t += dur;
    }
  }

  /** Sitar-like note: sawtooth + bandpass + gamak pitch ornament */
  private static _note(ctx: AudioContext, freq: number, start: number, dur: number): void {
    // Layer 1: main sawtooth oscillator
    const osc1 = ctx.createOscillator();
    // Layer 2: octave harmonic (sitar sympathetic string effect)
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'sine';

    // Gamak: slight upward pitch bend then return — characteristic Indian ornament
    osc1.frequency.setValueAtTime(freq * 0.995, start);
    osc1.frequency.linearRampToValueAtTime(freq * 1.008, start + dur * 0.25);
    osc1.frequency.linearRampToValueAtTime(freq,          start + dur * 0.55);
    osc2.frequency.setValueAtTime(freq * 2, start); // octave harmonic

    // Bandpass filter centered around the note harmonics → sitar brightness
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 2.5, start);
    filter.Q.value = 2.0;

    // Envelope: instant attack, fast decay, low sustain, release
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.018);      // sharp attack
    gain.gain.exponentialRampToValueAtTime(0.07, start + dur * 0.35); // decay
    gain.gain.setValueAtTime(0.07, start + dur * 0.75);          // sustain
    gain.gain.linearRampToValueAtTime(0.001, start + dur);        // release

    osc1.connect(filter);
    osc2.connect(gain);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(start);
    osc2.start(start);
    osc1.stop(start + dur + 0.05);
    osc2.stop(start + dur + 0.05);
  }

  /** Tanpura-style continuous drone */
  private static _drone(ctx: AudioContext, freq: number, start: number, dur: number, vol: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.4);
    gain.gain.setValueAtTime(vol, start + dur - 0.6);
    gain.gain.linearRampToValueAtTime(0, start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + dur + 0.1);
  }
}
