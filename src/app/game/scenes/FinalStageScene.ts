import { MainGameScene } from './MainGameScene';
import { GAME_CONFIG } from '../config/GameConfig';

export class FinalStageScene extends MainGameScene {
  static readonly KEY = 'FinalStageScene';

  constructor() {
    super({ key: FinalStageScene.KEY });
  }

  override create(): void {
    // Boost difficulty before super.create so level gen picks it up immediately
    this.difficultyOffset = 1.5;
    super.create();
    this.cameras.main.setBackgroundColor(0x0d0005);
    this._addFinalStageHud();
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

    // Pulsing tween on the trophy text
    this.tweens.add({
      targets: text,
      alpha: { from: 1, to: 0.5 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
