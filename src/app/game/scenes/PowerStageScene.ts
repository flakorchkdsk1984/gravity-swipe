import { MainGameScene } from './MainGameScene';
import { IStageConfig } from '../config/types';
import { GameEvent } from '../config/types';
import { EventBus } from '../systems/EventBus';
import { GAME_CONFIG } from '../config/GameConfig';

export class PowerStageScene extends MainGameScene {
  static readonly KEY = 'PowerStageScene';

  private stageConfig!: IStageConfig;
  private powerHudText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: PowerStageScene.KEY });
  }

  init(data: { stageConfig: IStageConfig }): void {
    this.stageConfig = data.stageConfig;
  }

  override create(): void {
    super.create();
    this.cameras.main.setBackgroundColor(this.stageConfig.bgColor);
    this._applyForcedPower();
    this._setupInfinitePower();
    this._addPowerHud();
  }

  private _applyForcedPower(): void {
    if (this.stageConfig.forcedPower && this.player) {
      this.player.applyPower(this.stageConfig.forcedPower);
    }
  }

  private _setupInfinitePower(): void {
    if (!this.stageConfig.infinitePower || !this.stageConfig.forcedPower) return;
    EventBus.on(GameEvent.POWER_EXPIRED, this._applyForcedPower, this);
  }

  private _addPowerHud(): void {
    const cfg = this.stageConfig;
    const hexColor = '#' + cfg.accentColor.toString(16).padStart(6, '0');
    this.powerHudText = this.add.text(
      GAME_CONFIG.width / 2,
      40,
      `${cfg.emoji} ${cfg.name.toUpperCase()} — PODER INFINITO`,
      {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: hexColor,
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center',
      },
    ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(200);
  }

  override shutdown(): void {
    EventBus.off(GameEvent.POWER_EXPIRED, this._applyForcedPower, this);
    super.shutdown();
  }
}
