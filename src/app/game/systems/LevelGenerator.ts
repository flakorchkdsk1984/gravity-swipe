import Phaser from 'phaser';
import {
  GameEvent,
  LevelChunk,
  ObstacleConfig, ObstacleType,
  EnemyConfig,    EnemyType,
} from '../config/types';
import { GAME_CONFIG } from '../config/GameConfig';
import { EventBus } from './EventBus';
import { ObjectPool } from './ObjectPool';
import { Obstacle } from '../objects/Obstacle';
import { Enemy } from '../objects/Enemy';

/** Layout pattern identifiers. */
type Pattern = 'A' | 'B' | 'C' | 'D' | 'E';

interface ChunkData {
  chunk: LevelChunk;
  obstacles: Obstacle[];
  enemies: Enemy[];
}

/**
 * LevelGenerator — procedural infinite-level system.
 *
 * Coordinate system
 * -----------------
 * The game world scrolls upward: the player's Y decreases as they ascend.
 * Chunk N occupies the Y range:
 *   top    = startY − (N + 1) × chunkHeight
 *   bottom = startY − N × chunkHeight
 *
 * startY is captured from playerY on the first update() call.
 *
 * Playability guarantee
 * ----------------------
 * Every pattern leaves a clear vertical corridor ≥ MIN_GAP pixels wide
 * so the player can always reach the top of the chunk.
 */
export class LevelGenerator {
  private readonly scene: Phaser.Scene;
  private readonly obstaclePool: ObjectPool<Obstacle>;
  private readonly enemyPool: ObjectPool<Enemy>;

  private activeChunks   = new Map<number, ChunkData>();
  private spawnedIndices = new Set<number>();

  private startY            = -1;
  private currentDifficulty = 0;

  private readonly chunkH   : number;
  private readonly gameW    : number;
  private readonly spawnAhead  : number;
  private readonly despawnBehind: number;

  /** Minimum clear gap across every horizontal row of a chunk (px). */
  private static readonly MIN_GAP = 72;

  constructor(
    scene: Phaser.Scene,
    obstaclePool: ObjectPool<Obstacle>,
    enemyPool: ObjectPool<Enemy>,
  ) {
    this.scene        = scene;
    this.obstaclePool = obstaclePool;
    this.enemyPool    = enemyPool;

    this.chunkH        = GAME_CONFIG.level.chunkHeight;
    this.gameW         = GAME_CONFIG.width;
    this.spawnAhead    = GAME_CONFIG.level.spawnAheadChunks;
    this.despawnBehind = GAME_CONFIG.level.despawnBehindChunks;

    EventBus.on(GameEvent.GAME_RESTART, this.reset, this);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Call every frame with the player's current Y position. */
  update(playerY: number): void {
    if (this.startY === -1) this.startY = playerY;

    const current = this._chunkAt(playerY);

    // Spawn chunks from current position forward
    for (let i = Math.max(0, current); i <= current + this.spawnAhead; i++) {
      if (!this.spawnedIndices.has(i)) {
        this._spawnChunk(i);
        this.spawnedIndices.add(i);
      }
    }

    this._despawnOldChunks(playerY);
  }

  setDifficulty(level: number): void {
    this.currentDifficulty = level;
  }

  reset(): void {
    for (const data of this.activeChunks.values()) {
      data.obstacles.forEach(o => this.obstaclePool.release(o));
      data.enemies.forEach(e => this.enemyPool.release(e));
    }
    this.activeChunks.clear();
    this.spawnedIndices.clear();
    this.startY            = -1;
    this.currentDifficulty = 0;
  }

  // ── Core chunk lifecycle ────────────────────────────────────────────────────

  private _spawnChunk(chunkIndex: number): void {
    const chunk     = this._generateChunk(chunkIndex);
    const obstacles : Obstacle[] = [];
    const enemies   : Enemy[]    = [];

    for (const cfg of chunk.obstacles) {
      const obs = this.obstaclePool.get();
      if (obs) { obs.reset(cfg); obstacles.push(obs); }
    }
    for (const cfg of chunk.enemies) {
      const en = this.enemyPool.get();
      if (en) { en.reset(cfg); enemies.push(en); }
    }

    this.activeChunks.set(chunkIndex, { chunk, obstacles, enemies });
  }

  private _generateChunk(index: number): LevelChunk {
    // Chunk 0 is the safe spawn area — no obstacles
    if (index === 0) {
      return { id: index, yOffset: this._chunkTopY(index), obstacles: [], enemies: [] };
    }

    const diff    = this._difficultyAt(index);
    const pattern = this._selectPattern(index, diff);
    const topY    = this._chunkTopY(index);

    return this._buildPattern(pattern, index, topY, diff);
  }

  private _despawnOldChunks(playerY: number): void {
    const threshold = this._chunkAt(playerY) - this.despawnBehind;
    for (const [index, data] of this.activeChunks) {
      if (index < threshold) {
        data.obstacles.forEach(o => this.obstaclePool.release(o));
        data.enemies.forEach(e => this.enemyPool.release(e));
        this.activeChunks.delete(index);
      }
    }
  }

  // ── Pattern builder dispatcher ──────────────────────────────────────────────

  private _buildPattern(
    pattern: Pattern,
    index: number,
    topY: number,
    diff: number,
  ): LevelChunk {
    const obstacles: ObstacleConfig[] = [];
    const enemies: EnemyConfig[]      = [];
    const W = this.gameW;
    const H = this.chunkH;
    // Gap narrows with difficulty, always playable (≥ MIN_GAP)
    const gap = Math.max(LevelGenerator.MIN_GAP, 130 - diff * 14);

    switch (pattern) {
      case 'A': this._patternTwoWalls(obstacles, topY, W, H, gap, diff);             break;
      case 'B': this._patternBumperCluster(obstacles, topY, W, H, diff);             break;
      case 'C': this._patternPlatforms(obstacles, enemies, topY, W, H, diff);        break;
      case 'D': this._patternEnemyGauntlet(obstacles, enemies, topY, W, H, diff);   break;
      case 'E': this._patternSpinnerMaze(obstacles, topY, W, H, gap, diff);          break;
    }

    return { id: index, yOffset: topY, obstacles, enemies };
  }

  // ── Pattern A — Two walls with a guaranteed center gap ──────────────────────
  private _patternTwoWalls(
    out: ObstacleConfig[],
    topY: number, W: number, H: number, gap: number, diff: number,
  ): void {
    const rows = 2 + Math.floor(diff * 1.5);
    const rowSpacing = H / (rows + 1);

    for (let row = 0; row < rows; row++) {
      const rowY = topY + rowSpacing * (row + 1);
      const hp   = Math.min(3, 1 + Math.floor(diff * 0.6));

      // Gap center shifts randomly but always stays within bounds
      const gapMin = gap / 2 + 15;
      const gapMax = W - gap / 2 - 15;
      const gapCx  = Phaser.Math.Between(Math.ceil(gapMin), Math.floor(gapMax));

      const leftW  = gapCx - gap / 2;
      const rightW = W - (gapCx + gap / 2);

      if (leftW > 10) {
        out.push({
          type: ObstacleType.WALL_SEGMENT,
          x: leftW / 2, y: rowY,
          width: leftW, height: 22,
          hp, pointValue: hp * 35,
        });
      }
      if (rightW > 10) {
        out.push({
          type: ObstacleType.WALL_SEGMENT,
          x: gapCx + gap / 2 + rightW / 2, y: rowY,
          width: rightW, height: 22,
          hp, pointValue: hp * 35,
        });
      }
    }
  }

  // ── Pattern B — Bumper cluster (can be bounced through) ─────────────────────
  private _patternBumperCluster(
    out: ObstacleConfig[],
    topY: number, W: number, H: number, diff: number,
  ): void {
    const count     = 3 + Math.floor(diff);
    const positions = this._nonOverlap(count, W, H, 50, 90);

    for (const p of positions) {
      out.push({
        type: ObstacleType.BUMPER,
        x: p.x, y: topY + p.y,
        radius: 24,
        hp: 1, pointValue: 45,
      });
    }
  }

  // ── Pattern C — Moving platforms with enemies on them ───────────────────────
  private _patternPlatforms(
    outObs: ObstacleConfig[], outEn: EnemyConfig[],
    topY: number, W: number, H: number, diff: number,
  ): void {
    const count   = 2 + Math.floor(diff * 0.6);
    const spacing = H / (count + 1);
    const pw      = Math.max(80, W * 0.38 - diff * 4);
    const speed   = 55 + diff * 25;

    for (let i = 0; i < count; i++) {
      // Alternate left/right start positions → always a path between platforms
      const startX = i % 2 === 0 ? W * 0.28 : W * 0.72;
      const pY     = topY + spacing * (i + 1);

      outObs.push({
        type: ObstacleType.PLATFORM,
        x: startX, y: pY,
        width: pw, height: 16,
        speed,
        hp: 1, pointValue: 30,
      });

      // Enemy hovering above the platform (every other platform)
      if (i % 2 === 0 && diff > 0.25) {
        outEn.push({
          type: EnemyType.STATIC,
          x: startX, y: pY - 32,
          hp: 1, pointValue: 65,
        });
      }
    }
  }

  // ── Pattern D — Enemy gauntlet: ring formation with open center ─────────────
  private _patternEnemyGauntlet(
    outObs: ObstacleConfig[], outEn: EnemyConfig[],
    topY: number, W: number, H: number, diff: number,
  ): void {
    const cx     = W * 0.5;
    const cy     = topY + H * 0.5;
    const count  = 3 + Math.floor(diff * 1.2);
    const radius = Math.min(W * 0.32, 110);
    // Angular spacing ensures no two enemies block the same vertical corridor
    const step   = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const angle = step * i + Phaser.Math.FloatBetween(-0.1, 0.1);
      const ex    = cx + Math.cos(angle) * radius;
      const ey    = cy + Math.sin(angle) * radius;

      if (ex < 22 || ex > W - 22) continue; // skip off-screen

      const type = diff > 1.0 ? EnemyType.DRIFTER : EnemyType.STATIC;
      outEn.push({
        type, x: ex, y: ey,
        speed: 45 + diff * 18,
        hp: 1, pointValue: type === EnemyType.DRIFTER ? 85 : 65,
      });
    }

    // Add orbiter at the center at higher difficulty
    if (diff > 1.0) {
      outEn.push({
        type: EnemyType.ORBITER,
        x: cx, y: cy,
        orbitRadius: radius * 0.48,
        speed: 1.4 + diff * 0.3,
        hp: 2, pointValue: 160,
      });
    }

    // Shield blocker at lower quadrant (still passable via sides)
    if (diff > 1.5) {
      outObs.push({
        type: ObstacleType.SHIELD,
        x: cx, y: topY + H * 0.25,
        radius: 22, hp: 3, pointValue: 120,
      });
    }
  }

  // ── Pattern E — Spinner maze: zigzag spinners forcing a weave ───────────────
  private _patternSpinnerMaze(
    out: ObstacleConfig[],
    topY: number, W: number, H: number, gap: number, diff: number,
  ): void {
    const count   = 2 + Math.floor(diff);
    const spacing = H / (count + 1);
    const spin    = 1.4 + diff * 0.75;
    // Zigzag: left column and right column, offset so passage exists between
    const leftX   = W * 0.27;
    const rightX  = W * 0.73;

    for (let i = 0; i < count; i++) {
      const sY = topY + spacing * (i + 1);
      const sX = i % 2 === 0 ? leftX : rightX;
      out.push({
        type: ObstacleType.SPINNER,
        x: sX, y: sY,
        width: 50, height: 50,
        speed: spin,
        hp: 2, pointValue: 90,
      });
    }

    // Flanking wall stubs force player to use the zigzag corridor
    if (diff > 0.6) {
      const wallY = topY + H * 0.5;
      const wLen  = Math.min(W * 0.18, (W - gap) / 2 - 6);
      const hp    = Math.min(2, Math.floor(diff));
      if (wLen > 12) {
        out.push({
          type: ObstacleType.WALL_SEGMENT,
          x: wLen / 2, y: wallY,
          width: wLen, height: 20,
          hp, pointValue: hp * 30,
        });
        out.push({
          type: ObstacleType.WALL_SEGMENT,
          x: W - wLen / 2, y: wallY,
          width: wLen, height: 20,
          hp, pointValue: hp * 30,
        });
      }
    }
  }

  // ── Utility ─────────────────────────────────────────────────────────────────

  private _selectPattern(index: number, diff: number): Pattern {
    // Cycle primary pattern by chunk index, then inject harder patterns as diff rises
    const easy   : Pattern[] = ['A', 'B', 'A', 'C', 'B'];
    const medium : Pattern[] = ['A', 'C', 'B', 'D', 'E'];
    const hard   : Pattern[] = ['C', 'D', 'E', 'D', 'E'];

    const bank = diff < 0.5 ? easy : diff < 1.2 ? medium : hard;
    // Deterministic base + small random injection
    const base  = bank[index % bank.length];
    const roll  = Phaser.Math.Between(0, 4);
    return roll === 0 ? bank[Phaser.Math.Between(0, bank.length - 1)] : base;
  }

  /**
   * Generate up to `count` non-overlapping (x, y) positions within a chunk.
   * x is absolute; y is relative (caller adds topY).
   */
  private _nonOverlap(
    count: number,
    W: number, H: number,
    marginX: number,
    minDist: number,
  ): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [];
    const MAX_TRIES = 50;

    for (let i = 0; i < count; i++) {
      let placed = false;
      for (let t = 0; t < MAX_TRIES; t++) {
        const px = Phaser.Math.Between(marginX, W - marginX);
        const py = Phaser.Math.Between(55, H - 55);
        const ok = pts.every(p => {
          const dx = px - p.x, dy = py - p.y;
          return dx * dx + dy * dy >= minDist * minDist;
        });
        if (ok) { pts.push({ x: px, y: py }); placed = true; break; }
      }
      // Fallback: mirror last point
      if (!placed && pts.length > 0) {
        const last = pts[pts.length - 1];
        pts.push({ x: W - last.x, y: Math.min(H - 55, last.y + minDist + 5) });
      }
    }
    return pts;
  }

  /** Difficulty at a given chunk index (clamped to [0, 3]). */
  private _difficultyAt(index: number): number {
    return Math.min(3, index * GAME_CONFIG.level.difficultyScalePerChunk + this.currentDifficulty);
  }

  /** Top Y-coordinate (world space) of chunk N. */
  private _chunkTopY(n: number): number {
    return this.startY - (n + 1) * this.chunkH;
  }

  /** Which chunk index contains a given world Y. */
  private _chunkAt(playerY: number): number {
    return Math.max(0, Math.floor((this.startY - playerY) / this.chunkH));
  }
}
