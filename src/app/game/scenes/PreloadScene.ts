import Phaser from 'phaser';
import { GAME_CONFIG, COLORS } from '../config/GameConfig';

const W = GAME_CONFIG.width;
const H = GAME_CONFIG.height;

// ─────────────────────────────────────────────────────────────────────────────
// PreloadScene — creates ALL textures programmatically (no external assets)
// and shows an animated loading screen while doing so.
// ─────────────────────────────────────────────────────────────────────────────
export class PreloadScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private loadingText!: Phaser.GameObjects.Text;
  private pulseTimer = 0;

  constructor() {
    super({ key: 'PreloadScene' });
  }

  create(): void {
    // Dark background
    this.add.rectangle(W / 2, H / 2, W, H, COLORS.background);

    // Neon grid lines (decorative)
    const grid = this.add.graphics();
    grid.lineStyle(1, COLORS.bgGrid, 0.4);
    for (let x = 0; x <= W; x += 60) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 60) grid.lineBetween(0, y, W, y);

    // Title
    this.titleText = this.add.text(W / 2, H * 0.38, 'GRAVITY\nSWIPE', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#00ffff',
      align: 'center',
      stroke: '#006688',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Subtitle glow pulse tween
    this.tweens.add({
      targets: this.titleText,
      alpha: { from: 0.7, to: 1 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Loading label
    this.loadingText = this.add.text(W / 2, H * 0.62, 'INITIALISING...', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#4488ff',
    }).setOrigin(0.5);

    // Generate all textures then transition
    this._generateAllTextures();

    // Brief hold so the player sees the title, then start
    this.time.delayedCall(800, () => {
      this.loadingText.setText('READY');
      this.loadingText.setColor('#00ffff');
      this.time.delayedCall(200, () => {
        this.scene.start('MainGameScene');
      });
    });
  }

  // ── Texture factory ───────────────────────────────────────────────────────

  private _generateAllTextures(): void {
    this._makePlayerTexture();
    this._makeObstacleWallTexture();
    this._makeObstacleBumperTexture();
    this._makeEnemyBasicTexture();
    this._makeParticleDotTexture();
    this._makeGlowSoftTexture();
  }

  /** Glowing neon-cyan sphere for the player. */
  private _makePlayerTexture(): void {
    if (this.textures.exists('player')) return;
    const r = 18;
    const size = (r + 12) * 2;
    const gfx = this.make.graphics({}, false);

    // Outer glow rings
    for (let i = 4; i > 0; i--) {
      const gr = r + i * 4;
      gfx.fillStyle(COLORS.playerGlow, 0.08 * i);
      gfx.fillCircle(size / 2, size / 2, gr);
    }
    // Core
    gfx.fillStyle(COLORS.player, 1);
    gfx.fillCircle(size / 2, size / 2, r);
    // Specular
    gfx.fillStyle(0xffffff, 0.55);
    gfx.fillCircle(size / 2 - r * 0.28, size / 2 - r * 0.28, r * 0.28);

    gfx.generateTexture('player', size, size);
    gfx.destroy();
  }

  /** Neon-red rectangular wall segment. */
  private _makeObstacleWallTexture(): void {
    if (this.textures.exists('obstacle_wall')) return;
    const gfx = this.make.graphics({}, false);
    // Glow border
    gfx.fillStyle(COLORS.obstacleGlow, 0.3);
    gfx.fillRect(0, 0, 90, 20);
    // Core
    gfx.fillStyle(COLORS.obstacle, 1);
    gfx.fillRect(2, 2, 86, 16);
    // Inner highlight
    gfx.fillStyle(0xffffff, 0.15);
    gfx.fillRect(4, 4, 82, 4);
    gfx.generateTexture('obstacle_wall', 90, 20);
    gfx.destroy();
  }

  /** Neon-green circular bumper. */
  private _makeObstacleBumperTexture(): void {
    if (this.textures.exists('obstacle_bumper')) return;
    const r = 20;
    const size = (r + 6) * 2;
    const cx = size / 2;
    const cy = size / 2;
    const gfx = this.make.graphics({}, false);
    // Glow halo
    gfx.fillStyle(COLORS.bumper, 0.18);
    gfx.fillCircle(cx, cy, r + 6);
    // Core
    gfx.fillStyle(COLORS.bumper, 1);
    gfx.fillCircle(cx, cy, r);
    // Inner ring
    gfx.lineStyle(2, 0xffffff, 0.4);
    gfx.strokeCircle(cx, cy, r - 4);
    gfx.generateTexture('obstacle_bumper', size, size);
    gfx.destroy();
  }

  /** Neon-orange enemy orb. */
  private _makeEnemyBasicTexture(): void {
    if (this.textures.exists('enemy_basic')) return;
    const r = 12;
    const size = (r + 8) * 2;
    const cx = size / 2;
    const cy = size / 2;
    const gfx = this.make.graphics({}, false);
    // Glow
    gfx.fillStyle(COLORS.enemyGlow, 0.2);
    gfx.fillCircle(cx, cy, r + 8);
    gfx.fillStyle(COLORS.enemy, 0.5);
    gfx.fillCircle(cx, cy, r + 3);
    // Core
    gfx.fillStyle(COLORS.enemy, 1);
    gfx.fillCircle(cx, cy, r);
    // Pupil-like dark center
    gfx.fillStyle(0x000000, 0.35);
    gfx.fillCircle(cx, cy, r * 0.45);
    gfx.generateTexture('enemy_basic', size, size);
    gfx.destroy();
  }

  /** Small white dot used by the particle system. */
  private _makeParticleDotTexture(): void {
    if (this.textures.exists('particle_dot')) return;
    const gfx = this.make.graphics({}, false);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture('particle_dot', 8, 8);
    gfx.destroy();
  }

  /** Soft radial glow used for hit flashes and combo effects. */
  private _makeGlowSoftTexture(): void {
    if (this.textures.exists('glow_soft')) return;
    const size = 32;
    const half = size / 2;
    const gfx = this.make.graphics({}, false);
    for (let r = half; r > 0; r -= 2) {
      const alpha = (1 - r / half) * 0.65;
      gfx.fillStyle(0x00ffff, alpha);
      gfx.fillCircle(half, half, r);
    }
    gfx.generateTexture('glow_soft', size, size);
    gfx.destroy();
  }
}
