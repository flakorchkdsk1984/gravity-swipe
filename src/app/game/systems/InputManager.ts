import Phaser from 'phaser';
import { EventBus } from './EventBus';
import { GameEvent, Vec2 } from '../config/types';
import { GAME_CONFIG, COLORS } from '../config/GameConfig';

const MAX_CHARGE_TIME = GAME_CONFIG.physics.maxChargeTime;

export class InputManager {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;

  private isDown = false;
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;
  private chargeStartTime = 0;
  private chargeLevel = 0;
  private aimDir: Vec2 = { x: 0, y: -1 };

  // Prevent rapid re-fire
  private cooldown = 0;
  private readonly COOLDOWN_MS = 200;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(100).setScrollFactor(0);
    this._bindPointer();
  }

  // ── Pointer events ──────────────────────────────────────────────────────────

  private _bindPointer(): void {
    const { input } = this.scene;

    input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.cooldown > 0) return;
      this.isDown        = true;
      this.startX        = p.x;
      this.startY        = p.y;
      this.currentX      = p.x;
      this.currentY      = p.y;
      this.chargeStartTime = performance.now();
      this.chargeLevel   = 0;
      EventBus.emit(GameEvent.CHARGE_START, { x: p.x, y: p.y });
    });

    input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.isDown) return;
      this.currentX = p.x;
      this.currentY = p.y;
    });

    input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this._release(p.x, p.y);
    });

    input.on('pointercancel', (p: Phaser.Input.Pointer) => {
      this._release(p.x, p.y);
    });
  }

  private _release(x: number, y: number): void {
    if (!this.isDown) return;
    this.isDown = false;
    this.currentX = x;
    this.currentY = y;

    const charge = this._calcCharge();
    const dir    = this._calcAim();
    const speed  = Phaser.Math.Linear(
      GAME_CONFIG.physics.dashBaseSpeed,
      GAME_CONFIG.physics.dashMaxSpeed,
      charge,
    );

    this.chargeLevel = charge;
    this.aimDir      = dir;
    this.cooldown    = this.COOLDOWN_MS;

    EventBus.emit(GameEvent.CHARGE_RELEASE, {
      chargeLevel: charge,
      aimDirection: dir,
      speed,
    });

    this.graphics.clear();
  }

  // ── Per-frame update ────────────────────────────────────────────────────────

  update(delta: number): void {
    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - delta);
    }

    if (!this.isDown) {
      this.graphics.clear();
      return;
    }

    const charge = this._calcCharge();
    this.chargeLevel = charge;
    this.aimDir      = this._calcAim();

    EventBus.emit(GameEvent.CHARGE_UPDATE, { level: charge });
    this._drawAimIndicator(charge);
  }

  // ── Drawing ─────────────────────────────────────────────────────────────────

  private _drawAimIndicator(charge: number): void {
    const gfx = this.graphics;
    gfx.clear();

    const dx = this.currentX - this.startX;
    const dy = this.currentY - this.startY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 5) return;

    // Arrow from touch start toward aim direction
    const nx = dx / len;
    const ny = dy / len;

    // Color shifts cyan → white at full charge
    const alpha  = 0.5 + charge * 0.5;
    const color  = charge > 0.8 ? 0xffffff : COLORS.uiCharge;
    const arrowLen = 80 + charge * 120;

    // Dashed line segments
    gfx.lineStyle(2, color, alpha);
    const dashes = 8;
    for (let i = 0; i < dashes; i++) {
      const t0 = i / dashes;
      const t1 = (i + 0.55) / dashes;
      gfx.beginPath();
      gfx.moveTo(
        this.startX + nx * arrowLen * t0,
        this.startY + ny * arrowLen * t0,
      );
      gfx.lineTo(
        this.startX + nx * arrowLen * t1,
        this.startY + ny * arrowLen * t1,
      );
      gfx.strokePath();
    }

    // Arrowhead
    const tipX = this.startX + nx * arrowLen;
    const tipY = this.startY + ny * arrowLen;
    const headSize = 10 + charge * 8;
    gfx.fillStyle(color, alpha);
    gfx.fillTriangle(
      tipX, tipY,
      tipX - nx * headSize + ny * headSize * 0.5,
      tipY - ny * headSize - nx * headSize * 0.5,
      tipX - nx * headSize - ny * headSize * 0.5,
      tipY - ny * headSize + nx * headSize * 0.5,
    );

    // Charge ring around touch origin
    const ringRadius = 20 + charge * 30;
    gfx.lineStyle(2, color, alpha * 0.6);
    gfx.strokeCircle(this.startX, this.startY, ringRadius);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private _calcCharge(): number {
    const elapsed = performance.now() - this.chargeStartTime;
    return Math.min(1, elapsed / MAX_CHARGE_TIME);
  }

  private _calcAim(): Vec2 {
    const dx = this.currentX - this.startX;
    const dy = this.currentY - this.startY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 5) return { x: 0, y: -1 }; // default: up
    return { x: dx / len, y: dy / len };
  }

  getAimDirection(): Vec2 { return { ...this.aimDir }; }
  getChargeLevel(): number { return this.chargeLevel; }

  destroy(): void {
    this.scene.input.off('pointerdown');
    this.scene.input.off('pointermove');
    this.scene.input.off('pointerup');
    this.scene.input.off('pointercancel');
    this.graphics.destroy();
  }
}
