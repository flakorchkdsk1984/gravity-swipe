import { EventBus } from './EventBus';
import { GameEvent, Vec2, ComboPayload } from '../config/types';
import { GAME_CONFIG } from '../config/GameConfig';

// ─────────────────────────────────────────────────────────────────────────────
// ComboSystem — tracks hit chains, multipliers, near-miss credit.
// Emits COMBO_INCREMENT, COMBO_BREAK, MULTIPLIER_CHANGE.
// ─────────────────────────────────────────────────────────────────────────────
export class ComboSystem {
  private comboCount  = 0;
  private multiplier  = 1;
  private lastHitTime = 0;

  /** Fractional hit accumulator — near-miss adds 0.5 credits. */
  private fractionalHits = 0;

  /** Timer that fires when the combo window expires. */
  private breakTimer: ReturnType<typeof setTimeout> | null = null;

  // Multiplier lookup table: [minCombo, multiplier]
  private readonly THRESHOLDS: Array<[number, number]> = [
    [20, 5],
    [12, 4],
    [6,  3],
    [3,  2],
    [0,  1],
  ];

  constructor() {}

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Call when the player hits any target (obstacle, enemy, wall).
   */
  onHit(position: Vec2): void {
    this._registerHit(position, 1);
  }

  /**
   * Near miss counts as 0.5 — can maintain combo but builds slower.
   */
  onNearMiss(position: Vec2): void {
    this._registerHit(position, 0.5);
  }

  /** Force-break the combo without emitting an increment. */
  breakCombo(): void {
    this._break();
  }

  getCombo(): number {
    return this.comboCount;
  }

  getMultiplier(): number {
    return this.multiplier;
  }

  reset(): void {
    this._cancelBreakTimer();
    this.comboCount     = 0;
    this.multiplier     = 1;
    this.lastHitTime    = 0;
    this.fractionalHits = 0;
  }

  // ── Internal logic ─────────────────────────────────────────────────────────

  private _registerHit(position: Vec2, credit: number): void {
    const now = performance.now();

    // Check if the previous hit is still within the combo window
    if (this.lastHitTime > 0 && now - this.lastHitTime > GAME_CONFIG.combo.window) {
      // Window expired — break before crediting the new hit
      this._break();
    }

    this.lastHitTime    = now;
    this.fractionalHits += credit;

    // Only increment the integer combo counter when we reach a full hit
    const wholeHits = Math.floor(this.fractionalHits);
    if (wholeHits > 0) {
      this.comboCount     += wholeHits;
      this.fractionalHits -= wholeHits;
    }

    const newMultiplier = this._calcMultiplier();
    const multiplierChanged = newMultiplier !== this.multiplier;
    this.multiplier = newMultiplier;

    const payload: ComboPayload = {
      count:      this.comboCount,
      multiplier: this.multiplier,
      position,
    };
    EventBus.emit(GameEvent.COMBO_INCREMENT, payload);

    if (multiplierChanged) {
      EventBus.emit(GameEvent.MULTIPLIER_CHANGE, { multiplier: this.multiplier, position });
    }

    // Reschedule the break timer
    this._rescheduleBreakTimer();
  }

  private _calcMultiplier(): number {
    for (const [threshold, mult] of this.THRESHOLDS) {
      if (this.comboCount >= threshold) return mult;
    }
    return 1;
  }

  private _break(): void {
    this._cancelBreakTimer();
    if (this.comboCount > 0 || this.fractionalHits > 0) {
      EventBus.emit(GameEvent.COMBO_BREAK, { count: this.comboCount });
    }
    this.comboCount     = 0;
    this.multiplier     = 1;
    this.fractionalHits = 0;
    this.lastHitTime    = 0;
  }

  private _rescheduleBreakTimer(): void {
    this._cancelBreakTimer();
    this.breakTimer = setTimeout(() => {
      this._break();
    }, GAME_CONFIG.combo.window);
  }

  private _cancelBreakTimer(): void {
    if (this.breakTimer !== null) {
      clearTimeout(this.breakTimer);
      this.breakTimer = null;
    }
  }
}
