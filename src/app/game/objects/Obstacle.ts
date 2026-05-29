import Phaser from 'phaser';
import { EventBus } from '../systems/EventBus';
import { GameEvent, ObstacleConfig, ObstacleType } from '../config/types';

/** Neon color palette for obstacles */
const OC = {
  wall:       0xff4466,
  wallGlow:   0xff0044,
  bumper:     0x88ff00,
  bumperGlow: 0x44aa00,
  spinner:    0xff8800,
  platform:   0x4488cc,
  shield:     0xaa44ff,
  shieldGlow: 0x7700cc,
};

export class Obstacle extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  readonly obstacleType!: ObstacleType;

  private hp = 1;
  private maxHp = 1;
  private pointValue = 50;
  private cfg!: ObstacleConfig;

  // Two graphics layers: glow behind, body in front
  private glowGfx!: Phaser.GameObjects.Graphics;
  private bodyGfx!: Phaser.GameObjects.Graphics;

  // Per-type motion state
  private spinSpeed = 0;
  private moveSpeed = 0;
  private moveDir   = 1;
  private moveRange = 0;
  private moveOriginX = 0;
  private pulseTween?: Phaser.Tweens.Tween;
  private _isActive = true;

  constructor(scene: Phaser.Scene, config: ObstacleConfig) {
    super(scene, config.x, config.y);
    this.glowGfx = scene.add.graphics();
    this.bodyGfx = scene.add.graphics();
    this.add([this.glowGfx, this.bodyGfx]);
    scene.add.existing(this);
    scene.physics.world.enable(this);
    this.reset(config);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  reset(config: ObstacleConfig): void {
    this._isActive = true;
    this.cfg = { ...config };
    this.hp  = config.hp;
    this.maxHp = config.hp;
    this.pointValue = config.pointValue;

    // Bypass readonly for pool reuse
    (this as { obstacleType: ObstacleType }).obstacleType = config.type;

    this.setPosition(config.x, config.y);
    this.setRotation(0);
    this.setScale(1);
    this.setActive(true).setVisible(true).setAlpha(1);

    this.spinSpeed    = config.speed ?? 0;
    this.moveSpeed    = config.speed ?? 0;
    this.moveOriginX  = config.x;
    this.moveDir      = 1;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.allowGravity = false;
    body.enable = true;

    this._stopPulse();
    this._draw();
  }

  takeDamage(amount = 1): boolean {
    if (!this._isActive) return false;
    this.hp -= amount;

    // White flash
    this.scene.tweens.add({
      targets: this.bodyGfx,
      alpha: { from: 1, to: 0.1 },
      duration: 55,
      yoyo: true,
    });

    if (this.hp <= 0) {
      this._isActive = false;
      this._spawnParticles();
      EventBus.emit(GameEvent.OBSTACLE_DESTROY, {
        position:   { x: this.x, y: this.y },
        pointValue: this.pointValue,
        type:       this.obstacleType,
      });
      this.setActive(false).setVisible(false);
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
      return true;
    }

    EventBus.emit(GameEvent.OBSTACLE_HIT, {
      position:   { x: this.x, y: this.y },
      targetType: 'obstacle',
      velocity:   { x: 0, y: 0 },
      comboCount: 0,
    });

    // Redraw to show updated crack state
    this._draw();
    return false;
  }

  override update(delta: number): void {
    if (!this._isActive) return;

    if (this.obstacleType === ObstacleType.SPINNER && this.spinSpeed > 0) {
      this.rotation += this.spinSpeed * delta * 0.001;
    }

    if (this.obstacleType === ObstacleType.PLATFORM && this.moveSpeed > 0) {
      this.x += this.moveSpeed * this.moveDir * delta * 0.001 * 60;
      if (Math.abs(this.x - this.moveOriginX) > this.moveRange) {
        this.moveDir *= -1;
      }
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

    const c = this.cfg;
    const dmgFrac = this.hp / this.maxHp; // 1=full, 0=destroyed

    switch (c.type) {
      case ObstacleType.WALL_SEGMENT:   this._drawWall(c.width ?? 80, c.height ?? 20, dmgFrac); break;
      case ObstacleType.BUMPER:         this._drawBumper(c.radius ?? 26); break;
      case ObstacleType.SPINNER:        this._drawSpinner(c.width ?? 60, c.height ?? 14); break;
      case ObstacleType.PLATFORM:       this._drawPlatform(c.width ?? 100, c.height ?? 16); break;
      case ObstacleType.SHIELD:         this._drawShield(c.radius ?? 24); break;
    }
  }

  private _drawWall(w: number, h: number, dmgFrac: number): void {
    const crackLevel = this.maxHp - this.hp; // 0=pristine, 1=cracked, 2=heavy

    // Glow halo
    this.glowGfx.fillStyle(OC.wallGlow, 0.28);
    this.glowGfx.fillRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12);

    // Body – dims with damage
    this.bodyGfx.fillStyle(OC.wall, 0.9 - crackLevel * 0.12);
    this.bodyGfx.fillRect(-w / 2, -h / 2, w, h);

    // Top-edge shine
    this.bodyGfx.fillStyle(0xff88aa, 0.38);
    this.bodyGfx.fillRect(-w / 2, -h / 2, w, Math.max(2, h * 0.22));

    // Border
    this.bodyGfx.lineStyle(1.5, 0xff88aa, 0.9);
    this.bodyGfx.strokeRect(-w / 2, -h / 2, w, h);

    // Crack lines
    if (crackLevel >= 1) {
      this.bodyGfx.lineStyle(1.5, 0x110008, 0.95);
      this.bodyGfx.beginPath();
      this.bodyGfx.moveTo(-w * 0.18, -h / 2);
      this.bodyGfx.lineTo(-w * 0.08,  h * 0.15);
      this.bodyGfx.lineTo(-w * 0.28,  h / 2);
      this.bodyGfx.strokePath();
    }
    if (crackLevel >= 2) {
      this.bodyGfx.lineStyle(1.5, 0x110008, 0.95);
      this.bodyGfx.beginPath();
      this.bodyGfx.moveTo(w * 0.22, -h / 2);
      this.bodyGfx.lineTo(w * 0.12,  h * 0.3);
      this.bodyGfx.lineTo(w * 0.38,  h / 2);
      this.bodyGfx.strokePath();
      // Darken overlay
      this.bodyGfx.fillStyle(0x000000, 0.22);
      this.bodyGfx.fillRect(-w / 2, -h / 2, w, h);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(w, h);
    body.setOffset(-w / 2, -h / 2);
  }

  private _drawBumper(r: number): void {
    // Layered glow
    this.glowGfx.fillStyle(OC.bumper, 0.12);
    this.glowGfx.fillCircle(0, 0, r + 18);
    this.glowGfx.fillStyle(OC.bumper, 0.22);
    this.glowGfx.fillCircle(0, 0, r + 9);

    // Main circle
    this.bodyGfx.fillStyle(OC.bumper, 0.92);
    this.bodyGfx.fillCircle(0, 0, r);
    // Specular highlight
    this.bodyGfx.fillStyle(0xddffa0, 0.42);
    this.bodyGfx.fillCircle(-r * 0.27, -r * 0.27, r * 0.42);
    // Border
    this.bodyGfx.lineStyle(2, 0xbbff44, 0.95);
    this.bodyGfx.strokeCircle(0, 0, r);
    // Plus icon
    this.bodyGfx.lineStyle(1.5, 0xeeffaa, 0.55);
    this.bodyGfx.beginPath();
    this.bodyGfx.moveTo(-r * 0.55, 0); this.bodyGfx.lineTo(r * 0.55, 0);
    this.bodyGfx.moveTo(0, -r * 0.55); this.bodyGfx.lineTo(0, r * 0.55);
    this.bodyGfx.strokePath();

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(r, -r, -r);

    // Continuous scale pulse tween
    this.pulseTween = this.scene.tweens.add({
      targets: this, scaleX: 1.1, scaleY: 1.1,
      duration: 620, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  private _drawSpinner(w: number, h: number): void {
    const hw = w / 2, hh = h / 2;

    // Glow halo (diamond)
    this.glowGfx.fillStyle(OC.spinner, 0.22);
    this.glowGfx.fillPoints([
      { x: 0, y: -hh - 8 }, { x: hw + 8, y: 0 },
      { x: 0, y: hh + 8 },  { x: -hw - 8, y: 0 },
    ], true);

    // Outer diamond
    this.bodyGfx.fillStyle(OC.spinner, 0.92);
    this.bodyGfx.fillPoints([
      { x: 0, y: -hh }, { x: hw, y: 0 },
      { x: 0, y: hh },  { x: -hw, y: 0 },
    ], true);
    // Inner diamond
    this.bodyGfx.fillStyle(0xffcc44, 0.5);
    this.bodyGfx.fillPoints([
      { x: 0, y: -hh * 0.48 }, { x: hw * 0.48, y: 0 },
      { x: 0, y: hh * 0.48 },  { x: -hw * 0.48, y: 0 },
    ], true);
    // Outline
    this.bodyGfx.lineStyle(2, 0xffcc44, 0.9);
    this.bodyGfx.strokePoints([
      { x: 0, y: -hh }, { x: hw, y: 0 },
      { x: 0, y: hh },  { x: -hw, y: 0 },
    ], true);

    // Body is a square rotated 45°; use smaller rectangle for fairness
    const body = this.body as Phaser.Physics.Arcade.Body;
    const s = Math.min(w, h) * 0.66;
    body.setSize(s, s);
    body.setOffset(-s / 2, -s / 2);

    // Set platform moveRange so spinner doesn't drift
    this.moveRange = (this.cfg.width ?? 60) * 0.5;
  }

  private _drawPlatform(w: number, h: number): void {
    // Glow
    this.glowGfx.fillStyle(OC.platform, 0.2);
    this.glowGfx.fillRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10);

    // Body
    this.bodyGfx.fillStyle(OC.platform, 0.88);
    this.bodyGfx.fillRect(-w / 2, -h / 2, w, h);
    // Top shine
    this.bodyGfx.fillStyle(0x88ccff, 0.46);
    this.bodyGfx.fillRect(-w / 2, -h / 2, w, Math.max(2, h * 0.3));
    // Direction arrows
    this.bodyGfx.fillStyle(0xaaddff, 0.55);
    this.bodyGfx.fillTriangle(-w * 0.38, 0, -w * 0.26, -h * 0.38, -w * 0.26, h * 0.38);
    this.bodyGfx.fillTriangle( w * 0.38, 0,  w * 0.26, -h * 0.38,  w * 0.26, h * 0.38);
    // Border
    this.bodyGfx.lineStyle(1.5, 0x88bbff, 0.9);
    this.bodyGfx.strokeRect(-w / 2, -h / 2, w, h);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(w, h);
    body.setOffset(-w / 2, -h / 2);
    this.moveRange = w * 1.2;
  }

  private _drawShield(r: number): void {
    // Layered glow
    this.glowGfx.fillStyle(OC.shieldGlow, 0.1);
    this.glowGfx.fillCircle(0, 0, r + 20);
    this.glowGfx.fillStyle(OC.shield, 0.2);
    this.glowGfx.fillCircle(0, 0, r + 10);

    // Translucent outer ring
    this.bodyGfx.fillStyle(OC.shield, 0.32);
    this.bodyGfx.fillCircle(0, 0, r);
    // Solid inner core
    this.bodyGfx.fillStyle(OC.shield, 0.92);
    this.bodyGfx.fillCircle(0, 0, r * 0.7);
    // Specular
    this.bodyGfx.fillStyle(0xddaaff, 0.33);
    this.bodyGfx.fillCircle(-r * 0.2, -r * 0.2, r * 0.36);
    // Rings
    this.bodyGfx.lineStyle(2.5, 0xcc88ff, 0.95);
    this.bodyGfx.strokeCircle(0, 0, r);
    this.bodyGfx.lineStyle(1.5, 0xcc88ff, 0.65);
    this.bodyGfx.strokeCircle(0, 0, r * 0.7);
    // Cross
    this.bodyGfx.lineStyle(2, 0xeeccff, 0.7);
    this.bodyGfx.beginPath();
    this.bodyGfx.moveTo(0, -r * 0.5);  this.bodyGfx.lineTo(0, r * 0.5);
    this.bodyGfx.moveTo(-r * 0.5, 0);  this.bodyGfx.lineTo(r * 0.5, 0);
    this.bodyGfx.strokePath();

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(r, -r, -r);

    this.pulseTween = this.scene.tweens.add({
      targets: this, scaleX: 1.07, scaleY: 1.07,
      duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private _stopPulse(): void {
    if (this.pulseTween) { this.pulseTween.stop(); this.pulseTween = undefined; }
    this.setScale(1);
  }

  private _spawnParticles(): void {
    const color = {
      [ObstacleType.WALL_SEGMENT]: OC.wall,
      [ObstacleType.BUMPER]:       OC.bumper,
      [ObstacleType.SPINNER]:      OC.spinner,
      [ObstacleType.PLATFORM]:     OC.platform,
      [ObstacleType.SHIELD]:       OC.shield,
    }[this.obstacleType] ?? OC.wall;

    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
      const dist  = Phaser.Math.Between(28, 70);
      const size  = Phaser.Math.Between(4, 9);
      const chunk = this.scene.add.graphics();
      chunk.fillStyle(color, 1);
      chunk.fillRect(-size / 2, -size / 2, size, size);
      chunk.x = this.x; chunk.y = this.y;

      this.scene.tweens.add({
        targets: chunk,
        x: this.x + Math.cos(angle) * dist,
        y: this.y + Math.sin(angle) * dist,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: 320 + i * 35, ease: 'Quad.easeOut',
        onComplete: () => chunk.destroy(),
      });
    }
  }
}
