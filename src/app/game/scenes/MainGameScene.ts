import Phaser from 'phaser';
import { Player }          from '../objects/Player';
import { Obstacle }        from '../objects/Obstacle';
import { Enemy }           from '../objects/Enemy';
import { InputManager }    from '../systems/InputManager';
import { PhysicsManager }  from '../systems/PhysicsManager';
import { LevelGenerator }  from '../systems/LevelGenerator';
import { ObjectPool }      from '../systems/ObjectPool';
import { ComboSystem }     from '../systems/ComboSystem';
import { ScoreManager }    from '../systems/ScoreManager';
import { AudioManager }    from '../systems/AudioManager';
import { ParticleManager } from '../systems/ParticleManager';
import { CameraManager }   from '../systems/CameraManager';
import { EventBus }        from '../systems/EventBus';
import { GameLogger }      from '../systems/GameLogger';
import {
  GameEvent,
  ObstacleConfig, ObstacleType,
  EnemyConfig, EnemyType,
  HitPayload, ComboPayload, ScorePayload,
  GameOverPayload,
  PowerType, PowerConfig, PowerPayload, StageFinishPayload,
} from '../config/types';
import { GAME_CONFIG, COLORS, FINISH_Y, FINISH_CHUNKS, POWER_COLORS } from '../config/GameConfig';
import { PowerObject }   from '../objects/PowerObject';
import { PowerManager }  from '../systems/PowerManager';
import { FinishLine }    from '../systems/FinishLine';
import { TimerManager }  from '../systems/TimerManager';

const W = GAME_CONFIG.width;
const H = GAME_CONFIG.height;

export class MainGameScene extends Phaser.Scene {
  // Core objects
  protected player!: Player;

  // Systems
  private inputManager!:   InputManager;
  private physicsManager!: PhysicsManager;
  private levelGen!:       LevelGenerator;
  private comboSystem!:    ComboSystem;
  private scoreManager!:   ScoreManager;
  private audioManager!:   AudioManager;
  private particleManager!:ParticleManager;
  private cameraManager!:  CameraManager;

  // Pools
  private obstaclePool!: ObjectPool<Obstacle>;
  private enemyPool!:    ObjectPool<Enemy>;
  private powerPool!:    ObjectPool<PowerObject>;

  // Groups for physics
  private obstacleGroup!: Phaser.Physics.Arcade.Group;
  private enemyGroup!:    Phaser.Physics.Arcade.Group;
  private powerGroup!:    Phaser.Physics.Arcade.Group;

  // Power / finish / timer systems
  private powerManager!:  PowerManager;
  private finishLine!:    FinishLine;
  private timerManager!:  TimerManager;
  private stageCompleted = false;

  /** Subclasses can set this to add a base difficulty offset (e.g. FinalStageScene). */
  protected difficultyOffset = 0;

  // Background
  private bgGraphics!: Phaser.GameObjects.Graphics;

  // Game state
  private isGameOver = false;
  private startTime  = 0;
  private totalDistance = 0;

  constructor(config: Phaser.Types.Scenes.SettingsConfig = { key: 'MainGameScene' }) {
    super(config);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  create(): void {
    try {
    this.isGameOver = false;
    this.startTime  = Date.now();
    GameLogger.hookScene(this);
    GameLogger.info('Scene', 'MainGameScene created');

    // Set world bounds (very tall to allow infinite scrolling)
    this.physics.world.setBounds(0, -99999, W, 100000 + H);

    // ── Background ──────────────────────────────────────────────────────────
    this.bgGraphics = this.add.graphics().setDepth(0);
    this._drawBackground();

    // ── Audio (init on first gesture) ───────────────────────────────────────
    this.audioManager = new AudioManager();
    this.input.once('pointerdown', () => { this.audioManager.init(); });

    // ── Pools + groups ──────────────────────────────────────────────────────
    this.obstacleGroup = this.physics.add.group({ runChildUpdate: false });
    this.enemyGroup    = this.physics.add.group({ runChildUpdate: false });
    this.powerGroup    = this.physics.add.group({ runChildUpdate: false });

    this.obstaclePool = new ObjectPool<Obstacle>(
      this,
      () => {
        const obs = new Obstacle(this, {
          type: ObstacleType.WALL_SEGMENT, x: -999, y: -999, hp: 1, pointValue: 50,
        });
        this.obstacleGroup.add(obs);
        return obs;
      },
      20,
    );

    this.enemyPool = new ObjectPool<Enemy>(
      this,
      () => {
        const en = new Enemy(this, {
          type: EnemyType.STATIC, x: -999, y: -999, hp: 1, pointValue: 100,
        });
        this.enemyGroup.add(en);
        return en;
      },
      10,
    );

    this.powerPool = new ObjectPool<PowerObject>(
      this,
      () => {
        const types = Object.values(PowerType);
        const t = types[Math.floor(Math.random() * types.length)];
        const po = new PowerObject(this, { type: t as PowerType, x: -999, y: -999 });
        this.powerGroup.add(po);
        return po;
      },
      14,
    );

    // ── Player ──────────────────────────────────────────────────────────────
    this.player = new Player(this, W / 2, H - 150);

    // ── Systems ─────────────────────────────────────────────────────────────
    this.inputManager   = new InputManager(this);
    this.physicsManager = new PhysicsManager(this, this.player);
    this.physicsManager.registerObstacleGroup(this.obstacleGroup);
    this.physicsManager.registerEnemyGroup(this.enemyGroup);

    this.comboSystem  = new ComboSystem();
    this.scoreManager = new ScoreManager(this);

    this.particleManager = new ParticleManager(this);
    this.cameraManager   = new CameraManager(this);
    this.cameraManager.init(this.player);

    this.levelGen = new LevelGenerator(this, this.obstaclePool, this.enemyPool, this.powerPool);

    // ── Power / Finish / Timer systems ──────────────────────────────────────
    this.powerManager = new PowerManager(this);
    this.finishLine   = new FinishLine(this);
    this.timerManager = new TimerManager();
    this.timerManager.start();
    this.stageCompleted = false;

    // Physics overlap: player ↔ power objects
    this.physics.add.overlap(
      this.player,
      this.powerGroup,
      (_player, powerObj) => {
        const po = powerObj as PowerObject;
        if ((po as any)._active) {
          po.activate();
        }
      },
    );

    // ── Event Listeners ──────────────────────────────────────────────────────
    this._bindEvents();

    // ── UI depth setup ───────────────────────────────────────────────────────
    this.player.setDepth(10);

    // ── Back-to-menu button ──────────────────────────────────────────────────
    this._addMenuButton();

    // Restart via Angular UI button
    window.addEventListener('gs:ui:restart', this._handleRestart);

    // Wire cleanup to scene shutdown event (Phaser.Scene has no overridable shutdown method)
    this.events.once('shutdown', this.shutdown, this);

    // Tell Angular game started
    EventBus.emit(GameEvent.GAME_START, {});
    } catch (e) {
      GameLogger.error('Scene', 'Error in create', e);
      throw e;
    }
  }

  override update(time: number, delta: number): void {
    try {
    GameLogger.tick();
    if (this.isGameOver) return;

    this.cameraManager.update(delta);
    this.inputManager.update(delta);
    this.physicsManager.update(delta);
    this.particleManager.update(delta);
    this.scoreManager.update(delta);

    // Trail particles behind player
    const speed = this.player.getSpeed();
    if (speed > 100) {
      this.particleManager.emitTrail(this.player.x, this.player.y, COLORS.trail);
    }

    // Update player (pass current charge level for visual)
    this.player.update(delta, this.inputManager.getChargeLevel());

    // Update active obstacles and enemies
    for (const obs of this.obstaclePool.getActive()) {
      obs.update(delta);
    }
    for (const en of this.enemyPool.getActive()) {
      en.update(delta, this.player.x, this.player.y);
    }

    // Level generation — follow player upward
    this.levelGen.update(this.player.y);

    // Timer
    this.timerManager.update();

    // Power bobs
    for (const po of this.powerPool.getActive()) {
      po.update(delta);
    }

    // PowerManager freeze: stop obstacle movement when freeze active
    if (this.powerManager.isFreezeActive) {
      for (const obs of this.obstaclePool.getActive()) {
        (obs.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      }
    }

    // PowerManager magnet: pull power objects toward center
    if (this.powerManager.isMagnetActive) {
      const cx = W / 2;
      for (const po of this.powerPool.getActive()) {
        const dx = cx - po.x;
        po.x += dx * 0.03;
      }
    }

    // Emit level progress for minimap
    const totalDist = Math.abs(FINISH_Y - (H - 150));
    const traveled  = Math.abs(this.player.y - (H - 150));
    const progress  = Math.min(1, traveled / totalDist);
    window.dispatchEvent(new CustomEvent('gs:' + GameEvent.LEVEL_PROGRESS, { detail: { progress } }));

    // Check finish line
    if (!this.stageCompleted && this.finishLine.checkPlayerReached(this.player.y, 18)) {
      this._handleStageComplete();
    }

    // Survival score
    this.scoreManager.addSurvivalScore(delta);

    // Scroll background
    this._scrollBackground();

    // Difficulty scales with distance traveled upward
    const chunksPassed = Math.floor(-this.player.y / GAME_CONFIG.level.chunkHeight);
    this.levelGen.setDifficulty(chunksPassed * GAME_CONFIG.level.difficultyScalePerChunk + this.difficultyOffset);
    } catch (e) {
      GameLogger.error('Scene', 'Error in update', e);
    }
  }

  // ── Menu Button ───────────────────────────────────────────────────────────

  private _addMenuButton(): void {
    const pad = 10;
    const btnW = 80;
    const btnH = 30;
    const x = pad + btnW / 2;
    const y = pad + btnH / 2;

    const bg = this.add.graphics()
      .setScrollFactor(0)
      .setDepth(210);
    bg.fillStyle(0x000000, 0.55);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    bg.lineStyle(1.5, 0x6644aa, 0.9);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    bg.setPosition(x, y);

    const label = this.add.text(x, y, '🏠 MENÚ', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ccbbff',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(211);

    // Invisible hit zone
    const zone = this.add.zone(x, y, btnW, btnH)
      .setScrollFactor(0)
      .setDepth(212)
      .setInteractive({ useHandCursor: true });

    zone.on('pointerover', () => {
      label.setColor('#ffffff');
      bg.clear();
      bg.fillStyle(0x331166, 0.9);
      bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
      bg.lineStyle(1.5, 0xaa88ff, 1);
      bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    });
    zone.on('pointerout', () => {
      label.setColor('#ccbbff');
      bg.clear();
      bg.fillStyle(0x000000, 0.55);
      bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
      bg.lineStyle(1.5, 0x6644aa, 0.9);
      bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
    });
    zone.on('pointerup', () => {
      this.scene.start('MenuScene');
    });
  }

  // ── Event Bindings ────────────────────────────────────────────────────────

  private _bindEvents(): void {
    // Obstacle / enemy hit → combo + score + particles
    EventBus.on(GameEvent.OBSTACLE_HIT, (p: HitPayload) => {
      this.comboSystem.onHit(p.position);
      this.scoreManager.addHitScore(p.position, this.comboSystem.getMultiplier());
      this.particleManager.emitHit(p.position.x, p.position.y, 'obstacle');
    }, this);

    EventBus.on(GameEvent.OBSTACLE_DESTROY, (p: { position: { x:number; y:number }; pointValue: number }) => {
      this.comboSystem.onHit(p.position);
      this.scoreManager.addDestroyScore(p.pointValue, p.position, this.comboSystem.getMultiplier() * this.powerManager.scoreMultiplierBonus);
      this.particleManager.emitDestroy(p.position.x, p.position.y, 'obstacle', COLORS.obstacle);
      this.particleManager.emitShockwave(p.position.x, p.position.y, 80);
      EventBus.emit(GameEvent.SCREEN_SHAKE, { intensity: 5, duration: 250 });
    }, this);

    EventBus.on(GameEvent.ENEMY_HIT, (p: { position: { x:number; y:number } }) => {
      this.comboSystem.onHit(p.position);
      this.scoreManager.addHitScore(p.position, this.comboSystem.getMultiplier());
      this.particleManager.emitHit(p.position.x, p.position.y, 'enemy');
    }, this);

    EventBus.on(GameEvent.ENEMY_DESTROY, (p: { position: { x:number; y:number }; pointValue: number }) => {
      this.comboSystem.onHit(p.position);
      this.scoreManager.addDestroyScore(p.pointValue, p.position, this.comboSystem.getMultiplier() * this.powerManager.scoreMultiplierBonus);
      this.particleManager.emitDestroy(p.position.x, p.position.y, 'enemy', COLORS.enemy);
      this.particleManager.emitShockwave(p.position.x, p.position.y, 60);
      EventBus.emit(GameEvent.SCREEN_SHAKE, { intensity: 4, duration: 200 });
    }, this);

    // Near miss
    EventBus.on(GameEvent.PLAYER_NEAR_MISS, (p: { position: { x:number; y:number } }) => {
      this.comboSystem.onNearMiss(p.position);
      this.scoreManager.addNearMissScore(p.position);
      this.particleManager.emitNearMiss(p.position.x, p.position.y);
    }, this);

    // Bounce
    EventBus.on(GameEvent.PLAYER_BOUNCE, (p: { position: { x:number; y:number } }) => {
      this.scoreManager.addBounceScore(p.position, this.comboSystem.getMultiplier());
      this.particleManager.emitBounce(p.position.x, p.position.y, { x: 0, y: 0 });
    }, this);

    // Combo milestones → slow motion
    EventBus.on(GameEvent.COMBO_INCREMENT, (p: ComboPayload) => {
      if (p.count > 0 && p.count % 5 === 0) {
        EventBus.emit(GameEvent.SLOW_MOTION_START, {});
        this.particleManager.emitCombo(this.player.x, this.player.y, p.count);
      }
    }, this);

    // Player dash particles
    EventBus.on(GameEvent.PLAYER_DASH, (p: { position: { x:number; y:number }; direction: { x:number; y:number }; chargeLevel: number }) => {
      this.particleManager.emitDash(p.position.x, p.position.y, p.direction.x, p.direction.y, p.chargeLevel);
    }, this);

    // Death — check shield first
    EventBus.on(GameEvent.PLAYER_DIED, () => {
      if (this.powerManager?.consumeShield()) {
        EventBus.emit(GameEvent.SCREEN_SHAKE, { intensity: 3, duration: 200 });
        return;
      }
      this._handleGameOver();
    }, this);

    // Power collected / expired → player propulsion
    EventBus.on(GameEvent.POWER_COLLECTED, (p: PowerPayload) => {
      this.player.applyPower(p.type);
    }, this);

    EventBus.on(GameEvent.POWER_EXPIRED, () => {
      this.player.resetPower();
    }, this);
  }

  private _handleStageComplete = (): void => {
    if (this.stageCompleted) return;
    this.stageCompleted = true;
    this.timerManager.finish();

    const payload: StageFinishPayload = {
      timeMs:   this.timerManager.getElapsedMs(),
      score:    this.scoreManager.getScore(),
      maxCombo: this.comboSystem.getCombo(),
    };

    // Celebrate FX
    this.particleManager.emitShockwave(this.player.x, this.player.y, 120);
    EventBus.emit(GameEvent.SCREEN_SHAKE, { intensity: 8, duration: 600 });

    this.time.delayedCall(800, () => {
      EventBus.emit(GameEvent.STAGE_FINISH, payload);
    });
  };

  // ── Game Over ─────────────────────────────────────────────────────────────

  private _handleGameOver = (): void => {
    if (this.isGameOver) return;
    this.isGameOver = true;

    const elapsed = (Date.now() - this.startTime) / 1000;
    const payload: GameOverPayload = {
      finalScore:   this.scoreManager.getScore(),
      maxCombo:     this.comboSystem.getCombo(),
      survivalTime: elapsed,
    };

    // Pause physics briefly before emitting game over
    this.time.delayedCall(600, () => {
      EventBus.emit(GameEvent.GAME_OVER, payload);
    });
  };

  private _handleRestart = (): void => {
    this.isGameOver = false;
    this.startTime  = Date.now();

    // Reset systems
    this.comboSystem.reset();
    this.scoreManager.reset();
    this.levelGen.reset();
    this.obstaclePool.releaseAll();
    this.enemyPool.releaseAll();
    this.powerManager.reset();
    this.powerPool.releaseAll();
    this.timerManager.reset();
    this.timerManager.start();
    this.stageCompleted = false;

    // Respawn player (also calls resetPower internally)
    this.player.respawn(W / 2, H - 150);
    this.player.resetPower();

    // Reset camera
    this.cameras.main.scrollY = 0;
    this.cameras.main.setZoom(GAME_CONFIG.camera.zoomDefault);

    EventBus.emit(GameEvent.GAME_START, {});
    EventBus.emit(GameEvent.GAME_RESTART, {});
  };

  // ── Background ─────────────────────────────────────────────────────────────

  private _drawBackground(): void {
    const gfx  = this.bgGraphics;
    const cam  = this.cameras.main;
    gfx.clear();

    // Fill
    gfx.fillStyle(COLORS.background, 1);
    gfx.fillRect(0, -99999, W, 200000);

    // Neon grid
    gfx.lineStyle(1, COLORS.bgGrid, 0.5);
    const gridSize = 60;
    for (let x = 0; x <= W; x += gridSize) {
      gfx.lineBetween(x, -99999, x, 99999);
    }
    for (let y = -99999; y <= 99999; y += gridSize) {
      gfx.lineBetween(0, y, W, y);
    }
  }

  private _scrollBackground(): void {
    // Background scrolls with camera
    this.bgGraphics.setPosition(0, 0);
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  // Called when this scene is shut down / restarted.
  // Not typed on Phaser.Scene but it exists at runtime.
  shutdown(): void {
    window.removeEventListener('gs:ui:restart', this._handleRestart as EventListener);
    EventBus.removeAllListeners();
    this.powerManager?.destroy();
    this.finishLine?.destroy();
    this.obstaclePool?.destroy();
    this.enemyPool?.destroy();
    this.powerPool?.destroy();
    this.inputManager?.destroy();
    this.cameraManager?.destroy();
    this.particleManager?.destroy();
    this.audioManager?.destroy();
  }
}
