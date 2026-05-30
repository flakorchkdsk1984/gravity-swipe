import Phaser from 'phaser';
import { GAME_CONFIG, COLORS } from '../config/GameConfig';

const W = GAME_CONFIG.width as number;
const H = GAME_CONFIG.height as number;

interface LeaderboardEntry {
  emoji: string;
  timeMs: number;
  score: number;
  date: string;
}

export class MenuScene extends Phaser.Scene {
  private leaderboardOverlay!: Phaser.GameObjects.Container;
  private stars: { gfx: Phaser.GameObjects.Graphics; x: number; y: number; speed: number; r: number }[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this._createBackground();
    this._createTitle();
    this._createButtons();
    this._createLeaderboard();

    // Version badge — bottom right
    this.add.text(W - 8, H - 8, 'v0.0.2-beta', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#555577',
    }).setOrigin(1, 1);

    // How to play hint — bottom center
    this.add.text(W / 2, H - 28, 'Hold & drag to aim  •  Release to dash', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#334466',
    }).setOrigin(0.5, 1);
  }

  override update(_time: number, delta: number): void {
    for (const star of this.stars) {
      star.y -= star.speed * (delta / 1000);
      if (star.y < -star.r) {
        star.y = H + star.r;
        star.x = Phaser.Math.Between(0, W);
      }
      star.gfx.setPosition(star.x, star.y);
    }
  }

  private _createBackground(): void {
    this.add.rectangle(W / 2, H / 2, W, H, COLORS.background);

    // Neon grid
    const grid = this.add.graphics();
    grid.lineStyle(1, COLORS.bgGrid, 0.4);
    for (let x = 0; x <= W; x += 60) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 60) grid.lineBetween(0, y, W, y);

    // Drifting star particles
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H);
      const r = Phaser.Math.Between(1, 3);
      const speed = Phaser.Math.FloatBetween(15, 50);

      const gfx = this.add.graphics();
      gfx.fillStyle(0x00ffff, Phaser.Math.FloatBetween(0.2, 0.7));
      gfx.fillCircle(0, 0, r);
      gfx.setPosition(x, y);

      // Subtle alpha pulse per star
      this.tweens.add({
        targets: gfx,
        alpha: { from: Phaser.Math.FloatBetween(0.1, 0.4), to: Phaser.Math.FloatBetween(0.5, 0.9) },
        duration: Phaser.Math.Between(800, 2000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.stars.push({ gfx, x, y, speed, r });
    }
  }

  private _createTitle(): void {
    const titleY = H * 0.28;

    const title = this.add.text(W / 2, titleY, 'GRAVITY\nSWIPE', {
      fontFamily: 'monospace',
      fontSize: '64px',
      color: '#00ffff',
      align: 'center',
      stroke: '#006688',
      strokeThickness: 5,
      lineSpacing: 4,
    }).setOrigin(0.5).setAlpha(0);

    // Tagline
    const tagline = this.add.text(W / 2, titleY + 160, 'REACH THE FINISH LINE', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#4488ff',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    // Fade-in title
    this.tweens.add({
      targets: title,
      alpha: 1,
      y: titleY,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        // Pulsing glow after entry
        this.tweens.add({
          targets: title,
          alpha: { from: 0.7, to: 1 },
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      },
    });

    // Fade-in tagline with delay
    this.tweens.add({
      targets: tagline,
      alpha: 1,
      duration: 500,
      delay: 300,
      ease: 'Power2',
    });

    // Scanline effect — thin line sweeping down over the title area
    const scanline = this.add.graphics();
    scanline.lineStyle(1, 0x00ffff, 0.35);
    scanline.lineBetween(W / 2 - 160, 0, W / 2 + 160, 0);
    scanline.setPosition(0, titleY - 80);

    const scanLoop = () => {
      this.tweens.add({
        targets: scanline,
        y: titleY + 100,
        alpha: { from: 0.6, to: 0 },
        duration: 900,
        ease: 'Linear',
        onComplete: () => {
          scanline.setAlpha(0.6);
          scanline.setPosition(0, titleY - 80);
          this.time.delayedCall(2000, scanLoop);
        },
      });
    };
    this.time.delayedCall(2000, scanLoop);
  }

  private _createButtons(): void {
    const btnY = H * 0.62;

    // ── PLAY button ────────────────────────────────────────────────────────────
    const playContainer = this.add.container(W / 2, btnY).setAlpha(0);

    const playBg = this.add.graphics();
    playBg.fillStyle(0x00ffff, 1);
    playBg.fillRoundedRect(-120, -30, 240, 60, 30);
    // Outer glow ring
    const playGlow = this.add.graphics();
    playGlow.lineStyle(3, 0x00ffff, 0.5);
    playGlow.strokeRoundedRect(-123, -33, 246, 66, 32);

    const playText = this.add.text(0, 0, '▶   PLAY', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    playContainer.add([playGlow, playBg, playText]);

    // Make playBg interactive using explicit hit area
    playBg.setInteractive(
      new Phaser.Geom.Rectangle(-120, -30, 240, 60),
      Phaser.Geom.Rectangle.Contains,
    );
    playBg.on('pointerover', () => {
      this.tweens.add({ targets: playContainer, scaleX: 1.05, scaleY: 1.05, duration: 120, ease: 'Power1' });
      playGlow.clear();
      playGlow.lineStyle(4, 0x00ffff, 0.9);
      playGlow.strokeRoundedRect(-123, -33, 246, 66, 32);
    });
    playBg.on('pointerout', () => {
      this.tweens.add({ targets: playContainer, scaleX: 1, scaleY: 1, duration: 120, ease: 'Power1' });
      playGlow.clear();
      playGlow.lineStyle(3, 0x00ffff, 0.5);
      playGlow.strokeRoundedRect(-123, -33, 246, 66, 32);
    });
    playBg.on('pointerup', () => { this._transitionToGame(); });

    // ── ETAPAS button ─────────────────────────────────────────────────────────
    const stagesY = btnY + 75;
    const stagesContainer = this.add.container(W / 2, stagesY).setAlpha(0);

    const stagesBg = this.add.graphics();
    stagesBg.fillStyle(0x8800ff, 1);
    stagesBg.fillRoundedRect(-120, -30, 240, 60, 30);
    const stagesGlow = this.add.graphics();
    stagesGlow.lineStyle(3, 0x8800ff, 0.5);
    stagesGlow.strokeRoundedRect(-123, -33, 246, 66, 32);

    const stagesText = this.add.text(0, 0, '⚡ ETAPAS', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    stagesContainer.add([stagesGlow, stagesBg, stagesText]);

    stagesBg.setInteractive(
      new Phaser.Geom.Rectangle(-120, -30, 240, 60),
      Phaser.Geom.Rectangle.Contains,
    );
    stagesBg.on('pointerover', () => {
      this.tweens.add({ targets: stagesContainer, scaleX: 1.05, scaleY: 1.05, duration: 120, ease: 'Power1' });
      stagesGlow.clear();
      stagesGlow.lineStyle(4, 0x8800ff, 0.9);
      stagesGlow.strokeRoundedRect(-123, -33, 246, 66, 32);
    });
    stagesBg.on('pointerout', () => {
      this.tweens.add({ targets: stagesContainer, scaleX: 1, scaleY: 1, duration: 120, ease: 'Power1' });
      stagesGlow.clear();
      stagesGlow.lineStyle(3, 0x8800ff, 0.5);
      stagesGlow.strokeRoundedRect(-123, -33, 246, 66, 32);
    });
    stagesBg.on('pointerup', () => { this.scene.start('StageSelectScene'); });

    // ── BEST TIMES button ──────────────────────────────────────────────────────
    const bestY = btnY + 155;
    const bestContainer = this.add.container(W / 2, bestY).setAlpha(0);

    const bestBg = this.add.graphics();
    bestBg.fillStyle(0x00ffff, 0.15);
    bestBg.fillRoundedRect(-100, -24, 200, 48, 24);
    bestBg.lineStyle(2, 0x00ffff, 0.8);
    bestBg.strokeRoundedRect(-100, -24, 200, 48, 24);

    const bestText = this.add.text(0, 0, '🏆 BEST TIMES', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#00ffff',
    }).setOrigin(0.5);

    bestContainer.add([bestBg, bestText]);

    bestBg.setInteractive(
      new Phaser.Geom.Rectangle(-100, -24, 200, 48),
      Phaser.Geom.Rectangle.Contains,
    );
    bestBg.on('pointerover', () => {
      this.tweens.add({ targets: bestContainer, scaleX: 1.05, scaleY: 1.05, duration: 120, ease: 'Power1' });
    });
    bestBg.on('pointerout', () => {
      this.tweens.add({ targets: bestContainer, scaleX: 1, scaleY: 1, duration: 120, ease: 'Power1' });
    });
    bestBg.on('pointerup', () => { this._showLeaderboard(); });

    // ── Animate buttons in sequentially ───────────────────────────────────────
    this.tweens.add({
      targets: playContainer,
      alpha: 1,
      y: btnY,
      duration: 400,
      delay: 500,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: stagesContainer,
      alpha: 1,
      y: stagesY,
      duration: 400,
      delay: 650,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: bestContainer,
      alpha: 1,
      y: bestY,
      duration: 400,
      delay: 800,
      ease: 'Back.easeOut',
    });
  }

  private _createLeaderboard(): void {
    const panelW = 340;
    const panelH = 500;
    const cx = W / 2;
    const cy = H / 2;

    this.leaderboardOverlay = this.add.container(cx, cy).setDepth(100).setVisible(false);

    // Dark semi-transparent backdrop (full screen)
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.75);
    backdrop.fillRect(-cx, -cy, W, H);
    this.leaderboardOverlay.add(backdrop);

    // Panel background
    const panel = this.add.graphics();
    panel.fillStyle(0x0a0a2a, 0.97);
    panel.lineStyle(2, 0x00ffff, 0.8);
    panel.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 16);
    panel.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 16);
    this.leaderboardOverlay.add(panel);

    // Title text
    const title = this.add.text(0, -panelH / 2 + 36, '🏆 BEST TIMES', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#00ffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.leaderboardOverlay.add(title);

    // Divider
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x00ffff, 0.4);
    divider.lineBetween(-panelW / 2 + 16, -panelH / 2 + 62, panelW / 2 - 16, -panelH / 2 + 62);
    this.leaderboardOverlay.add(divider);

    // Entries area — built dynamically when shown
    const entriesContainer = this.add.container(0, 0);
    entriesContainer.setName('entriesContainer');
    this.leaderboardOverlay.add(entriesContainer);

    // CLOSE button
    const closeBg = this.add.graphics();
    closeBg.fillStyle(0xff4466, 0.85);
    closeBg.fillRoundedRect(-60, -20, 120, 40, 20);
    const closeText = this.add.text(0, 0, 'CLOSE', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    closeBg.setInteractive(
      new Phaser.Geom.Rectangle(-60, -20, 120, 40),
      Phaser.Geom.Rectangle.Contains,
    );
    closeBg.on('pointerup', () => { this._hideLeaderboard(); });
    closeBg.on('pointerover', () => { closeBg.setAlpha(1); });
    closeBg.on('pointerout', () => { closeBg.setAlpha(0.85); });

    const closeContainer = this.add.container(0, panelH / 2 - 38, [closeBg, closeText]);
    this.leaderboardOverlay.add(closeContainer);
  }

  private _showLeaderboard(): void {
    // Rebuild entries each time to reflect latest localStorage
    const entriesContainer = this.leaderboardOverlay.getByName('entriesContainer') as Phaser.GameObjects.Container;
    entriesContainer.removeAll(true);

    const entries: LeaderboardEntry[] = JSON.parse(
      localStorage.getItem('gs_leaderboard_v1') ?? '[]',
    );

    const panelH = 500;
    const startY = -panelH / 2 + 88;
    const rowH = 36;

    if (entries.length === 0) {
      const noData = this.add.text(0, 0, 'No times yet!\nComplete a stage to record your time.', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#667799',
        align: 'center',
      }).setOrigin(0.5);
      entriesContainer.add(noData);
    } else {
      const top10 = entries.slice(0, 10);
      top10.forEach((entry, i) => {
        const y = startY + i * rowH;
        const rank = `#${i + 1}`;
        const timeStr = this._formatTime(entry.timeMs);
        const line = `${rank.padEnd(4)} ${entry.emoji ?? '🎮'} ${timeStr}  ${entry.score.toString().padStart(6)}`;
        const color = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#aabbcc';
        const row = this.add.text(0, y, line, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color,
        }).setOrigin(0.5, 0);
        entriesContainer.add(row);
      });
    }

    this.leaderboardOverlay.setVisible(true);
    this.leaderboardOverlay.setAlpha(0);
    this.tweens.add({
      targets: this.leaderboardOverlay,
      alpha: 1,
      duration: 250,
      ease: 'Power2',
    });
  }

  private _hideLeaderboard(): void {
    this.tweens.add({
      targets: this.leaderboardOverlay,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => { this.leaderboardOverlay.setVisible(false); },
    });
  }

  private _formatTime(ms: number): string {
    const totalCentiseconds = Math.floor(ms / 10);
    const centiseconds = totalCentiseconds % 100;
    const totalSeconds = Math.floor(totalCentiseconds / 100);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  }

  private _transitionToGame(): void {
    // White flash overlay then start game
    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff).setAlpha(0).setDepth(200);
    this.tweens.add({
      targets: flash,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.scene.start('MainGameScene');
      },
    });
  }
}
