import Phaser from 'phaser';
import { EventBus } from './EventBus';
import { GameEvent, PowerPayload, PowerType } from '../config/types';
import { POWER_DURATIONS } from '../config/GameConfig';

interface ActivePowerEntry {
  expireAt: number;
  timerId?: Phaser.Time.TimerEvent;
}

export class PowerManager {
  private scene: Phaser.Scene;
  private activePowers = new Map<PowerType, ActivePowerEntry>();

  // State flags read by MainGameScene
  speedMultiplier     = 1.0;   // 1.5 when speed_boost active
  hasShield           = false;
  scoreMultiplierBonus = 1;    // 2 when score_x2 active
  isGhost             = false; // skip obstacle collisions
  isFreezeActive      = false; // obstacles stop moving
  isMagnetActive      = false; // attract nearby objects
  isSlowExtended      = false; // extends slow-motion duration

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    EventBus.on(GameEvent.POWER_COLLECTED, this._onPowerCollected, this);
    EventBus.on(GameEvent.GAME_RESTART,    this.reset,              this);
  }

  // ── Internal ─────────────────────────────────────────────────

  private _onPowerCollected(payload: PowerPayload): void {
    const { type } = payload;
    const duration = POWER_DURATIONS[type] ?? 0;

    // Cancel existing timer for this type if already active
    const existing = this.activePowers.get(type);
    if (existing?.timerId) {
      existing.timerId.remove(false);
    }

    // SHIELD has no timer — it's consumed on hit
    if (type === PowerType.SHIELD) {
      this.hasShield = true;
      this.activePowers.set(type, { expireAt: 0 });
      EventBus.emit(GameEvent.POWER_ACTIVATED, { type });
      return;
    }

    const expireAt = performance.now() + duration;
    const timerId  = this.scene.time.delayedCall(duration, () => this._expire(type));

    this.activePowers.set(type, { expireAt, timerId });
    this._applyEffect(type, true);
    EventBus.emit(GameEvent.POWER_ACTIVATED, { type });
  }

  private _applyEffect(type: PowerType, active: boolean): void {
    switch (type) {
      case PowerType.SPEED_BOOST:
        this.speedMultiplier = active ? 1.5 : 1.0;
        break;
      case PowerType.SCORE_X2:
        this.scoreMultiplierBonus = active ? 2 : 1;
        break;
      case PowerType.GHOST:
        this.isGhost = active;
        break;
      case PowerType.FREEZE:
        this.isFreezeActive = active;
        break;
      case PowerType.MAGNET:
        this.isMagnetActive = active;
        break;
      case PowerType.SLOW_EXTEND:
        this.isSlowExtended = active;
        break;
      default:
        break;
    }
  }

  private _expire(type: PowerType): void {
    this._applyEffect(type, false);
    this.activePowers.delete(type);
    EventBus.emit(GameEvent.POWER_EXPIRED, { type });
  }

  // ── Public API ───────────────────────────────────────────────

  /** Call from PhysicsManager when player takes a hit. Returns true if absorbed. */
  consumeShield(): boolean {
    if (!this.hasShield) return false;
    this.hasShield = false;
    this.activePowers.delete(PowerType.SHIELD);
    EventBus.emit(GameEvent.POWER_EXPIRED, { type: PowerType.SHIELD });
    return true;
  }

  getActivePowers(): PowerType[] {
    return [...this.activePowers.keys()];
  }

  reset(): void {
    // Cancel all active timers
    for (const entry of this.activePowers.values()) {
      entry.timerId?.remove(false);
    }
    this.activePowers.clear();

    this.speedMultiplier      = 1.0;
    this.hasShield            = false;
    this.scoreMultiplierBonus = 1;
    this.isGhost              = false;
    this.isFreezeActive       = false;
    this.isMagnetActive       = false;
    this.isSlowExtended       = false;
  }

  destroy(): void {
    this.reset();
    EventBus.off(GameEvent.POWER_COLLECTED, this._onPowerCollected, this);
    EventBus.off(GameEvent.GAME_RESTART,    this.reset,              this);
  }
}
