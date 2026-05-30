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
} from '../config/types';
import { GAME_CONFIG, COLORS } from '../config/GameConfig';

const W = GAME_CONFIG.width;
const H = GAME_CONFIG.height;

export class MainGameScene extends Phaser.Scene {
  // Core objects
  private player!: Player;

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

  // Groups for physics
  private obstacleGroup!: Phaser.Physics.Arcade.Group;
  private enemyGroup!:    Phaser.Physics.Arcade.Group;

  // Background
  private bgGraphics!: Phaser.GameObjects.Graphics;

  // Game state
  private isGameOver = false;
  private startTime  = 0;
  private totalDistance = 0;

  constructor() {
    super({ key: 'MainGameScene' });
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

    this.levelGen = new LevelGenerator(this, this.obstaclePool, this.enemyPool);

    // ── Event Listeners ──────────────────────────────────────────────────────
    this._bindEvents();

    // ── UI depth setup ───────────────────────────────────────────────────────
    this.player.setDepth(10);

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

    // Survival score
    this.scoreManager.addSurvivalScore(delta);

    // Scroll background
    this._scrollBackground();

    // Difficulty scales with distance traveled upward
    const chunksPassed = Math.floor(-this.player.y / GAME_CONFIG.level.chunkHeight);
    this.levelGen.setDifficulty(chunksPassed * GAME_CONFIG.level.difficultyScalePerChunk);
    } catch (e) {
      GameLogger.error('Scene', 'Error in update', e);
    }
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
      this.scoreManager.addDestroyScore(p.pointValue, p.position, this.comboSystem.getMultiplier());
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
      this.scoreManager.addDestroyScore(p.pointValue, p.position, this.comboSystem.getMultiplier());
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

    // Death
    EventBus.on(GameEvent.PLAYER_DIED, this._handleGameOver, this);
  }

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

    // Respawn player
    this.player.respawn(W / 2, H - 150);

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
    this.obstaclePool?.destroy();
    this.enemyPool?.destroy();
    this.inputManager?.destroy();
    this.cameraManager?.destroy();
    this.particleManager?.destroy();
    this.audioManager?.destroy();
  }
}
