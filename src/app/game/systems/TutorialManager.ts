import Phaser from 'phaser';
import { EventBus } from './EventBus';
import { GameEvent } from '../config/types';
import { GAME_CONFIG } from '../config/GameConfig';

// ── Step definitions ────────────────────────────────────────────────────────

interface TutorialStep {
  title: string;
  description: string;
  tooltipY: number;       // Y position as fraction of H
  arrowDirection: 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'none';
  advanceEvent?: string;  // GameEvent string value
  timeout: number;        // ms before auto-advance
}

const W = GAME_CONFIG.width;
const H = GAME_CONFIG.height;

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title:          'MANTÉN PRESIONADO',
    description:    'Toca y mantén para cargar energía',
    tooltipY:       0.45,
    arrowDirection: 'down',
    advanceEvent:   GameEvent.CHARGE_START,
    timeout:        5000,
  },
  {
    title:          'APUNTA Y ARRASTRA',
    description:    'Arrastra mientras cargas para elegir dirección',
    tooltipY:       0.45,
    arrowDirection: 'up-right',
    advanceEvent:   GameEvent.PLAYER_DASH,
    timeout:        5000,
  },
  {
    title:          '¡GOLPEA LOS OBSTÁCULOS!',
    description:    'Los objetos rojos dan puntos al golpearlos\n+10 pts por golpe básico',
    tooltipY:       0.35,
    arrowDirection: 'up-right',
    advanceEvent:   GameEvent.OBSTACLE_HIT,
    timeout:        6000,
  },
  {
    title:          'ENCADENA GOLPES — COMBO',
    description:    'Golpea seguido para multiplicar ×2 → ×3 → ×5\nCombos dan puntos masivos',
    tooltipY:       0.30,
    arrowDirection: 'up-right',
    advanceEvent:   undefined,
    timeout:        6000,
  },
  {
    title:          'OBJETOS DE COLOR = PODERES',
    description:    'Toca los cristales de colores\n¡Cada color da un poder diferente!',
    tooltipY:       0.40,
    arrowDirection: 'right',
    advanceEvent:   GameEvent.POWER_COLLECTED,
    timeout:        7000,
  },
  {
    title:          '¡LLEGA A LA META!',
    description:    'Asciende. La meta está arriba.\nMinimap → muestra tu progreso',
    tooltipY:       0.35,
    arrowDirection: 'up',
    advanceEvent:   undefined,
    timeout:        5000,
  },
];

// ── TutorialManager ─────────────────────────────────────────────────────────

export class TutorialManager {
  private scene: Phaser.Scene;
  private currentStep = -1;
  private currentTooltip?: Phaser.GameObjects.Container;
  private bobTween?: Phaser.Tweens.Tween;
  private stepTimer?: Phaser.Time.TimerEvent;
  private active = false;

  /** Tracks the current EventBus advance handler so we can cleanly remove it. */
  private advanceHandler?: () => void;
  private advanceEvent?: string;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Returns true if tutorial should be shown (first time in MAIN stage). */
  static shouldShow(): boolean {
    return !localStorage.getItem('gs_tutorial_done');
  }

  start(): void {
    if (!TutorialManager.shouldShow()) return;
    this.active = true;
    // Wait 1.5s before first tooltip (original spec), use 2000ms for comfort
    this.scene.time.delayedCall(1500, () => {
      if (this.active) this._showStep(0);
    });
  }

  private _showStep(step: number): void {
    this._dismissCurrent();
    if (step >= TUTORIAL_STEPS.length) {
      this._complete();
      return;
    }
    this.currentStep = step;
    const config = TUTORIAL_STEPS[step];
    this.currentTooltip = this._buildTooltip(config, step);
    this._listenForAdvance(config);

    this.stepTimer = this.scene.time.delayedCall(config.timeout, () => {
      this._showStep(step + 1);
    });
  }

  private _listenForAdvance(config: TutorialStep): void {
    if (!config.advanceEvent) return;

    const handler = () => {
      this._removeAdvanceListener();
      this.stepTimer?.destroy();
      this.stepTimer = undefined;
      this.scene.time.delayedCall(800, () => {
        if (this.active) this._showStep(this.currentStep + 1);
      });
    };

    this.advanceHandler = handler;
    this.advanceEvent   = config.advanceEvent;
    EventBus.once(config.advanceEvent, handler);
  }

  private _removeAdvanceListener(): void {
    if (this.advanceHandler && this.advanceEvent) {
      EventBus.off(this.advanceEvent, this.advanceHandler);
      this.advanceHandler = undefined;
      this.advanceEvent   = undefined;
    }
  }

  private _dismissCurrent(): void {
    this._removeAdvanceListener();
    this.bobTween?.stop();
    this.bobTween = undefined;

    if (this.currentTooltip) {
      const tooltip = this.currentTooltip;
      this.currentTooltip = undefined;
      this.scene.tweens.add({
        targets:  tooltip,
        alpha:    0,
        duration: 200,
        onComplete: () => { tooltip.destroy(); },
      });
    }
  }

  // ── Tooltip builder ───────────────────────────────────────────────────────

  private _buildTooltip(config: TutorialStep, step: number): Phaser.GameObjects.Container {
    const tooltipW = 280;
    const padding  = 14;
    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'monospace',
      fontSize:   '14px',
      fontStyle:  'bold',
      color:      '#00ffff',
      wordWrap:   { width: tooltipW - padding * 2 },
    };
    const descStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'monospace',
      fontSize:   '11px',
      color:      '#e0e0e0',
      wordWrap:   { width: 250 },
    };
    const skipStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'monospace',
      fontSize:   '10px',
      color:      '#888888',
    };

    // Measure text heights to size the box
    const titleText = this.scene.add.text(0, 0, config.title, titleStyle).setVisible(false);
    const descText  = this.scene.add.text(0, 0, config.description, descStyle).setVisible(false);
    const skipText  = this.scene.add.text(0, 0, '[ salta → ]', skipStyle).setVisible(false);

    const titleH = titleText.height;
    const descH  = descText.height;
    const skipH  = skipText.height;
    titleText.destroy();
    descText.destroy();
    skipText.destroy();

    const innerH    = padding + titleH + 6 + descH + 8 + skipH + padding;
    const tooltipH  = Math.max(innerH, 80);
    const arrowSize = 10;

    const container = this.scene.add.container(W / 2, H * config.tooltipY);
    container.setScrollFactor(0);
    container.setDepth(300);
    container.setAlpha(0);

    // ── Background ──────────────────────────────────────────────────────────
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000020, 0.85);
    bg.fillRoundedRect(-tooltipW / 2, 0, tooltipW, tooltipH, 8);
    bg.lineStyle(1.5, 0x00ffff, 1);
    bg.strokeRoundedRect(-tooltipW / 2, 0, tooltipW, tooltipH, 8);
    container.add(bg);

    // ── Arrow triangle ───────────────────────────────────────────────────────
    const arrow = this._buildArrow(config.arrowDirection, tooltipW, tooltipH, arrowSize);
    if (arrow) container.add(arrow);

    // ── Title ────────────────────────────────────────────────────────────────
    const title = this.scene.add.text(
      -tooltipW / 2 + padding,
      padding,
      config.title,
      titleStyle,
    );
    container.add(title);

    // ── Description ──────────────────────────────────────────────────────────
    const desc = this.scene.add.text(
      -tooltipW / 2 + padding,
      padding + titleH + 6,
      config.description,
      descStyle,
    );
    container.add(desc);

    // ── Step dots ─────────────────────────────────────────────────────────────
    const dotY = tooltipH - padding - skipH;
    for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
      const dotGfx = this.scene.add.graphics();
      const color  = i === step ? 0x00ffff : 0x334466;
      dotGfx.fillStyle(color, 1);
      const dotX = -tooltipW / 2 + padding + i * 14;
      dotGfx.fillCircle(dotX, dotY + skipH / 2, 3);
      container.add(dotGfx);
    }

    // ── Skip button ───────────────────────────────────────────────────────────
    const skip = this.scene.add.text(
      tooltipW / 2 - padding,
      dotY,
      '[ salta → ]',
      skipStyle,
    ).setOrigin(1, 0)
     .setInteractive({ useHandCursor: true });

    skip.on('pointerover',  () => skip.setColor('#00ffff'));
    skip.on('pointerout',   () => skip.setColor('#888888'));
    skip.on('pointerdown',  () => {
      this.stepTimer?.destroy();
      this.stepTimer = undefined;
      this._showStep(this.currentStep + 1);
    });
    container.add(skip);

    // ── Fade-in ───────────────────────────────────────────────────────────────
    this.scene.tweens.add({
      targets:  container,
      alpha:    1,
      duration: 300,
      ease:     'Sine.easeOut',
    });

    // ── Bob tween ─────────────────────────────────────────────────────────────
    const baseY = H * config.tooltipY;
    this.bobTween = this.scene.tweens.add({
      targets:    container,
      y:          baseY + 3,
      duration:   900,
      ease:       'Sine.easeInOut',
      yoyo:       true,
      repeat:     -1,
    });

    return container;
  }

  /** Build an arrow Graphics pointing in the given direction, attached at box edges. */
  private _buildArrow(
    dir: TutorialStep['arrowDirection'],
    tooltipW: number,
    tooltipH: number,
    size: number,
  ): Phaser.GameObjects.Graphics | null {
    if (dir === 'none') return null;

    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0x00ffff, 1);

    const hw = tooltipW / 2;

    switch (dir) {
      case 'up': {
        // Triangle above center-top of box
        const cx = 0;
        const ty = -size * 1.6;
        gfx.fillTriangle(cx - size, ty + size, cx + size, ty + size, cx, ty - size * 0.5);
        break;
      }
      case 'down': {
        // Triangle below center-bottom of box
        const cx = 0;
        const by = tooltipH + size * 1.6;
        gfx.fillTriangle(cx - size, by - size, cx + size, by - size, cx, by + size * 0.5);
        break;
      }
      case 'left': {
        const lx = -hw - size * 1.6;
        const cy = tooltipH / 2;
        gfx.fillTriangle(lx + size, cy - size, lx + size, cy + size, lx - size * 0.5, cy);
        break;
      }
      case 'right': {
        const rx = hw + size * 1.6;
        const cy = tooltipH / 2;
        gfx.fillTriangle(rx - size, cy - size, rx - size, cy + size, rx + size * 0.5, cy);
        break;
      }
      case 'up-left': {
        const ax = -hw + size;
        const ay = -size * 1.6;
        gfx.fillTriangle(ax, ay + size * 1.5, ax + size * 1.5, ay, ax - size * 0.3, ay - size * 0.5);
        break;
      }
      case 'up-right': {
        const ax = hw - size;
        const ay = -size * 1.6;
        gfx.fillTriangle(ax, ay + size * 1.5, ax - size * 1.5, ay, ax + size * 0.3, ay - size * 0.5);
        break;
      }
    }

    return gfx;
  }

  // ── Complete ──────────────────────────────────────────────────────────────

  private _complete(): void {
    this.active = false;
    localStorage.setItem('gs_tutorial_done', '1');
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  destroy(): void {
    this.active = false;
    this.stepTimer?.destroy();
    this.stepTimer = undefined;
    this._removeAdvanceListener();
    this.bobTween?.stop();
    this.bobTween = undefined;
    this._dismissCurrent();
  }
}
