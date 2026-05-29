import * as Phaser from 'phaser';
import { EventBus } from './EventBus';
import {
  GameEvent,
  DashPayload,
  HitPayload,
  ComboPayload,
  ShakePayload,
} from '../config/types';
import { GAME_CONFIG } from '../config/GameConfig';

// ─────────────────────────────────────────────────────────────────────────────
// CameraManager — smooth follow, screen shake, dynamic zoom, flash, slow-mo.
// ─────────────────────────────────────────────────────────────────────────────
export class CameraManager {
  private scene: Phaser.Scene;
  private cam!: Phaser.Cameras.Scene2D.Camera;
  private target: Phaser.GameObjects.GameObject | null = null;

  // Shake state
  private shakeIntensity = 0;
  private shakeDuration  = 0;
  private shakeTimer     = 0;
  private shakeOffsetX   = 0;
  private shakeOffsetY   = 0;

  // Current combo count — injected from events to scale shake
  private comboCount = 0;

  // Slow-motion restore timer handle
  private slowMotionTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  init(target: Phaser.GameObjects.GameObject): void {
    this.target = target;
    this.cam = this.scene.cameras.main;

    // Start at default zoom
    this.cam.setZoom(GAME_CONFIG.camera.zoomDefault);

    this._bindEvents();
  }

  private _bindEvents(): void {
    (EventBus as any).on(GameEvent.SCREEN_SHAKE, (p: ShakePayload) => {
      if (p) this.shake(p.intensity, p.duration);
    }, this);

    (EventBus as any).on(GameEvent.SLOW_MOTION_START, () => {
      this.setSlowMotion(true);
    }, this);

    (EventBus as any).on(GameEvent.PLAYER_DASH, (p: DashPayload) => {
      if (p) this.zoomTo(GAME_CONFIG.camera.zoomDash, 150);
    }, this);

    (EventBus as any).on(GameEvent.PLAYER_BOUNCE, (p: HitPayload) => {
      this.zoomTo(GAME_CONFIG.camera.zoomDefault, 200);
      const intensity = 3 + (p?.comboCount ?? 0) * 0.5;
      this.shake(intensity, 200);
    }, this);

    (EventBus as any).on(GameEvent.PLAYER_DIED, () => {
      this.shake(15, 600);
      this.flash(0xff0000, 300);
    }, this);

    (EventBus as any).on(GameEvent.COMBO_INCREMENT, (p: ComboPayload) => {
      this.comboCount = p?.count ?? 0;
      if (this.comboCount >= 5) {
        this.flash(0xffff00, 100);
      }
    }, this);

    (EventBus as any).on(GameEvent.COMBO_BREAK, () => {
      this.comboCount = 0;
    }, this);
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  update(delta: number): void {
    this._updateFollow();
    this._updateShake(delta);
  }

  private _updateFollow(): void {
    if (!this.target || !this.cam) return;

    const go = this.target as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject;
    if (!('y' in go)) return;

    const lerp = GAME_CONFIG.camera.followLerp;
    const targetY = (go as unknown as { y: number }).y;

    // Only follow Y; X stays centred on the world
    const currentScrollY = this.cam.scrollY;
    const halfH = this.cam.height / 2 / this.cam.zoom;
    const desiredScrollY = targetY - halfH;

    this.cam.scrollY = currentScrollY + (desiredScrollY - currentScrollY) * lerp;
  }

  private _updateShake(delta: number): void {
    if (this.shakeTimer <= 0) {
      if (this.shakeOffsetX !== 0 || this.shakeOffsetY !== 0) {
        // Remove leftover offset
        this.cam.x -= this.shakeOffsetX;
        this.cam.y -= this.shakeOffsetY;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
      return;
    }

    this.shakeTimer -= delta;

    // Remove previous offset before applying new one
    this.cam.x -= this.shakeOffsetX;
    this.cam.y -= this.shakeOffsetY;

    const decay = GAME_CONFIG.camera.shakeDecay;
    this.shakeIntensity *= decay;

    this.shakeOffsetX = (Math.random() * 2 - 1) * this.shakeIntensity;
    this.shakeOffsetY = (Math.random() * 2 - 1) * this.shakeIntensity;

    this.cam.x += this.shakeOffsetX;
    this.cam.y += this.shakeOffsetY;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Trigger custom screen shake. Intensity is multiplied by combo for stronger feel.
   */
  shake(intensity: number, duration: number): void {
    const comboMult = 1 + Math.min(this.comboCount, 20) * 0.05;
    this.shakeIntensity = intensity * comboMult;
    this.shakeDuration  = duration;
    this.shakeTimer     = duration;
  }

  /**
   * Enter or exit slow motion. Auto-restores after GAME_CONFIG.fx.slowMotionDuration ms.
   */
  setSlowMotion(active: boolean): void {
    if (active) {
      const scale = GAME_CONFIG.fx.slowMotionScale;
      this.scene.physics.world.timeScale = 1 / scale; // arcade physics timeScale is inverse
      this.scene.time.timeScale = scale;

      // Clear any pending restore
      if (this.slowMotionTimer) {
        this.slowMotionTimer.destroy();
        this.slowMotionTimer = null;
      }

      this.slowMotionTimer = this.scene.time.addEvent({
        delay: GAME_CONFIG.fx.slowMotionDuration,
        callback: () => {
          this.setSlowMotion(false);
          EventBus.emit(GameEvent.SLOW_MOTION_END);
        },
        callbackScope: this,
      });
    } else {
      this.scene.physics.world.timeScale = 1;
      this.scene.time.timeScale = 1;
    }
  }

  zoomTo(zoom: number, duration: number): void {
    this.cam.zoomTo(zoom, duration, 'Linear', true);
  }

  flash(color: number, duration: number): void {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8)  & 0xff;
    const b =  color        & 0xff;
    this.cam.flash(duration, r, g, b, false);
  }

  // ── Teardown ──────────────────────────────────────────────────────────────

  destroy(): void {
    (EventBus as any).off(GameEvent.SCREEN_SHAKE,     undefined, this);
    (EventBus as any).off(GameEvent.SLOW_MOTION_START,undefined, this);
    (EventBus as any).off(GameEvent.PLAYER_DASH,      undefined, this);
    (EventBus as any).off(GameEvent.PLAYER_BOUNCE,    undefined, this);
    (EventBus as any).off(GameEvent.PLAYER_DIED,      undefined, this);
    (EventBus as any).off(GameEvent.COMBO_INCREMENT,  undefined, this);
    (EventBus as any).off(GameEvent.COMBO_BREAK,      undefined, this);

    if (this.slowMotionTimer) {
      this.slowMotionTimer.destroy();
      this.slowMotionTimer = null;
    }

    // Restore any leftover shake offset
    if (this.cam) {
      this.cam.x -= this.shakeOffsetX;
      this.cam.y -= this.shakeOffsetY;
    }
  }
}
