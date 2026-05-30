import Phaser from 'phaser';
import { EventBus } from '../systems/EventBus';
import { GameEvent, Vec2, PropulsionType, PowerType } from '../config/types';
import { GAME_CONFIG, COLORS, POWER_COLORS } from '../config/GameConfig';

// Trail entry
interface TrailPoint { x: number; y: number; age: number }

export class Player extends Phaser.GameObjects.Container {
  // Physics body
  declare body: Phaser.Physics.Arcade.Body;

  private gfx!: Phaser.GameObjects.Graphics;
  private trailGfx!: Phaser.GameObjects.Graphics;

  private trail: TrailPoint[] = [];
  private readonly TRAIL_MAX = GAME_CONFIG.fx.trailLength;
  private readonly TRAIL_INTERVAL = 16; // ms between trail points
  private trailTimer = 0;

  private _isDashing = false;
  private _isAlive = true;
  private _speed = 0;

  private currentColor     = COLORS.player;
  private currentGlowColor = COLORS.playerGlow;
  private currentTrailColor = COLORS.trail;
  private propulsionType   = PropulsionType.DEFAULT;

  // Gravity drift state
  private driftActive  = false;
  private driftDirX    = 0;
  private driftDirY    = 0;
  private driftTimer   = 0;
  private readonly DRIFT_DURATION = 1500; // ms
  private readonly DRIFT_FORCE    = 180;

  // Orbit shot state
  private orbitActive  = false;
  private orbitTimer   = 0;
  private readonly ORBIT_DURATION = 500;
  private readonly ORBIT_RATE     = 15 * (Math.PI / 180); // 15° per ORBIT_DURATION

  // Bounce count for BOUNCER
  private bounceCount      = 0;
  private readonly MAX_BOUNCES = 3;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Trail graphics (drawn behind everything)
    this.trailGfx = scene.add.graphics().setDepth(4);
    scene.add.existing(this);

    // Player graphics
    this.gfx = scene.add.graphics();
    this.add(this.gfx);

    this._drawPlayer();

    // Enable arcade physics on the container
    scene.physics.world.enable(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const r = GAME_CONFIG.physics.playerRadius;
    body.setCircle(r, -r, -r);
    body.setMaxVelocity(GAME_CONFIG.physics.dashMaxSpeed, GAME_CONFIG.physics.dashMaxSpeed);
    body.setDragX(0);
    body.setDragY(0);
    body.setGravityY(0);
    body.setCollideWorldBounds(true);
    body.setBounce(GAME_CONFIG.physics.bounceRestitution, GAME_CONFIG.physics.bounceRestitution);

    // Listen for release to dash
    EventBus.on(GameEvent.CHARGE_RELEASE, this._onRelease, this);
  }

  // ── Drawing ──────────────────────────────────────────────────────────────

  private _drawPlayer(chargeLevel = 0): void {
    const gfx = this.gfx;
    gfx.clear();
    const r = GAME_CONFIG.physics.playerRadius;

    // Outer glow
    const glowR = r + 6 + chargeLevel * 10;
    gfx.fillStyle(this.currentGlowColor, 0.25 + chargeLevel * 0.2);
    gfx.fillCircle(0, 0, glowR);

    // Mid glow ring
    gfx.fillStyle(this.currentGlowColor, 0.4);
    gfx.fillCircle(0, 0, r + 3);

    // Core
    gfx.fillStyle(this.currentColor, 1);
    gfx.fillCircle(0, 0, r);

    // Specular highlight
    gfx.fillStyle(0xffffff, 0.6);
    gfx.fillCircle(-r * 0.3, -r * 0.3, r * 0.3);
  }

  // ── Update ───────────────────────────────────────────────────────────────

  override update(delta: number, chargeLevel = 0): void {
    if (!this._isAlive) return;

    const body = this.body as Phaser.Physics.Arcade.Body;

    // Apply friction when not dashing
    if (!this._isDashing) {
      if (this.propulsionType === PropulsionType.ICE_GLIDE) {
        body.velocity.x *= 0.995;
        body.velocity.y *= 0.995;
      } else {
        body.velocity.x *= GAME_CONFIG.physics.friction;
        body.velocity.y *= GAME_CONFIG.physics.friction;
      }
    }

    const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
    this._speed = speed;
    if (this._isDashing && speed < 50) {
      this._isDashing = false;
    }

    // Gravity drift — continuous force in aim direction
    if (this.driftActive) {
      this.driftTimer += delta;
      if (this.driftTimer >= this.DRIFT_DURATION) {
        this.driftActive = false;
      } else {
        const t = 1 - this.driftTimer / this.DRIFT_DURATION;
        body.velocity.x += this.driftDirX * this.DRIFT_FORCE * t * (delta / 16);
        body.velocity.y += this.driftDirY * this.DRIFT_FORCE * t * (delta / 16);
      }
    }

    // Orbit shot — rotate velocity over time
    if (this.orbitActive) {
      this.orbitTimer += delta;
      if (this.orbitTimer >= this.ORBIT_DURATION) {
        this.orbitActive = false;
      } else {
        const rotRate = this.ORBIT_RATE * (delta / this.ORBIT_DURATION);
        const vx = body.velocity.x;
        const vy = body.velocity.y;
        const cos = Math.cos(rotRate);
        const sin = Math.sin(rotRate);
        body.velocity.x = vx * cos - vy * sin;
        body.velocity.y = vx * sin + vy * cos;
      }
    }

    // Trail
    this.trailTimer += delta;
    if (this.trailTimer >= this.TRAIL_INTERVAL && speed > 20) {
      this.trailTimer = 0;
      this.trail.push({ x: this.x, y: this.y, age: 0 });
      if (this.trail.length > this.TRAIL_MAX) this.trail.shift();
    }

    // Age trail points
    for (const pt of this.trail) pt.age += delta;

    this._drawTrail();
    this._drawPlayer(chargeLevel);
  }

  private _drawTrail(): void {
    this.trailGfx.clear();
    const maxAge = 300; // ms
    const r = GAME_CONFIG.physics.playerRadius;
    for (let i = 0; i < this.trail.length; i++) {
      const pt = this.trail[i];
      const t = 1 - pt.age / maxAge;
      if (t <= 0) continue;
      const dotR = r * t * 0.8;
      this.trailGfx.fillStyle(this.currentTrailColor, t * 0.6);
      this.trailGfx.fillCircle(pt.x, pt.y, dotR);

      if (this.propulsionType === PropulsionType.PHASE) {
        this.trailGfx.lineStyle(2, this.currentTrailColor, t * 0.3);
        this.trailGfx.strokeCircle(pt.x, pt.y, r * 1.8);
      }

      if (this.propulsionType === PropulsionType.ORBIT_SHOT) {
        const offsetX = Math.cos(i * 0.5) * 4;
        const offsetY = Math.sin(i * 0.5) * 4;
        this.trailGfx.fillStyle(this.currentTrailColor, t * 0.4);
        this.trailGfx.fillCircle(pt.x + offsetX, pt.y + offsetY, dotR * 0.5);
      }
    }
  }

  // ── Dash ─────────────────────────────────────────────────────────────────

  private _onRelease(payload: { chargeLevel: number; aimDirection: Vec2; speed: number }): void {
    if (!this._isAlive) return;
    const { aimDirection, speed } = payload;
    this.executeDash(aimDirection.x, aimDirection.y, speed);
  }

  executeDash(dirX: number, dirY: number, speed: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    let finalSpeed = speed;
    let finalDirX = dirX;
    let finalDirY = dirY;

    switch (this.propulsionType) {
      case PropulsionType.ROCKET:
        finalSpeed = speed * 1.8;
        break;

      case PropulsionType.LIGHTNING: {
        // Teleport 200px in aim direction, then smaller velocity
        this.x += dirX * 200;
        this.y += dirY * 200;
        finalSpeed = speed * 0.4;
        break;
      }

      case PropulsionType.GRAVITY_DRIFT:
        finalSpeed = speed * 0.6;
        this.driftActive = true;
        this.driftDirX   = dirX;
        this.driftDirY   = dirY;
        this.driftTimer  = 0;
        break;

      case PropulsionType.ICE_GLIDE: {
        // Snap direction to nearest 45°
        const angle   = Math.atan2(dirY, dirX);
        const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        finalDirX = Math.cos(snapped);
        finalDirY = Math.sin(snapped);
        finalSpeed = speed * 1.1;
        break;
      }

      case PropulsionType.ORBIT_SHOT:
        this.orbitActive = true;
        this.orbitTimer  = 0;
        break;
    }

    body.setVelocity(finalDirX * finalSpeed, finalDirY * finalSpeed);
    this._isDashing = true;

    EventBus.emit(GameEvent.PLAYER_DASH, {
      position:   { x: this.x, y: this.y },
      direction:  { x: finalDirX, y: finalDirY },
      speed:      finalSpeed,
      chargeLevel: finalSpeed / GAME_CONFIG.physics.dashMaxSpeed,
    });
  }

  // Called by PhysicsManager when bounce occurs
  onBounce(normal: Vec2): void {
    if (this.propulsionType === PropulsionType.BOUNCER && this.bounceCount < this.MAX_BOUNCES) {
      this.bounceCount++;
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.velocity.x *= 1.5;
      body.velocity.y *= 1.5;
    }

    EventBus.emit(GameEvent.PLAYER_BOUNCE, {
      position: { x: this.x, y: this.y },
      velocity: {
        x: (this.body as Phaser.Physics.Arcade.Body).velocity.x,
        y: (this.body as Phaser.Physics.Arcade.Body).velocity.y,
      },
      normal,
    });
    // Brief white flash on bounce
    this.scene.tweens.add({
      targets: this.gfx,
      alpha: { from: 1, to: 0.3 },
      duration: 60,
      yoyo: true,
    });
  }

  die(): void {
    if (!this._isAlive) return;
    this._isAlive = false;
    this._isDashing = false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    this.scene.tweens.add({
      targets: this,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => { this.setVisible(false); },
    });

    EventBus.emit(GameEvent.PLAYER_DIED, { position: { x: this.x, y: this.y } });
  }

  respawn(x: number, y: number): void {
    this.resetPower();
    this._isAlive   = true;
    this._isDashing = false;
    this.trail      = [];
    this.setPosition(x, y);
    this.setVisible(true);
    this.setAlpha(1);
    this.setScale(1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this._drawPlayer();
  }

  getPosition(): Vec2 { return { x: this.x, y: this.y }; }
  isAlive(): boolean { return this._isAlive; }
  getSpeed(): number { return this._speed; }

  applyPower(powerType: PowerType): void {
    const colorMap = POWER_COLORS as Record<string, number>;
    this.currentColor      = colorMap[powerType] ?? COLORS.player;
    this.currentGlowColor  = this.currentColor;
    this.currentTrailColor = this.currentColor;

    const propMap: Record<string, PropulsionType> = {
      [PowerType.SPEED_BOOST]: PropulsionType.ROCKET,
      [PowerType.SHIELD]:      PropulsionType.BOUNCER,
      [PowerType.SCORE_X2]:    PropulsionType.LIGHTNING,
      [PowerType.SLOW_EXTEND]: PropulsionType.GRAVITY_DRIFT,
      [PowerType.FREEZE]:      PropulsionType.ICE_GLIDE,
      [PowerType.GHOST]:       PropulsionType.PHASE,
      [PowerType.MAGNET]:      PropulsionType.ORBIT_SHOT,
    };
    this.propulsionType = propMap[powerType] ?? PropulsionType.DEFAULT;

    this.driftActive = false;
    this.orbitActive = false;
    this.bounceCount = 0;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.propulsionType === PropulsionType.ICE_GLIDE) {
      body.setDragX(0.02);
      body.setDragY(0.02);
    } else {
      body.setDragX(0);
      body.setDragY(0);
    }

    this.setAlpha(this.propulsionType === PropulsionType.PHASE ? 0.65 : 1.0);

    EventBus.emit(GameEvent.PLAYER_COLOR_CHANGE, { powerType, color: this.currentColor });
    this._drawPlayer(0);
  }

  resetPower(): void {
    this.currentColor      = COLORS.player;
    this.currentGlowColor  = COLORS.playerGlow;
    this.currentTrailColor = COLORS.trail;
    this.propulsionType    = PropulsionType.DEFAULT;
    this.driftActive       = false;
    this.orbitActive       = false;
    this.bounceCount       = 0;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setDragX(0);
    body.setDragY(0);
    this.setAlpha(1.0);
    this._drawPlayer(0);
  }

  override destroy(): void {
    EventBus.off(GameEvent.CHARGE_RELEASE, this._onRelease, this);
    this.trailGfx.destroy();
    super.destroy();
  }
}
