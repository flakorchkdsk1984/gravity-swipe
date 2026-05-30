import Phaser from 'phaser';
import { EventBus } from '../systems/EventBus';
import { GameEvent, PowerConfig, PowerType } from '../config/types';
import { POWER_COLORS } from '../config/GameConfig';

const RADIUS = 16;

export class PowerObject extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  powerType: PowerType = PowerType.SPEED_BOOST;

  private gfx!: Phaser.GameObjects.Graphics;
  private innerGfx!: Phaser.GameObjects.Graphics;
  private labelText!: Phaser.GameObjects.Text;
  private bobTween!: Phaser.Tweens.Tween;
  private pulseTween!: Phaser.Tweens.Tween;
  private _active = false;
  private _bobTime = 0;

  constructor(scene: Phaser.Scene, cfg: PowerConfig) {
    super(scene, cfg.x, cfg.y);

    this.gfx      = scene.add.graphics();
    this.innerGfx = scene.add.graphics();
    this.labelText = scene.add.text(0, RADIUS + 8, '', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5, 0);

    this.add([this.gfx, this.innerGfx, this.labelText]);
    scene.add.existing(this);
    scene.physics.world.enable(this);

    this.reset(cfg);
  }

  // ── Public API ──────────────────────────────────────────────

  reset(cfg: PowerConfig): void {
    this.powerType = cfg.type;
    this.setPosition(cfg.x, cfg.y);
    this.setScale(1);
    this.setAlpha(1);
    this.setActive(true).setVisible(true);
    this._active = true;
    this._bobTime = Math.random() * Math.PI * 2; // randomise phase

    const body = this.body;
    body.setCircle(RADIUS, -RADIUS, -RADIUS);
    body.allowGravity = false;
    body.enable = true;

    this._draw();
    this._startTweens();
  }

  activate(): void {
    if (!this._active) return;
    this._active = false;

    EventBus.emit(GameEvent.POWER_COLLECTED, {
      type:     this.powerType,
      position: { x: this.x, y: this.y },
    });

    this._stopTweens();
    this._burstParticles();

    this.scene.tweens.add({
      targets:  this,
      alpha:    0,
      scaleX:   2.2,
      scaleY:   2.2,
      duration: 220,
      ease:     'Quad.easeOut',
      onComplete: () => {
        this.setActive(false).setVisible(false);
        this.body.enable = false;
      },
    });
  }

  override update(delta: number): void {
    if (!this._active) return;
    this._bobTime += delta * 0.001;
    // Gentle float: ±8 px sine wave
    const bobOffset = Math.sin(this._bobTime * 2) * 8;
    this.innerGfx.y = bobOffset;
    this.labelText.y = RADIUS + 8 + bobOffset;
  }

  // ── Drawing ─────────────────────────────────────────────────

  private _draw(): void {
    this.gfx.clear();
    this.innerGfx.clear();

    const color = POWER_COLORS[this.powerType] ?? 0xffffff;

    // Outer glow rings
    this.gfx.fillStyle(color, 0.08);
    this.gfx.fillCircle(0, 0, RADIUS + 18);
    this.gfx.fillStyle(color, 0.18);
    this.gfx.fillCircle(0, 0, RADIUS + 10);
    this.gfx.fillStyle(color, 0.32);
    this.gfx.fillCircle(0, 0, RADIUS + 4);

    // Main circle body
    this.innerGfx.fillStyle(color, 0.92);
    this.innerGfx.fillCircle(0, 0, RADIUS);

    // Specular highlight
    this.innerGfx.fillStyle(0xffffff, 0.40);
    this.innerGfx.fillCircle(-RADIUS * 0.28, -RADIUS * 0.28, RADIUS * 0.40);

    // Crisp border
    this.innerGfx.lineStyle(2, 0xffffff, 0.85);
    this.innerGfx.strokeCircle(0, 0, RADIUS);

    // Inner decorative ring
    this.innerGfx.lineStyle(1, color, 0.55);
    this.innerGfx.strokeCircle(0, 0, RADIUS * 0.65);

    // Label text underneath (set by import from POWER_LABELS or fallback)
    this.labelText.setText(this._shortLabel());
    this.labelText.setStyle({ color: '#' + color.toString(16).padStart(6, '0') });
  }

  private _shortLabel(): string {
    const labels: Record<string, string> = {
      speed_boost: '⚡',
      shield:      '🛡',
      score_x2:    '×2',
      slow_extend: '🌀',
      freeze:      '❄',
      ghost:       '👻',
      magnet:      '🧲',
    };
    return labels[this.powerType] ?? '?';
  }

  // ── Tweens ───────────────────────────────────────────────────

  private _startTweens(): void {
    this._stopTweens();

    this.pulseTween = this.scene.tweens.add({
      targets:  this,
      scaleX:   1.15,
      scaleY:   1.15,
      yoyo:     true,
      repeat:   -1,
      duration: 800,
      ease:     'Sine.easeInOut',
    });
  }

  private _stopTweens(): void {
    if (this.pulseTween) { this.pulseTween.stop(); }
    this.setScale(1);
  }

  // ── Particles ───────────────────────────────────────────────

  private _burstParticles(): void {
    const color = POWER_COLORS[this.powerType] ?? 0xffffff;
    const count = 10;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist  = Phaser.Math.Between(24, 60);
      const size  = Phaser.Math.Between(3, 7);
      const spark = this.scene.add.graphics();
      spark.fillStyle(color, 1);
      spark.fillCircle(0, 0, size / 2);
      spark.x = this.x;
      spark.y = this.y;

      this.scene.tweens.add({
        targets:  spark,
        x:        this.x + Math.cos(angle) * dist,
        y:        this.y + Math.sin(angle) * dist,
        alpha:    0,
        scaleX:   0.1,
        scaleY:   0.1,
        duration: 300 + i * 20,
        ease:     'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  override destroy(fromScene?: boolean): void {
    this._stopTweens();
    super.destroy(fromScene);
  }
}
