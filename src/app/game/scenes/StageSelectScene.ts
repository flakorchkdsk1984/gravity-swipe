import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/GameConfig';
import { STAGE_CONFIGS } from '../config/StageConfig';
import { IStageConfig } from '../config/types';

const W = GAME_CONFIG.width as number;
const H = GAME_CONFIG.height as number;

const TITLE_BAR_H = 70;
const CARD_W = 178;
const CARD_H = 130;
const PAD_X = 8;
const PAD_Y = 8;
const START_X = 9;
const START_Y = 8;
const COLS = 2;

export class StageSelectScene extends Phaser.Scene {
  static readonly KEY = 'StageSelectScene';

  private cardContainer!: Phaser.GameObjects.Container;
  private maxScrollY = 0;
  private pointerDown = false;
  private lastPointerY = 0;

  constructor() {
    super({ key: StageSelectScene.KEY });
  }

  create(): void {
    this.add.rectangle(W / 2, H / 2, W, H, 0x080810);
    this._createTitleBar();
    this._createCards();
    this._setupScrollInput();
  }

  private _createTitleBar(): void {
    this.add.rectangle(W / 2, TITLE_BAR_H / 2, W, TITLE_BAR_H, 0x111122).setDepth(10);

    this.add.text(W / 2, TITLE_BAR_H / 2, '⚡ SELECCIONAR ETAPA', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(11);

    const backBtn = this.add.text(16, TITLE_BAR_H / 2, '← MENÚ', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#aaaaff',
    }).setOrigin(0, 0.5).setDepth(11).setInteractive({ useHandCursor: true });

    backBtn.on('pointerup', () => this.scene.start('MenuScene'));
    backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout', () => backBtn.setColor('#aaaaff'));
  }

  private _createCards(): void {
    this.cardContainer = this.add.container(0, TITLE_BAR_H);

    STAGE_CONFIGS.forEach((cfg, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = START_X + col * (CARD_W + PAD_X) + CARD_W / 2;
      const y = START_Y + row * (CARD_H + PAD_Y) + CARD_H / 2;
      this.cardContainer.add(this._createCard(cfg, x, y));
    });

    const rows = Math.ceil(STAGE_CONFIGS.length / COLS);
    const totalH = START_Y + rows * (CARD_H + PAD_Y) + PAD_Y;
    const visibleH = H - TITLE_BAR_H;
    this.maxScrollY = Math.max(0, totalH - visibleH);
  }

  private _createCard(cfg: IStageConfig, x: number, y: number): Phaser.GameObjects.Container {
    const card = this.add.container(x, y);
    const hw = CARD_W / 2;
    const hh = CARD_H / 2;

    const bg = this.add.graphics();
    bg.fillStyle(cfg.bgColor, 0.9);
    bg.fillRoundedRect(-hw, -hh, CARD_W, CARD_H, 10);
    bg.lineStyle(2, cfg.accentColor, 1);
    bg.strokeRoundedRect(-hw, -hh, CARD_W, CARD_H, 10);

    const emojiText = this.add.text(0, -hh + 22, cfg.emoji, {
      fontSize: '26px',
    }).setOrigin(0.5, 0.5);

    const nameText = this.add.text(0, -hh + 52, cfg.name.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: CARD_W - 16 },
    }).setOrigin(0.5, 0.5);

    const descText = this.add.text(0, -hh + 85, cfg.description, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#aaaaaa',
      align: 'center',
      wordWrap: { width: CARD_W - 20 },
    }).setOrigin(0.5, 0.5);

    const hitZone = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hitZone.on('pointerover', () => {
      this.tweens.add({ targets: card, scaleX: 1.05, scaleY: 1.05, duration: 80, ease: 'Power1' });
    });
    hitZone.on('pointerout', () => {
      this.tweens.add({ targets: card, scaleX: 1, scaleY: 1, duration: 80, ease: 'Power1' });
    });
    hitZone.on('pointerdown', () => {
      this.tweens.add({ targets: card, scaleX: 0.95, scaleY: 0.95, duration: 60, ease: 'Power1' });
    });
    hitZone.on('pointerup', () => {
      if (!this._wasDragging()) {
        this.tweens.add({ targets: card, scaleX: 1, scaleY: 1, duration: 80, ease: 'Power1' });
        this._startStage(cfg);
      }
    });

    card.add([bg, emojiText, nameText, descText, hitZone]);
    return card;
  }

  private _startStage(cfg: IStageConfig): void {
    switch (cfg.sceneKey) {
      case 'PowerStageScene':
        this.scene.start('PowerStageScene', { stageConfig: cfg });
        break;
      case 'FinalStageScene':
        this.scene.start('FinalStageScene');
        break;
      default:
        this.scene.start('MainGameScene');
    }
  }

  // Drag distance threshold — suppresses tap-on-card after scroll
  private _dragMoved = false;
  private _wasDragging(): boolean {
    return this._dragMoved;
  }

  private _setupScrollInput(): void {
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.pointerDown = true;
      this._dragMoved = false;
      this.lastPointerY = ptr.y;
    });

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!this.pointerDown || this.maxScrollY === 0) return;
      const delta = ptr.y - this.lastPointerY;
      if (Math.abs(delta) > 4) this._dragMoved = true;
      this.lastPointerY = ptr.y;
      this.cardContainer.y = Phaser.Math.Clamp(
        this.cardContainer.y + delta,
        TITLE_BAR_H - this.maxScrollY,
        TITLE_BAR_H,
      );
    });

    this.input.on('pointerup', () => {
      this.pointerDown = false;
    });

    this.input.on('wheel', (_ptr: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number) => {
      if (this.maxScrollY === 0) return;
      this.cardContainer.y = Phaser.Math.Clamp(
        this.cardContainer.y - dy * 0.5,
        TITLE_BAR_H - this.maxScrollY,
        TITLE_BAR_H,
      );
    });
  }
}
