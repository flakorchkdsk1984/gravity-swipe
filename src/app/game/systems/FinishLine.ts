import Phaser from 'phaser';
import { FINISH_Y, COLORS } from '../config/GameConfig';

const STRIPE_COLORS = [0xffd700, 0xff8800, 0xffff00, 0x00ff88, 0x00aaff, 0xaa44ff, 0xff2244];
const LINE_WIDTH    = 390;
const STRIPE_H      = 6;

export class FinishLine {
  private scene: Phaser.Scene;
  private gfx!: Phaser.GameObjects.Graphics;
  private labelText!: Phaser.GameObjects.Text;
  private subText!: Phaser.GameObjects.Text;
  private glowTween!: Phaser.Tweens.Tween;
  readonly worldY = FINISH_Y;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this._draw();
    this._createAmbientParticles();
  }

  // ── Drawing ─────────────────────────────────────────────────

  private _draw(): void {
    this.gfx = this.scene.add.graphics();

    const y = FINISH_Y;

    // Wide glow halo behind everything
    this.gfx.fillStyle(0xffd700, 0.06);
    this.gfx.fillRect(0, y - 40, LINE_WIDTH, 80);

    // Rainbow stripes
    for (let i = 0; i < STRIPE_COLORS.length; i++) {
      this.gfx.fillStyle(STRIPE_COLORS[i], 0.88);
      this.gfx.fillRect(0, y - (STRIPE_H * STRIPE_COLORS.length) / 2 + i * STRIPE_H, LINE_WIDTH, STRIPE_H);
    }

    // Bright gold centre line
    this.gfx.lineStyle(3, 0xffd700, 1.0);
    this.gfx.beginPath();
    this.gfx.moveTo(0, y);
    this.gfx.lineTo(LINE_WIDTH, y);
    this.gfx.strokePath();

    // Tick marks every 40px
    this.gfx.lineStyle(2, 0xffffff, 0.7);
    for (let x = 0; x <= LINE_WIDTH; x += 40) {
      this.gfx.beginPath();
      this.gfx.moveTo(x, y - 24);
      this.gfx.lineTo(x, y + 24);
      this.gfx.strokePath();
    }

    // "FINISH" text
    this.labelText = this.scene.add.text(LINE_WIDTH / 2, y - 52, 'FINISH', {
      fontSize:         '32px',
      fontFamily:       'monospace',
      fontStyle:        'bold',
      color:            '#ffd700',
      stroke:           '#000000',
      strokeThickness:  4,
      shadow: {
        offsetX:  0,
        offsetY:  0,
        color:    '#ffd700',
        blur:     18,
        fill:     true,
      },
    }).setOrigin(0.5, 1);

    // Sub-label
    this.subText = this.scene.add.text(LINE_WIDTH / 2, y + 26, '— STAGE COMPLETE —', {
      fontSize:        '11px',
      fontFamily:      'monospace',
      color:           '#ffffff',
      stroke:          '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setAlpha(0.75);

    // Pulsing alpha glow on the label
    this.glowTween = this.scene.tweens.add({
      targets:  this.labelText,
      alpha:    { from: 0.75, to: 1.0 },
      duration: 700,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  private _createAmbientParticles(): void {
    // Manual sparkle emitter — avoids needing texture assets
    const y = FINISH_Y;
    const scene = this.scene;

    // Schedule periodic sparkles using scene timer
    scene.time.addEvent({
      delay:    250,
      loop:     true,
      callback: () => {
        const x     = Phaser.Math.Between(10, LINE_WIDTH - 10);
        const color = STRIPE_COLORS[Phaser.Math.Between(0, STRIPE_COLORS.length - 1)];
        const spark = scene.add.graphics();
        spark.fillStyle(color, 1);
        spark.fillCircle(0, 0, Phaser.Math.Between(2, 5));
        spark.x = x;
        spark.y = y + Phaser.Math.Between(-20, 20);

        scene.tweens.add({
          targets:  spark,
          y:        spark.y - Phaser.Math.Between(20, 50),
          alpha:    0,
          scaleX:   0.1,
          scaleY:   0.1,
          duration: Phaser.Math.Between(400, 800),
          ease:     'Quad.easeOut',
          onComplete: () => spark.destroy(),
        });
      },
    });
  }

  // ── Public API ───────────────────────────────────────────────

  checkPlayerReached(playerY: number, playerRadius: number): boolean {
    return playerY - playerRadius <= this.worldY + 20;
  }

  destroy(): void {
    this.glowTween?.stop();
    this.gfx?.destroy();
    this.labelText?.destroy();
    this.subText?.destroy();
  }
}
