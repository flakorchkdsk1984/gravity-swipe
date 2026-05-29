import Phaser from 'phaser';
import { IGameConfig } from './types';

export const GAME_CONFIG: IGameConfig = {
  width: 390,       // iPhone 14 logical pixels
  height: 844,

  physics: {
    gravity: 0,
    playerRadius: 18,
    dashBaseSpeed: 600,
    dashMaxSpeed: 1800,
    maxChargeTime: 1200,      // ms for full charge
    bounceRestitution: 0.85,
    friction: 0.98,
  },

  combo: {
    window: 2000,             // 2s window to chain
    multiplierThresholds: [0, 3, 6, 12, 20],
  },

  scoring: {
    hitBase: 10,
    destroyBase: 50,
    nearMissBonus: 25,
    bounceBonus: 5,
  },

  level: {
    chunkHeight: 600,
    spawnAheadChunks: 3,
    despawnBehindChunks: 2,
    difficultyScalePerChunk: 0.04,
  },

  camera: {
    followLerp: 0.08,
    shakeDecay: 0.85,
    zoomDefault: 1.0,
    zoomDash: 0.92,
  },

  fx: {
    slowMotionScale: 0.25,
    slowMotionDuration: 800,
    trailLength: 12,
    particleCount: 20,
  },
};

// Color Palette — neon arcade
export const COLORS = {
  player:        0x00ffff,
  playerGlow:    0x00aaff,
  trail:         0x0088ff,
  obstacle:      0xff4466,
  obstacleGlow:  0xff0044,
  enemy:         0xff8800,
  enemyGlow:     0xff4400,
  bumper:        0x88ff00,
  background:    0x0a0a1a,
  bgGrid:        0x111130,
  uiScore:       0xffffff,
  uiCombo:       0xffff00,
  uiCharge:      0x00ffff,
  shockwave:     0xffffff,
  hitFlash:      0xffffff,
  nearMiss:      0xffff00,
};

// Phaser game config object (passed to new Phaser.Game())
// Use numeric constants as fallbacks in case Phaser isn't fully resolved yet.
export const PHASER_CONFIG = {
  type:            Phaser.AUTO,          // 0 = AUTO
  width:           GAME_CONFIG.width,
  height:          GAME_CONFIG.height,
  backgroundColor: '#0a0a1a',
  antialias:       true,
  roundPixels:     false,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode:       Phaser.Scale.FIT,         // 3 = FIT
    autoCenter: Phaser.Scale.CENTER_BOTH, // 1 = CENTER_BOTH
  },
  render: {
    antialias: true,
    pixelArt:  false,
  },
};
