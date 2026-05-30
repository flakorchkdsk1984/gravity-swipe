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
  StageType,
} from '../config/types';
import { GAME_CONFIG, COLORS, FINISH_Y, FINISH_CHUNKS, POWER_COLORS } from '../config/GameConfig';
import { PowerObject }   from '../objects/PowerObject';
import { PowerManager }  from '../systems/PowerManager';
import { FinishLine }    from '../systems/FinishLine';
import { TimerManager }  from '../systems/TimerManager';
import { TutorialManager } from '../systems/TutorialManager';
import { StoryManager }  from '../systems/StoryManager';
import { VictoryMusicSystem } from '../systems/VictoryMusicSystem';

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

  // Tutorial
  private tutorialManager?: TutorialManager;

  /** Subclasses can set this to add a base difficulty offset (e.g. FinalStageScene). */
  protected difficultyOffset = 0;

  /** Subclasses override to return the StageType that should be unlocked after this scene completes. */
  protected _getCompletedStageType(): StageType {
    return StageType.MAIN;
  }

  // Background
  private bgGraphics!: Phaser.GameObjects.Graphics;

  // Game state
  protected isGameOver = false;
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

    // ── Tutorial (first play only) ────────────────────────────────────────────
    if (TutorialManager.shouldShow()) {
      this.tutorialManager = new TutorialManager(this);
      this.tutorialManager.start();
    }

    // ── UI depth setup ───────────────────────────────────────────────────────
    this.player.setDepth(10);

    // ── Back-to-menu button ──────────────────────────────────────────────────
    this._addMenuButton();

    // Restart via Angular UI button
    window.addEventListener('gs:ui:restart', this._handleRestart);
    window.addEventListener('gs:ui:stage-select', this._handleGoToStageSelect);

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
    const r   = 22;          // circle radius
    const x   = W - r - 10; // top-right corner
    const y   = r + 10;

    // Outer pulse ring (animates)
    const ring = this.add.graphics().setScrollFactor(0).setDepth(500);
    const drawRing = (alpha: number, scale: number) => {
      ring.clear();
      ring.lineStyle(2, 0xff4444, alpha);
      ring.strokeCircle(x, y, r * scale);
    };
    drawRing(0.6, 1);

    // Solid circle background
    const circle = this.add.graphics().setScrollFactor(0).setDepth(501);
    circle.fillStyle(0x220000, 0.88);
    circle.fillCircle(x, y, r);
    circle.lineStyle(2, 0xff4444, 1);
    circle.strokeCircle(x, y, r);

    // Exit icon: big ✕
    const icon = this.add.text(x, y, '✕', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ff5555',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(502);

    // Pulse tween on ring
    let ringScale = 1;
    let ringDir   = 1;
    const pulseTimer = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        ringScale += 0.008 * ringDir;
        if (ringScale >= 1.45) ringDir = -1;
        if (ringScale <= 1.0)  ringDir =  1;
        drawRing(0.5 - (ringScale - 1) * 0.8, ringScale);
      },
    });

    // Hit zone
    const zone = this.add.zone(x, y, r * 2 + 10, r * 2 + 10)
      .setScrollFactor(0)
      .setDepth(503)
      .setInteractive({ useHandCursor: true });

    zone.on('pointerover', () => {
      icon.setColor('#ffffff');
      circle.clear();
      circle.fillStyle(0x660000, 0.95);
      circle.fillCircle(x, y, r);
      circle.lineStyle(2.5, 0xff2222, 1);
      circle.strokeCircle(x, y, r);
      this.tweens.add({ targets: icon, scaleX: 1.2, scaleY: 1.2, duration: 100 });
    });
    zone.on('pointerout', () => {
      icon.setColor('#ff5555');
      circle.clear();
      circle.fillStyle(0x220000, 0.88);
      circle.fillCircle(x, y, r);
      circle.lineStyle(2, 0xff4444, 1);
      circle.strokeCircle(x, y, r);
      this.tweens.add({ targets: icon, scaleX: 1, scaleY: 1, duration: 100 });
    });
    zone.on('pointerdown', () => {
      this.tweens.add({ targets: icon, scaleX: 0.85, scaleY: 0.85, duration: 80 });
    });
    zone.on('pointerup', () => {
      pulseTimer.destroy();
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
      this.inputManager.setActivePower(p.type);  // ADD
    }, this);

    EventBus.on(GameEvent.POWER_EXPIRED, () => {
      this.player.resetPower();
      this.inputManager.setActivePower(null);  // ADD
    }, this);
  }

  private _handleStageComplete = (): void => {
    if (this.stageCompleted) return;
    this.stageCompleted = true;
    this.isGameOver = true;   // Freeze game loop while overlay is visible
    this.timerManager.finish();

    StoryManager.getInstance().unlockNext(this._getCompletedStageType());

    const payload: StageFinishPayload = {
      timeMs:   this.timerManager.getElapsedMs(),
      score:    this.scoreManager.getScore(),
      maxCombo: this.comboSystem.getCombo(),
    };

    // Celebrate FX
    this.particleManager.emitShockwave(this.player.x, this.player.y, 120);
    EventBus.emit(GameEvent.SCREEN_SHAKE, { intensity: 8, duration: 600 });

    // Play Indian-style victory melody (5 seconds, Web Audio API)
    VictoryMusicSystem.play();

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
    // Clear any pending delayedCall timers (e.g. GAME_OVER/STAGE_FINISH that
    // might fire after restart and flip isGameOver back to true)
    this.time.removeAllEvents();

    this.isGameOver    = false;
    this.stageCompleted = false;
    this.startTime     = Date.now();

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

    // Respawn player (also calls resetPower internally)
    this.player.respawn(W / 2, H - 150);
    this.player.resetPower();
    this.inputManager.setActivePower(null);

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
  private _handleGoToStageSelect = (): void => {
    // Reset Angular overlay BEFORE switching scene, otherwise the
    // StageSelectScene renders behind the still-visible game-over overlay.
    EventBus.emit(GameEvent.GAME_START, {});
    // Small delay so Angular can process the state reset before scene swap
    this.time.delayedCall(50, () => {
      this.scene.start('StageSelectScene');
    });
  };

  // Not typed on Phaser.Scene but it exists at runtime.
  shutdown(): void {
    window.removeEventListener('gs:ui:restart', this._handleRestart as EventListener);
    window.removeEventListener('gs:ui:stage-select', this._handleGoToStageSelect as EventListener);
    this.tutorialManager?.destroy();
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
