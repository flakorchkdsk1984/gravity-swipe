import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { GameStateService, UIState } from '../services/game-state.service';
import { GameEvent } from '../config/types';
import { LeaderboardService } from '../services/leaderboard.service';
import { POWER_LABELS } from '../config/GameConfig';

@Component({
  selector: 'app-game-ui',
  templateUrl: './game-ui.component.html',
  styleUrls: ['./game-ui.component.scss'],
})
export class GameUIComponent implements OnInit, OnDestroy {
  state: UIState = {
    score: 0, combo: 0, multiplier: 1, chargeLevel: 0,
    isGameOver: false, finalScore: 0, bestScore: 0,
    maxCombo: 0, survivalTime: 0, isPlaying: false,
    showTutorial: false,
    timerMs: 0, timerFormatted: '00:00.00',
    activePowers: [], stageCompleted: false, finishTimeMs: 0,
    playerProgress: 0,
  };
  comboAnimating = false;
  nearMissFlash = false;

  private stateSub!: Subscription;
  private prevCombo = 0;
  private comboAnimTimer: ReturnType<typeof setTimeout> | null = null;
  private nearMissTimer: ReturnType<typeof setTimeout> | null = null;
  private nearMissListener!: EventListener;

  constructor(private gameState: GameStateService, private leaderboard: LeaderboardService) {}

  ngOnInit(): void {
    this.stateSub = this.gameState.state$.subscribe(s => {
      const comboIncreased = s.combo > this.prevCombo && s.combo > 1;
      this.state = s;

      if (comboIncreased) {
        this.triggerComboAnim();
      }
      this.prevCombo = s.combo;
    });

    this.nearMissListener = () => this.triggerNearMissFlash();
    window.addEventListener('gs:' + GameEvent.PLAYER_NEAR_MISS, this.nearMissListener);
  }

  ngOnDestroy(): void {
    this.stateSub?.unsubscribe();
    window.removeEventListener('gs:' + GameEvent.PLAYER_NEAR_MISS, this.nearMissListener);
    if (this.comboAnimTimer) clearTimeout(this.comboAnimTimer);
    if (this.nearMissTimer) clearTimeout(this.nearMissTimer);
  }

  private triggerComboAnim(): void {
    this.comboAnimating = false;
    // Force reflow so re-adding the class retriggers the animation
    requestAnimationFrame(() => {
      this.comboAnimating = true;
      if (this.comboAnimTimer) clearTimeout(this.comboAnimTimer);
      this.comboAnimTimer = setTimeout(() => {
        this.comboAnimating = false;
      }, 400);
    });
  }

  private triggerNearMissFlash(): void {
    this.nearMissFlash = true;
    if (this.nearMissTimer) clearTimeout(this.nearMissTimer);
    this.nearMissTimer = setTimeout(() => {
      this.nearMissFlash = false;
    }, 300);
  }

  getPowerLabel(power: string): string {
    return POWER_LABELS[power] ?? power;
  }

  getPowerColor(power: string): string {
    const colors: Record<string, string> = {
      speed_boost: '#ff2244',
      shield:      '#ff8800',
      score_x2:    '#ffdd00',
      slow_extend: '#00cc44',
      freeze:      '#00aaff',
      ghost:       '#cc44ff',
      magnet:      '#cccccc',
    };
    return colors[power] ?? '#ffffff';
  }
}
