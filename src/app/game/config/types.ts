// ============================================================
// SHARED TYPES & INTERFACES
// All systems import from here to stay decoupled.
// ============================================================

export interface Vec2 {
  x: number;
  y: number;
}

// ── Player State ─────────────────────────────────────────────
export interface PlayerState {
  position: Vec2;
  velocity: Vec2;
  chargeLevel: number;      // 0-1, normalized
  isCharging: boolean;
  isDashing: boolean;
  isAlive: boolean;
  comboCount: number;
  score: number;
}

// ── Input ────────────────────────────────────────────────────
export interface TouchInputState {
  isDown: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  chargeStartTime: number;   // performance.now() timestamp
  chargeLevel: number;       // 0-1
  aimDirection: Vec2;        // normalized direction vector
}

// ── Events (EventBus topics) ─────────────────────────────────
export enum GameEvent {
  // Input
  CHARGE_START     = 'charge:start',
  CHARGE_UPDATE    = 'charge:update',
  CHARGE_RELEASE   = 'charge:release',

  // Player
  PLAYER_DASH      = 'player:dash',
  PLAYER_BOUNCE    = 'player:bounce',
  PLAYER_DIED      = 'player:died',
  PLAYER_NEAR_MISS = 'player:nearMiss',

  // Destruction
  OBSTACLE_HIT     = 'obstacle:hit',
  OBSTACLE_DESTROY = 'obstacle:destroy',
  ENEMY_HIT        = 'enemy:hit',
  ENEMY_DESTROY    = 'enemy:destroy',

  // Combo & Score
  COMBO_INCREMENT  = 'combo:increment',
  COMBO_BREAK      = 'combo:break',
  SCORE_UPDATED    = 'score:updated',
  MULTIPLIER_CHANGE= 'multiplier:change',

  // FX
  SLOW_MOTION_START= 'fx:slowMotionStart',
  SLOW_MOTION_END  = 'fx:slowMotionEnd',
  SCREEN_SHAKE     = 'fx:screenShake',
  HIT_FLASH        = 'fx:hitFlash',

  // Game State
  GAME_START       = 'game:start',
  GAME_OVER        = 'game:over',
  GAME_RESTART     = 'game:restart',
  LEVEL_PROGRESS   = 'level:progress',

  // Powers
  POWER_COLLECTED  = 'power:collected',
  POWER_EXPIRED    = 'power:expired',
  POWER_ACTIVATED  = 'power:activated',
  PLAYER_COLOR_CHANGE = 'player:colorChange',
  // Stage
  STAGE_FINISH     = 'stage:finish',
  TIMER_UPDATE     = 'timer:update',
}

// ── Event Payloads ───────────────────────────────────────────
export interface DashPayload {
  position: Vec2;
  direction: Vec2;
  speed: number;
  chargeLevel: number;
}

export interface HitPayload {
  position: Vec2;
  targetType: 'obstacle' | 'enemy' | 'wall';
  velocity: Vec2;
  comboCount: number;
}

export interface ComboPayload {
  count: number;
  multiplier: number;
  position: Vec2;
}

export interface ScorePayload {
  score: number;
  delta: number;
  multiplier: number;
}

export interface ShakePayload {
  intensity: number;
  duration: number;
}

export interface GameOverPayload {
  finalScore: number;
  maxCombo: number;
  survivalTime: number;
  stageCompleted?: boolean;
  finishTimeMs?: number;
}

// ── Obstacle Definitions ─────────────────────────────────────
export enum ObstacleType {
  WALL_SEGMENT  = 'wall_segment',
  BUMPER        = 'bumper',
  SPINNER       = 'spinner',
  PLATFORM      = 'platform',
  SHIELD        = 'shield',
}

export interface ObstacleConfig {
  type: ObstacleType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  rotation?: number;
  speed?: number;        // for moving obstacles
  hp: number;
  pointValue: number;
}

// ── Enemy Definitions ────────────────────────────────────────
export enum EnemyType {
  STATIC   = 'static',
  DRIFTER  = 'drifter',
  ORBITER  = 'orbiter',
}

export interface EnemyConfig {
  type: EnemyType;
  x: number;
  y: number;
  speed?: number;
  orbitRadius?: number;
  hp: number;
  pointValue: number;
}

// ── Level Chunk ──────────────────────────────────────────────
export interface LevelChunk {
  id: number;
  yOffset: number;
  obstacles: ObstacleConfig[];
  enemies: EnemyConfig[];
}

// ── Game Config (runtime, from GameConfig.ts) ────────────────
export interface IGameConfig {
  width: number;
  height: number;
  physics: {
    gravity: number;
    playerRadius: number;
    dashBaseSpeed: number;
    dashMaxSpeed: number;
    maxChargeTime: number;
    bounceRestitution: number;
    friction: number;
  };
  combo: {
    window: number;           // ms to chain hits
    multiplierThresholds: number[];  // [0,3,6,12,20] → x1,x2,x3,x4,x5
  };
  scoring: {
    hitBase: number;
    destroyBase: number;
    nearMissBonus: number;
    bounceBonus: number;
  };
  level: {
    chunkHeight: number;
    spawnAheadChunks: number;
    despawnBehindChunks: number;
    difficultyScalePerChunk: number;
  };
  camera: {
    followLerp: number;
    shakeDecay: number;
    zoomDefault: number;
    zoomDash: number;
  };
  fx: {
    slowMotionScale: number;
    slowMotionDuration: number;
    trailLength: number;
    particleCount: number;
  };
}

// ── Power System ─────────────────────────────────────────────
export enum PowerType {
  SPEED_BOOST = 'speed_boost',  // 🔴 Red
  SHIELD      = 'shield',       // 🟠 Orange
  SCORE_X2    = 'score_x2',     // 🟡 Yellow
  SLOW_EXTEND = 'slow_extend',  // 🟢 Green
  FREEZE      = 'freeze',       // 🔵 Blue
  GHOST       = 'ghost',        // 🟣 Purple
  MAGNET      = 'magnet',       // ⚪ White
}

export interface PowerConfig {
  type: PowerType;
  x: number;
  y: number;
}

export interface PowerPayload {
  type: PowerType;
  position: Vec2;
}

// ── Propulsion Types ──────────────────────────────────────────
export enum PropulsionType {
  DEFAULT        = 'default',
  ROCKET         = 'rocket',
  BOUNCER        = 'bouncer',
  LIGHTNING      = 'lightning',
  GRAVITY_DRIFT  = 'gravity_drift',
  ICE_GLIDE      = 'ice_glide',
  PHASE          = 'phase',
  ORBIT_SHOT     = 'orbit_shot',
}

// ── Finish / Stage ────────────────────────────────────────────
export interface StageFinishPayload {
  timeMs: number;       // milliseconds from game start to finish
  score: number;
  maxCombo: number;
}
