import * as Phaser from 'phaser';
import { EventBus } from './EventBus';
import { GameEvent, Vec2, DashPayload, HitPayload, ComboPayload } from '../config/types';
import { COLORS } from '../config/GameConfig';

// ─────────────────────────────────────────────────────────────────────────────
// ParticleManager — all particle effects for Gravity Swipe.
// Uses Phaser 3.60+ ParticleEmitter API. Textures are generated programmatically.
// ─────────────────────────────────────────────────────────────────────────────
export class ParticleManager {
  private scene: Phaser.Scene;

  // Texture keys
  private readonly TEX_DOT    = 'gs_particle_dot';
  private readonly TEX_SHARD  = 'gs_particle_shard';
  private readonly TEX_SPARK  = 'gs_particle_spark';
  private readonly TEX_GLOW   = 'gs_particle_glow';

  // Reusable emitters (long-lived)
  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Shockwave tweens list — kept so update() can skip them (tweens are self-managed)
  private shockwaves: Phaser.GameObjects.Graphics[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this._createTextures();
    this._createPersistentEmitters();
    this._bindEvents();
  }

  // ── Texture generation ────────────────────────────────────────────────────

  private _createTextures(): void {
    this._makeDotTexture();
    this._makeShardTexture();
    this._makeSparkTexture();
    this._makeGlowTexture();
  }

  private _makeDotTexture(): void {
    if (this.scene.textures.exists(this.TEX_DOT)) return;
    const gfx = this.scene.make.graphics({ x: 0, y: 0 }, false);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture(this.TEX_DOT, 8, 8);
    gfx.destroy();
  }

  private _makeShardTexture(): void {
    if (this.scene.textures.exists(this.TEX_SHARD)) return;
    const gfx = this.scene.make.graphics({ x: 0, y: 0 }, false);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillTriangle(4, 0, 0, 10, 8, 10);
    gfx.generateTexture(this.TEX_SHARD, 8, 10);
    gfx.destroy();
  }

  private _makeSparkTexture(): void {
    if (this.scene.textures.exists(this.TEX_SPARK)) return;
    const gfx = this.scene.make.graphics({ x: 0, y: 0 }, false);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillRect(0, 2, 12, 4);
    gfx.generateTexture(this.TEX_SPARK, 12, 8);
    gfx.destroy();
  }

  private _makeGlowTexture(): void {
    if (this.scene.textures.exists(this.TEX_GLOW)) return;
    const gfx = this.scene.make.graphics({ x: 0, y: 0 }, false);
    // Radial-ish glow: large soft circle
    gfx.fillStyle(0xffffff, 0.6);
    gfx.fillCircle(8, 8, 8);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(8, 8, 4);
    gfx.generateTexture(this.TEX_GLOW, 16, 16);
    gfx.destroy();
  }

  // ── Persistent emitters ───────────────────────────────────────────────────

  private _createPersistentEmitters(): void {
    this.trailEmitter = this.scene.add.particles(0, 0, this.TEX_DOT, {
      speed: { min: 5, max: 20 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 220,
      tint: [COLORS.player, COLORS.trail, COLORS.playerGlow],
      blendMode: Phaser.BlendModes.ADD,
      frequency: -1,  // manual emit only
      quantity: 1,
    });
    this.trailEmitter.setDepth(5);
  }

  // ── EventBus bindings ─────────────────────────────────────────────────────

  private _bindEvents(): void {
    (EventBus as any).on(GameEvent.PLAYER_DASH, (p: DashPayload) => {
      if (p) this.emitDash(p.position.x, p.position.y, p.direction.x, p.direction.y, p.chargeLevel);
    }, this);

    (EventBus as any).on(GameEvent.PLAYER_BOUNCE, (p: HitPayload) => {
      if (p) {
        const speed = Math.hypot(p.velocity.x, p.velocity.y);
        const normal: Vec2 = speed > 0
          ? { x: p.velocity.x / speed, y: p.velocity.y / speed }
          : { x: 0, y: -1 };
        this.emitBounce(p.position.x, p.position.y, normal);
      }
    }, this);

    (EventBus as any).on(GameEvent.OBSTACLE_HIT, (p: HitPayload) => {
      if (p) this.emitHit(p.position.x, p.position.y, 'obstacle');
    }, this);

    (EventBus as any).on(GameEvent.OBSTACLE_DESTROY, (p: { position: Vec2 }) => {
      if (p) this.emitDestroy(p.position.x, p.position.y, 'obstacle', COLORS.obstacle);
    }, this);

    (EventBus as any).on(GameEvent.ENEMY_DESTROY, (p: { position: Vec2 }) => {
      if (p) this.emitDestroy(p.position.x, p.position.y, 'enemy', COLORS.enemy);
    }, this);

    (EventBus as any).on(GameEvent.PLAYER_NEAR_MISS, (p: { position: Vec2 }) => {
      if (p) this.emitNearMiss(p.position.x, p.position.y);
    }, this);

    (EventBus as any).on(GameEvent.COMBO_INCREMENT, (p: ComboPayload) => {
      if (p) this.emitCombo(p.position.x, p.position.y, p.count);
    }, this);

    (EventBus as any).on(GameEvent.SLOW_MOTION_START, (p: { position: Vec2 }) => {
      const pos = p?.position;
      this.emitSlowMotion(pos?.x ?? 195, pos?.y ?? 422);
    }, this);
  }

  // ── Public Effect API ─────────────────────────────────────────────────────

  /**
   * Backward-facing cone of cyan sparks on dash. Scales with charge level.
   */
  emitDash(x: number, y: number, dirX: number, dirY: number, chargeLevel: number): void {
    const count = Math.floor(12 + chargeLevel * 18);
    const speed = 200 + chargeLevel * 400;

    // Backward direction angle
    const baseAngle = Math.atan2(-dirY, -dirX) * (180 / Math.PI);

    const emitter = this.scene.add.particles(x, y, this.TEX_SPARK, {
      speed: { min: speed * 0.4, max: speed },
      angle: { min: baseAngle - 30, max: baseAngle + 30 },
      scale: { start: 0.6 + chargeLevel * 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 250 + chargeLevel * 150,
      tint: [COLORS.player, COLORS.playerGlow, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
      quantity: count,
      emitting: false,
    });
    emitter.setDepth(6);
    emitter.explode(count, x, y);

    this.scene.time.delayedCall(600, () => emitter.destroy());
  }

  /**
   * Ring of white sparks reflecting off surface normal.
   */
  emitBounce(x: number, y: number, normal: Vec2): void {
    const baseAngle = Math.atan2(normal.y, normal.x) * (180 / Math.PI);

    const emitter = this.scene.add.particles(x, y, this.TEX_DOT, {
      speed: { min: 150, max: 300 },
      angle: { min: baseAngle - 70, max: baseAngle + 70 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 350,
      tint: 0xffffff,
      blendMode: Phaser.BlendModes.ADD,
      quantity: 12,
      emitting: false,
    });
    emitter.setDepth(6);
    emitter.explode(12, x, y);

    this.scene.time.delayedCall(500, () => emitter.destroy());
  }

  /**
   * 8–12 colored shards outward. Red for obstacles, orange for enemies.
   */
  emitHit(x: number, y: number, type: 'obstacle' | 'enemy'): void {
    const color = type === 'obstacle' ? COLORS.obstacle : COLORS.enemy;
    const count = 8 + Math.floor(Math.random() * 5);

    const emitter = this.scene.add.particles(x, y, this.TEX_SHARD, {
      speed: { min: 80, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      lifespan: 400,
      tint: color,
      blendMode: Phaser.BlendModes.ADD,
      quantity: count,
      emitting: false,
    });
    emitter.setDepth(7);
    emitter.explode(count, x, y);

    this.scene.time.delayedCall(550, () => emitter.destroy());
  }

  /**
   * Large explosion: 20–30 particles with gravity, long lifespan. Color from object.
   */
  emitDestroy(x: number, y: number, type: 'obstacle' | 'enemy', color: number): void {
    const count = 20 + Math.floor(Math.random() * 11);

    const emitter = this.scene.add.particles(x, y, this.TEX_GLOW, {
      speed: { min: 100, max: 350 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1000,
      gravityY: 200,
      tint: [color, 0xffffff, color],
      blendMode: Phaser.BlendModes.ADD,
      quantity: count,
      emitting: false,
    });
    emitter.setDepth(8);
    emitter.explode(count, x, y);

    // Secondary small sparks
    const sparks = this.scene.add.particles(x, y, this.TEX_DOT, {
      speed: { min: 50, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 600,
      gravityY: 100,
      tint: [color, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
      quantity: 15,
      emitting: false,
    });
    sparks.setDepth(7);
    sparks.explode(15, x, y);

    this.emitShockwave(x, y, 60 + (type === 'enemy' ? 20 : 0));

    this.scene.time.delayedCall(1200, () => {
      emitter.destroy();
      sparks.destroy();
    });
  }

  /**
   * Yellow streak particles along near-miss path.
   */
  emitNearMiss(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, this.TEX_SPARK, {
      speed: { min: 60, max: 160 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 500,
      tint: COLORS.nearMiss,
      blendMode: Phaser.BlendModes.ADD,
      quantity: 16,
      emitting: false,
    });
    emitter.setDepth(6);
    emitter.explode(16, x, y);

    this.scene.time.delayedCall(700, () => emitter.destroy());
  }

  /**
   * Upward burst of golden particles. Higher combo = more particles.
   */
  emitCombo(x: number, y: number, comboCount: number): void {
    const count = Math.min(8 + comboCount * 3, 40);

    const emitter = this.scene.add.particles(x, y, this.TEX_GLOW, {
      speed: { min: 80, max: 200 + comboCount * 20 },
      angle: { min: 230, max: 310 }, // upward arc
      scale: { start: 0.5 + comboCount * 0.05, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 500 + comboCount * 30,
      tint: [COLORS.uiCombo, 0xffaa00, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
      quantity: count,
      emitting: false,
    });
    emitter.setDepth(9);
    emitter.explode(count, x, y);

    this.scene.time.delayedCall(900, () => emitter.destroy());
  }

  /**
   * Single trail dot behind player — call every frame from player update.
   */
  emitTrail(x: number, y: number, _color: number): void {
    this.trailEmitter.emitParticleAt(x, y, 1);
  }

  /**
   * Expanding ring using Graphics tween (no particle texture needed).
   */
  emitShockwave(x: number, y: number, radius: number): void {
    const gfx = this.scene.add.graphics();
    gfx.setDepth(10);
    gfx.lineStyle(3, COLORS.shockwave, 1);
    gfx.strokeCircle(0, 0, 1);
    gfx.setPosition(x, y);

    this.shockwaves.push(gfx);

    this.scene.tweens.add({
      targets: gfx,
      scaleX: radius,
      scaleY: radius,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => {
        const idx = this.shockwaves.indexOf(gfx);
        if (idx !== -1) this.shockwaves.splice(idx, 1);
        gfx.destroy();
      },
    });
  }

  /**
   * Circular slow-motion burst — particles decelerate.
   */
  emitSlowMotion(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, this.TEX_GLOW, {
      speed: { min: 20, max: 80 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 900,
      tint: [0x8888ff, 0x44aaff, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
      quantity: 24,
      emitting: false,
    });
    emitter.setDepth(8);
    emitter.explode(24, x, y);

    this.scene.time.delayedCall(1100, () => emitter.destroy());
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_delta: number): void {
    // Shockwaves and one-shot emitters are tween/timer managed.
    // This hook is reserved for any future per-frame logic.
  }

  destroy(): void {
    (EventBus as any).off(GameEvent.PLAYER_DASH, undefined, this);
    (EventBus as any).off(GameEvent.PLAYER_BOUNCE, undefined, this);
    (EventBus as any).off(GameEvent.OBSTACLE_HIT, undefined, this);
    (EventBus as any).off(GameEvent.OBSTACLE_DESTROY, undefined, this);
    (EventBus as any).off(GameEvent.ENEMY_DESTROY, undefined, this);
    (EventBus as any).off(GameEvent.PLAYER_NEAR_MISS, undefined, this);
    (EventBus as any).off(GameEvent.COMBO_INCREMENT, undefined, this);
    (EventBus as any).off(GameEvent.SLOW_MOTION_START, undefined, this);

    this.trailEmitter?.destroy();
    this.shockwaves.forEach(g => g.destroy());
    this.shockwaves.length = 0;
  }
}
