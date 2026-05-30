import { MainGameScene } from './MainGameScene';
import { StageType } from '../config/types';
import { GAME_CONFIG } from '../config/GameConfig';
import { StageIntroPanel } from '../systems/StageIntroPanel';
import { getStageConfig } from '../config/StageConfig';

export class FinalStageScene extends MainGameScene {
  static readonly KEY = 'FinalStageScene';
  private introPanel!: StageIntroPanel;

  constructor() {
    super({ key: FinalStageScene.KEY });
  }

  override create(): void {
    // Boost difficulty before super.create so level gen picks it up immediately
    this.difficultyOffset = 1.5;
    super.create();
    this.cameras.main.setBackgroundColor(0x0d0005);
    this._addFinalStageHud();

    // Freeze game until player dismisses intro
    this.isGameOver = true;
    this.introPanel = new StageIntroPanel(this);
    this.introPanel.show(getStageConfig(StageType.FINAL), () => {
      this.isGameOver = false;
    });
  }

  protected override _getCompletedStageType(): StageType {
    return StageType.FINAL;
  }

  private _addFinalStageHud(): void {
    const text = this.add.text(
      GAME_CONFIG.width / 2,
      40,
      '🏆 ETAPA FINAL',
      {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
      },
    ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(200);

    this.tweens.add({
      targets: text,
      alpha: { from: 1, to: 0.5 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  override shutdown(): void {
    this.introPanel?.destroy();
    super.shutdown();
  }
}
