import Phaser from 'phaser';
import { EventBus } from '../systems/EventBus';
import { GameEvent, EnemyConfig, EnemyType } from '../config/types';

/** Neon palette for enemy types */
const EC = {
  static:       0xff8800,
  staticGlow:   0xff4400,
  drifter:      0xff44cc,
  drifterGlow:  0xaa0088,
  orbiter:      0xffdd00,
  orbiterGlow:  0xffaa00,
};

export class Enemy extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  readonly enemyType!: EnemyType;

  private hp = 1;
  private pointValue = 100;

  // Two graphics layers: glow + body
  private glowGfx!: Phaser.GameObjects.Graphics;
  private bodyGfx!: Phaser.GameObjects.Graphics;

  private _isActive = true;
  private pulseTween?: Phaser.Tweens.Tween;

  // DRIFTER state
  private driftTime     = 0;
  private driftBaseX    = 0;
  private driftAmplitude = 60;

  // ORBITER state
  private orbitAngle   = 0;
  private orbitCenterX = 0;
  private orbitCenterY = 0;
  private orbitRadius  = 60;
  private orbitSpeed   = 1.5;

  constructor(scene: Phaser.Scene, config: EnemyConfig) {
    super(scene, config.x, config.y);
    this.glowGfx = scene.add.graphics();
    this.bodyGfx = scene.add.graphics();
    this.add([this.glowGfx, this.bodyGfx]);
    scene.add.existing(this);
    scene.physics.world.enable(this);
    this.reset(config);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  reset(config: EnemyConfig): void {
    this._isActive = true;
    (this as { enemyType: EnemyType }).enemyType = config.type;
    this.hp         = config.hp;
    this.pointValue = config.pointValue;

    this.setPosition(config.x, config.y);
    this.setRotation(0).setScale(1);
    this.setActive(true).setVisible(true).setAlpha(1);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.enable = true;

    // Drifter setup
    this.driftTime      = Math.random() * Math.PI * 2;
    this.driftBaseX     = config.x;
    this.driftAmplitude = 60;

    // Orbiter setup
    this.orbitCenterX = config.x;
    this.orbitCenterY = config.y;
    this.orbitRadius  = config.orbitRadius ?? 60;
    this.orbitSpeed   = (config.speed ?? 1.5) * (Math.random() < 0.5 ? 1 : -1);
    this.orbitAngle   = Math.random() * Math.PI * 2;
    // Start at orbit position
    if (config.type === EnemyType.ORBITER) {
      this.x = this.orbitCenterX + Math.cos(this.orbitAngle) * this.orbitRadius;
      this.y = this.orbitCenterY + Math.sin(this.orbitAngle) * this.orbitRadius;
    }

    this._stopPulse();
    this._draw();
  }

  takeDamage(amount = 1): boolean {
    if (!this._isActive) return false;
    this.hp -= amount;

    this.scene.tweens.add({
      targets: this.bodyGfx,
      alpha: { from: 1, to: 0.1 },
      duration: 60, yoyo: true,
    });

    if (this.hp <= 0) {
      this._isActive = false;
      this._spawnParticles();
      EventBus.emit(GameEvent.ENEMY_DESTROY, {
        position:   { x: this.x, y: this.y },
        pointValue: this.pointValue,
        type:       this.enemyType,
      });
      this.setActive(false).setVisible(false);
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
      return true;
    }

    EventBus.emit(GameEvent.ENEMY_HIT, {
      position:   { x: this.x, y: this.y },
      targetType: 'enemy',
    });
    return false;
  }

  override update(delta: number, _playerX = 0, _playerY = 0): void {
    if (!this._isActive) return;

    if (this.enemyType === EnemyType.DRIFTER) {
      this.driftTime += delta * 0.0018;
      this.x = this.driftBaseX + Math.sin(this.driftTime) * this.driftAmplitude;
      // Tilt toward direction of movement
      this.rotation = Math.cos(this.driftTime) * 0.28;
      (this.body as Phaser.Physics.Arcade.Body).reset(this.x, this.y);
    }

    if (this.enemyType === EnemyType.ORBITER) {
      this.orbitAngle += this.orbitSpeed * delta * 0.001;
      this.x = this.orbitCenterX + Math.cos(this.orbitAngle) * this.orbitRadius;
      this.y = this.orbitCenterY + Math.sin(this.orbitAngle) * this.orbitRadius;
      (this.body as Phaser.Physics.Arcade.Body).reset(this.x, this.y);
    }
  }

  isActive(): boolean { return this._isActive; }

  override destroy(fromScene?: boolean): void {
    this._stopPulse();
    super.destroy(fromScene);
  }

  // ── Drawing ─────────────────────────────────────────────────────────────────

  private _draw(): void {
    this.glowGfx.clear();
    this.bodyGfx.clear();
    this._stopPulse();

    switch (this.enemyType) {
      case EnemyType.STATIC:  this._drawStatic();  break;
      case EnemyType.DRIFTER: this._drawDrifter(); break;
      case EnemyType.ORBITER: this._drawOrbiter(); break;
    }
  }

  private _drawStatic(): void {
    const r = 16;
    // Double-ring glow
    this.glowGfx.fillStyle(EC.staticGlow, 0.12);
    this.glowGfx.fillCircle(0, 0, r + 18);
    this.glowGfx.fillStyle(EC.static, 0.22);
    this.glowGfx.fillCircle(0, 0, r + 9);

    // Body
    this.bodyGfx.fillStyle(EC.static, 0.94);
    this.bodyGfx.fillCircle(0, 0, r);
    // Specular
    this.bodyGfx.fillStyle(0xffcc00, 0.5);
    this.bodyGfx.fillCircle(-r * 0.28, -r * 0.28, r * 0.3);
    // Ring
    this.bodyGfx.lineStyle(2, 0xffcc44, 0.9);
    this.bodyGfx.strokeCircle(0, 0, r);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(r, -r, -r);

    // Scale pulse via tween (avoids per-frame redraw)
    this.pulseTween = this.scene.tweens.add({
      targets: this, scaleX: 1.12, scaleY: 1.12,
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  private _drawDrifter(): void {
    // Arrow / triangle pointing up
    this.glowGfx.fillStyle(EC.drifterGlow, 0.18);
    this.glowGfx.fillCircle(0, 0, 22);

    // Pink triangle
    this.bodyGfx.fillStyle(EC.drifter, 0.95);
    this.bodyGfx.fillTriangle(0, -18, -14, 14, 14, 14);
    // Inner lighter triangle
    this.bodyGfx.fillStyle(0xff99ee, 0.45);
    this.bodyGfx.fillTriangle(0, -10, -7, 6, 7, 6);
    // Outline
    this.bodyGfx.lineStyle(1.5, 0xff88ee, 0.9);
    this.bodyGfx.strokePoints([
      { x: 0, y: -18 }, { x: -14, y: 14 }, { x: 14, y: 14 },
    ], true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(14, -14, -14);
  }

  private _drawOrbiter(): void {
    const r = 14;
    // Glow rings
    this.glowGfx.fillStyle(EC.orbiterGlow, 0.1);
    this.glowGfx.fillCircle(0, 0, r + 16);
    this.glowGfx.fillStyle(EC.orbiter, 0.2);
    this.glowGfx.fillCircle(0, 0, r + 8);

    // Body
    this.bodyGfx.fillStyle(EC.orbiter, 0.95);
    this.bodyGfx.fillCircle(0, 0, r);
    // Specular
    this.bodyGfx.fillStyle(0xffffaa, 0.5);
    this.bodyGfx.fillCircle(-r * 0.3, -r * 0.3, r * 0.35);
    // Star sparkle lines
    this.bodyGfx.lineStyle(1.5, 0xffffcc, 0.6);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      this.bodyGfx.beginPath();
      this.bodyGfx.moveTo(0, 0);
      this.bodyGfx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
      this.bodyGfx.strokePath();
    }
    this.bodyGfx.lineStyle(2, 0xffee44, 0.9);
    this.bodyGfx.strokeCircle(0, 0, r);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(r, -r, -r);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private _stopPulse(): void {
    if (this.pulseTween) { this.pulseTween.stop(); this.pulseTween = undefined; }
    this.setScale(1);
  }

  private _spawnParticles(): void {
    const color = {
      [EnemyType.STATIC]:  EC.static,
      [EnemyType.DRIFTER]: EC.drifter,
      [EnemyType.ORBITER]: EC.orbiter,
    }[this.enemyType];

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      const dist  = Phaser.Math.Between(24, 60);
      const size  = Phaser.Math.Between(3, 7);
      const chunk = this.scene.add.graphics();
      chunk.fillStyle(color, 1);
      chunk.fillCircle(0, 0, size);
      chunk.x = this.x; chunk.y = this.y;

      this.scene.tweens.add({
        targets: chunk,
        x: this.x + Math.cos(angle) * dist,
        y: this.y + Math.sin(angle) * dist,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: 300 + i * 30, ease: 'Quad.easeOut',
        onComplete: () => chunk.destroy(),
      });
    }
  }
}
