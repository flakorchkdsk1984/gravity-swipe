import Phaser from 'phaser';
import { EventBus } from './EventBus';
import { GameEvent, Vec2, PowerType } from '../config/types';
import { GAME_CONFIG, COLORS, POWER_COLORS } from '../config/GameConfig';

const MAX_CHARGE_TIME = GAME_CONFIG.physics.maxChargeTime;

export class InputManager {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;

  private activePowerColor: number = COLORS.uiCharge; // default cyan

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

  setActivePower(type: PowerType | null): void {
    if (type && POWER_COLORS[type]) {
      this.activePowerColor = POWER_COLORS[type];
    } else {
      this.activePowerColor = COLORS.uiCharge; // cyan default
    }
  }

  private _drawAimIndicator(charge: number): void {
    const gfx = this.graphics;
    gfx.clear();

    const dx = this.currentX - this.startX;
    const dy = this.currentY - this.startY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 5) return;

    const nx = dx / len;
    const ny = dy / len;

    const baseColor = this.activePowerColor;
    const alpha = 0.4 + charge * 0.6;
    const arrowLen = 90 + charge * 140;

    // ── 1. LASER BEAM — outer glow (wide, semi-transparent) ──────────────────
    gfx.lineStyle(8, baseColor, alpha * 0.15);
    gfx.beginPath();
    gfx.moveTo(this.startX, this.startY);
    gfx.lineTo(this.startX + nx * arrowLen, this.startY + ny * arrowLen);
    gfx.strokePath();

    // ── 2. LASER BEAM — mid glow ──────────────────────────────────────────────
    gfx.lineStyle(4, baseColor, alpha * 0.35);
    gfx.beginPath();
    gfx.moveTo(this.startX, this.startY);
    gfx.lineTo(this.startX + nx * arrowLen, this.startY + ny * arrowLen);
    gfx.strokePath();

    // ── 3. LASER BEAM — core (thin, bright) ──────────────────────────────────
    gfx.lineStyle(1.5, 0xffffff, alpha * 0.9);
    gfx.beginPath();
    gfx.moveTo(this.startX, this.startY);
    gfx.lineTo(this.startX + nx * arrowLen, this.startY + ny * arrowLen);
    gfx.strokePath();

    // ── 4. ENERGY SEGMENTS — pulsing dashes along beam ───────────────────────
    const segCount = Math.floor(3 + charge * 5);
    for (let i = 0; i < segCount; i++) {
      const t = (i / segCount) * 0.85 + 0.05;
      const sx = this.startX + nx * arrowLen * t;
      const sy = this.startY + ny * arrowLen * t;
      const segAlpha = alpha * (0.3 + (1 - t) * 0.4);
      const segR = 1.5 + charge * 2;
      gfx.fillStyle(0xffffff, segAlpha);
      gfx.fillCircle(sx, sy, segR);
    }

    // ── 5. ARROWHEAD — diamond tip ────────────────────────────────────────────
    const tipX = this.startX + nx * arrowLen;
    const tipY = this.startY + ny * arrowLen;
    const headSize = 12 + charge * 10;
    const px = -ny; // perpendicular
    const py = nx;

    // Outer glow around tip
    gfx.fillStyle(baseColor, alpha * 0.3);
    gfx.fillCircle(tipX, tipY, headSize * 1.4);

    // Diamond arrowhead
    gfx.fillStyle(baseColor, alpha);
    gfx.fillTriangle(
      tipX, tipY,
      tipX - nx * headSize + px * headSize * 0.45,
      tipY - ny * headSize + py * headSize * 0.45,
      tipX - nx * headSize - px * headSize * 0.45,
      tipY - ny * headSize - py * headSize * 0.45,
    );
    // Bright core of arrowhead
    gfx.fillStyle(0xffffff, alpha * 0.7);
    gfx.fillTriangle(
      tipX, tipY,
      tipX - nx * headSize * 0.5 + px * headSize * 0.2,
      tipY - ny * headSize * 0.5 + py * headSize * 0.2,
      tipX - nx * headSize * 0.5 - px * headSize * 0.2,
      tipY - ny * headSize * 0.5 - py * headSize * 0.2,
    );

    // ── 6. CHARGE RING — concentric rings at origin ───────────────────────────
    const ringR1 = 18 + charge * 22;
    const ringR2 = ringR1 + 5 + charge * 8;

    // Outer glow ring
    gfx.lineStyle(4, baseColor, alpha * 0.2);
    gfx.strokeCircle(this.startX, this.startY, ringR2);

    // Inner ring
    gfx.lineStyle(2, baseColor, alpha * 0.7);
    gfx.strokeCircle(this.startX, this.startY, ringR1);

    // Crosshair lines on ring
    const crossLen = 6 + charge * 4;
    gfx.lineStyle(1.5, 0xffffff, alpha * 0.8);
    // top
    gfx.lineBetween(this.startX, this.startY - ringR1 - crossLen, this.startX, this.startY - ringR1 + crossLen * 0.3);
    // bottom
    gfx.lineBetween(this.startX, this.startY + ringR1 - crossLen * 0.3, this.startX, this.startY + ringR1 + crossLen);
    // left
    gfx.lineBetween(this.startX - ringR1 - crossLen, this.startY, this.startX - ringR1 + crossLen * 0.3, this.startY);
    // right
    gfx.lineBetween(this.startX + ringR1 - crossLen * 0.3, this.startY, this.startX + ringR1 + crossLen, this.startY);

    // Center dot
    gfx.fillStyle(baseColor, alpha);
    gfx.fillCircle(this.startX, this.startY, 3 + charge * 3);

    // Full charge flash: white pulse at 100%
    if (charge >= 0.95) {
      gfx.fillStyle(0xffffff, 0.15);
      gfx.fillCircle(this.startX, this.startY, ringR2 * 1.5);
    }
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
