import Phaser from 'phaser';
import { StageType } from '../config/types';
import { StoryManager } from '../systems/StoryManager';
import { GAME_CONFIG } from '../config/GameConfig';

const W = GAME_CONFIG.width;
const H = GAME_CONFIG.height;

export class StoryScene extends Phaser.Scene {
  static readonly KEY = 'StoryScene';

  private nextSceneKey!: string;
  private nextSceneData?: object;
  private stageType!: StageType;
  private lineObjects: Phaser.GameObjects.Text[] = [];
  private currentLineIdx = 0;
  private typewriterTimer?: Phaser.Time.TimerEvent;
  private canAdvance = false;
  private continueText!: Phaser.GameObjects.Text;
  private autoAdvanceTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: StoryScene.KEY });
  }

  init(data: { stageType: StageType; nextSceneKey: string; nextSceneData?: object }): void {
    this.nextSceneKey = data.nextSceneKey;
    this.nextSceneData = data.nextSceneData;
    this.stageType = data.stageType;
    this.lineObjects = [];
    this.currentLineIdx = 0;
    this.canAdvance = false;
  }

  create(): void {
    // Background
    this.add.rectangle(W / 2, H / 2, W, H, 0x000008);

    // Subtle grid
    const grid = this.add.graphics();
    grid.lineStyle(1, 0x111130, 0.3);
    for (let x = 0; x <= W; x += 60) grid.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 60) grid.lineBetween(0, y, W, y);

    const act = StoryManager.getInstance().getStoryAct(this.stageType);

    // Act title
    const titleText = this.add.text(W / 2, H * 0.12, act.title, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffd700',
      stroke: '#332200',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5, 0.5).setAlpha(0);
    this.tweens.add({ targets: titleText, alpha: 1, duration: 800 });

    // Continue prompt (hidden initially, blink tween starts paused)
    this.continueText = this.add.text(W / 2, H * 0.88, '[ toca para continuar ]', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#888888',
    }).setOrigin(0.5, 0.5).setAlpha(0);

    this.tweens.add({
      targets: this.continueText,
      alpha: { from: 0.3, to: 1 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      paused: true,
    });

    // Create text objects for each story line (empty, filled by typewriter)
    const startY = H * 0.28;
    const lineSpacing = 36;
    act.lines.forEach((_, i) => {
      const t = this.add.text(W / 2, startY + i * lineSpacing, '', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#e0e0ff',
        align: 'center',
        wordWrap: { width: W - 60 },
      }).setOrigin(0.5, 0);
      this.lineObjects.push(t);
    });

    // Start typewriter after short delay
    this.time.delayedCall(1000, () => this._typeNextLine(act.lines));

    // Input to advance
    this.input.on('pointerup', () => {
      if (this.canAdvance) {
        this._proceed();
      } else {
        this._skipToEnd(act.lines);
      }
    });

    // Auto-advance after 10 seconds
    this.autoAdvanceTimer = this.time.delayedCall(10000, () => this._proceed());
  }

  private _typeNextLine(lines: string[]): void {
    if (this.currentLineIdx >= lines.length) {
      this._onAllLinesComplete();
      return;
    }
    const line = lines[this.currentLineIdx];
    const textObj = this.lineObjects[this.currentLineIdx];
    let charIdx = 0;

    if (line === '') {
      this.currentLineIdx++;
      this.time.delayedCall(200, () => this._typeNextLine(lines));
      return;
    }

    this.typewriterTimer = this.time.addEvent({
      delay: 45,
      repeat: line.length - 1,
      callback: () => {
        charIdx++;
        textObj.setText(line.substring(0, charIdx));
        if (charIdx >= line.length) {
          this.currentLineIdx++;
          this.time.delayedCall(350, () => this._typeNextLine(lines));
        }
      },
    });
  }

  private _skipToEnd(lines: string[]): void {
    this.typewriterTimer?.destroy();
    lines.forEach((line, i) => this.lineObjects[i]?.setText(line));
    this.currentLineIdx = lines.length;
    this._onAllLinesComplete();
  }

  private _onAllLinesComplete(): void {
    this.canAdvance = true;
    this.continueText.setAlpha(0.3);
    this.tweens.getTweensOf(this.continueText).forEach(t => t.play());
  }

  private _proceed(): void {
    if (this.autoAdvanceTimer) this.autoAdvanceTimer.destroy();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(400, () => {
      this.scene.start(this.nextSceneKey, this.nextSceneData);
    });
  }
}
