import * as Phaser from 'phaser';
import { EventBus } from './EventBus';
import { GameEvent, Vec2, ScorePayload } from '../config/types';
import { GAME_CONFIG, COLORS } from '../config/GameConfig';

// ─────────────────────────────────────────────────────────────────────────────
// ScoreManager — tracks score, high score, floating text, survival bonus.
// ─────────────────────────────────────────────────────────────────────────────

const LS_KEY = 'gs_highscore';

interface FloatingText {
  text: Phaser.GameObjects.Text;
  vy: number;
  life: number;
  maxLife: number;
}

export class ScoreManager {
  private scene: Phaser.Scene;
  private score     = 0;
  private highScore = 0;

  /** Accumulator for survival score (ms) */
  private survivalAccum = 0;

  /** Object pool of floating text objects */
  private activeTexts: FloatingText[] = [];
  private textPool:    Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this._loadHighScore();
  }

  // ── Public scoring API ────────────────────────────────────────────────────

  addHitScore(position: Vec2, multiplier: number): void {
    const delta = GAME_CONFIG.scoring.hitBase * multiplier;
    this._add(delta, position, `+${delta}`, COLORS.uiScore);
  }

  addDestroyScore(pointValue: number, position: Vec2, multiplier: number): void {
    const delta = Math.round(pointValue * multiplier);
    this._add(delta, position, `+${delta}`, COLORS.enemy);
  }

  addNearMissScore(position: Vec2): void {
    const delta = GAME_CONFIG.scoring.nearMissBonus;
    this._add(delta, position, `NEAR MISS +${delta}`, COLORS.nearMiss);
  }

  addBounceScore(position: Vec2, multiplier: number): void {
    const delta = Math.round(GAME_CONFIG.scoring.bounceBonus * multiplier);
    this._add(delta, position, `+${delta}`, COLORS.playerGlow);
  }

  /**
   * Call every frame. Awards +1 per 500ms survived.
   */
  addSurvivalScore(deltaMs: number): void {
    this.survivalAccum += deltaMs;
    if (this.survivalAccum >= 500) {
      const ticks = Math.floor(this.survivalAccum / 500);
      this.survivalAccum -= ticks * 500;
      this._add(ticks, undefined, undefined, 0);
    }
  }

  getScore(): number {
    return this.score;
  }

  getHighScore(): number {
    return this.highScore;
  }

  reset(): void {
    this.score        = 0;
    this.survivalAccum = 0;
    this._emitUpdate(0);
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  update(delta: number): void {
    for (let i = this.activeTexts.length - 1; i >= 0; i--) {
      const ft = this.activeTexts[i];
      ft.life -= delta;
      ft.text.y -= ft.vy * (delta / 1000);

      const progress = 1 - ft.life / ft.maxLife;
      // Fade in quickly, hold, then fade out
      const alpha = progress < 0.15
        ? progress / 0.15
        : progress > 0.7
          ? 1 - (progress - 0.7) / 0.3
          : 1;
      ft.text.setAlpha(alpha);

      if (ft.life <= 0) {
        this._recycleText(ft.text);
        this.activeTexts.splice(i, 1);
      }
    }
  }

  destroy(): void {
    this.activeTexts.forEach(ft => ft.text.destroy());
    this.activeTexts.length = 0;
    this.textPool.forEach(t => t.destroy());
    this.textPool.length = 0;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _add(delta: number, position?: Vec2, label?: string, color: number = 0xffffff): void {
    this.score += delta;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this._saveHighScore();
    }
    this._emitUpdate(delta);

    if (label && position) {
      this.showFloatingText(position.x, position.y, label, color);
    }
  }

  private _emitUpdate(delta: number): void {
    const payload: ScorePayload = {
      score:      this.score,
      delta,
      multiplier: 1,
    };
    EventBus.emit(GameEvent.SCORE_UPDATED, payload);
  }

  // ── Floating text pool ────────────────────────────────────────────────────

  private showFloatingText(x: number, y: number, text: string, color: number): void {
    const t = this._acquireText();
    t.setText(text);
    t.setColor('#' + color.toString(16).padStart(6, '0'));
    t.setPosition(x, y);
    t.setAlpha(0);
    t.setDepth(20);
    t.setVisible(true);

    const lifespan = 900;
    this.activeTexts.push({ text: t, vy: 55, life: lifespan, maxLife: lifespan });
  }

  private _acquireText(): Phaser.GameObjects.Text {
    if (this.textPool.length > 0) {
      return this.textPool.pop()!;
    }
    return this.scene.add.text(0, 0, '', {
      fontSize: '18px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);
  }

  private _recycleText(t: Phaser.GameObjects.Text): void {
    t.setVisible(false);
    this.textPool.push(t);
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  private _loadHighScore(): void {
    try {
      const stored = localStorage.getItem(LS_KEY);
      this.highScore = stored ? parseInt(stored, 10) || 0 : 0;
    } catch (_) {
      this.highScore = 0;
    }
  }

  private _saveHighScore(): void {
    try {
      localStorage.setItem(LS_KEY, String(this.highScore));
    } catch (_) {}
  }
}
