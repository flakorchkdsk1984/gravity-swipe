import Phaser from 'phaser';
import { IStageConfig } from '../config/types';
import { GAME_CONFIG } from '../config/GameConfig';

const W = GAME_CONFIG.width;
const H = GAME_CONFIG.height;
const PANEL_DURATION = 5000; // ms before auto-dismiss

/**
 * StageIntroPanel — Phaser overlay displayed at stage start.
 * Shows the power name, description, tips, and auto-dismisses after 5s.
 * Tap anywhere on the panel to dismiss early.
 */
export class StageIntroPanel {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private timerBar!: Phaser.GameObjects.Rectangle;
  private timer!: Phaser.Time.TimerEvent;
  private onDismissed?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(config: IStageConfig, onDismissed?: () => void): void {
    this.onDismissed = onDismissed;
    const accentHex = '#' + config.accentColor.toString(16).padStart(6, '0');
    const accentInt = config.accentColor;

    this.container = this.scene.add.container(W / 2, H / 2);
    this.container.setDepth(1000).setScrollFactor(0);

    // ── Backdrop ─────────────────────────────────────────────────────────────
    const bg = this.scene.add.rectangle(0, 0, W, H, 0x000000, 0.82)
      .setInteractive();
    bg.on('pointerdown', () => this._dismiss());

    // ── Glow border ───────────────────────────────────────────────────────────
    const panelW = W - 32;
    const panelH = 340;
    const border = this.scene.add.rectangle(0, 0, panelW + 4, panelH + 4, accentInt, 0.5);
    const panel  = this.scene.add.rectangle(0, 0, panelW, panelH, 0x0a0a1a, 0.97);

    // ── Emoji ─────────────────────────────────────────────────────────────────
    const emojiText = this.scene.add.text(0, -panelH / 2 + 30, config.emoji, {
      fontSize: '52px',
    }).setOrigin(0.5, 0);

    // ── Title ─────────────────────────────────────────────────────────────────
    const title = this.scene.add.text(0, -panelH / 2 + 92, config.introTitle, {
      fontFamily: "'Orbitron', monospace",
      fontSize: '18px',
      fontStyle: 'bold',
      color: accentHex,
      align: 'center',
      wordWrap: { width: panelW - 24 },
    }).setOrigin(0.5, 0);

    // ── Divider ───────────────────────────────────────────────────────────────
    const divY = -panelH / 2 + 120;
    const divider = this.scene.add.rectangle(0, divY, panelW - 40, 1, accentInt, 0.4);

    // ── Description lines ─────────────────────────────────────────────────────
    let lineY = -panelH / 2 + 136;
    const lineObjs: Phaser.GameObjects.Text[] = [];
    for (const line of config.introLines) {
      const t = this.scene.add.text(-panelW / 2 + 16, lineY, `• ${line}`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#cccccc',
        wordWrap: { width: panelW - 32 },
      }).setOrigin(0, 0);
      lineObjs.push(t);
      lineY += t.height + 6;
    }

    // ── Tip ───────────────────────────────────────────────────────────────────
    const tipBg = this.scene.add.rectangle(0, panelH / 2 - 50, panelW - 16, 36, accentInt, 0.15);
    const tip = this.scene.add.text(0, panelH / 2 - 50, config.introTip, {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: accentHex,
      align: 'center',
      wordWrap: { width: panelW - 24 },
    }).setOrigin(0.5, 0.5);

    // ── Timer bar ─────────────────────────────────────────────────────────────
    const barBg = this.scene.add.rectangle(0, panelH / 2 - 10, panelW - 16, 4, 0x333333);
    this.timerBar = this.scene.add.rectangle(-(panelW - 16) / 2, panelH / 2 - 10, panelW - 16, 4, accentInt);
    this.timerBar.setOrigin(0, 0.5);

    // ── TAP hint ─────────────────────────────────────────────────────────────
    const tapHint = this.scene.add.text(0, panelH / 2 + 16, 'TAP PARA CONTINUAR', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#555555',
    }).setOrigin(0.5, 0);

    this.container.add([
      bg, border, panel,
      emojiText, title, divider,
      tipBg, tip, barBg, this.timerBar, tapHint,
      ...lineObjs,
    ]);

    // ── Animate in ────────────────────────────────────────────────────────────
    this.container.setAlpha(0);
    this.container.setScale(0.92);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 280,
      ease: 'Back.out',
    });

    // ── Timer bar tween ───────────────────────────────────────────────────────
    this.scene.tweens.add({
      targets: this.timerBar,
      scaleX: 0,
      duration: PANEL_DURATION,
      ease: 'Linear',
    });

    // ── Auto-dismiss ──────────────────────────────────────────────────────────
    this.timer = this.scene.time.delayedCall(PANEL_DURATION, () => this._dismiss());
  }

  private _dismiss(): void {
    if (!this.container?.active) return;
    this.timer?.remove();
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scaleY: 0.95,
      duration: 200,
      ease: 'Sine.in',
      onComplete: () => {
        this.container?.destroy();
        this.onDismissed?.();
      },
    });
  }

  destroy(): void {
    this.timer?.remove();
    this.container?.destroy();
  }
}
