import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GameEvent, GameOverPayload, ScorePayload, ComboPayload, PowerType } from '../config/types';

export interface UIState {
  score: number;
  combo: number;
  multiplier: number;
  chargeLevel: number;      // 0-1
  isGameOver: boolean;
  finalScore: number;
  bestScore: number;
  maxCombo: number;
  survivalTime: number;
  isPlaying: boolean;
  showTutorial: boolean;
  // Timer / stage
  timerMs: number;
  timerFormatted: string;
  activePowers: PowerType[];
  stageCompleted: boolean;
  finishTimeMs: number;
  playerProgress: number;   // 0-1, distance towards finish
}

@Injectable({ providedIn: 'root' })
export class GameStateService implements OnDestroy {

  private _state: UIState = {
    score: 0, combo: 0, multiplier: 1, chargeLevel: 0,
    isGameOver: false, finalScore: 0, bestScore: 0,
    maxCombo: 0, survivalTime: 0, isPlaying: false,
    showTutorial: false,
    timerMs: 0, timerFormatted: '00:00.00',
    activePowers: [], stageCompleted: false, finishTimeMs: 0,
    playerProgress: 0,
  };

  readonly state$ = new BehaviorSubject<UIState>({ ...this._state });

  private listeners: Array<[string, EventListener]> = [];

  constructor(private ngZone: NgZone) {
    this.bindWindowEvents();
  }

  private bindWindowEvents(): void {
    const on = (event: string, fn: (e: CustomEvent) => void) => {
      const wrapped = (e: Event) => {
        this.ngZone.run(() => fn(e as CustomEvent));
      };
      window.addEventListener(event, wrapped);
      this.listeners.push([event, wrapped as EventListener]);
    };

    on('gs:' + GameEvent.SCORE_UPDATED, (e) => {
      const p = e.detail as ScorePayload;
      this.patch({ score: p.score, multiplier: p.multiplier });
    });

    on('gs:' + GameEvent.COMBO_INCREMENT, (e) => {
      const p = e.detail as ComboPayload;
      this.patch({ combo: p.count, multiplier: p.multiplier });
    });

    on('gs:' + GameEvent.COMBO_BREAK, () => {
      this.patch({ combo: 0, multiplier: 1 });
    });

    on('gs:' + GameEvent.CHARGE_UPDATE, (e) => {
      this.patch({ chargeLevel: (e.detail as { level: number }).level });
    });

    on('gs:' + GameEvent.CHARGE_RELEASE, () => {
      this.patch({ chargeLevel: 0 });
    });

    on('gs:' + GameEvent.GAME_START, () => {
      this.patch({
        score: 0, combo: 0, multiplier: 1, chargeLevel: 0,
        isGameOver: false, isPlaying: true,
        timerMs: 0, timerFormatted: '00:00.00',
        activePowers: [], stageCompleted: false, finishTimeMs: 0,
        playerProgress: 0,
      });
    });

    on('gs:' + GameEvent.GAME_OVER, (e) => {
      const p = e.detail as GameOverPayload;
      const best = Math.max(this._state.bestScore, p.finalScore);
      localStorage.setItem('gs_best', String(best));
      this.patch({
        isGameOver: true, isPlaying: false,
        finalScore: p.finalScore, maxCombo: p.maxCombo,
        survivalTime: p.survivalTime, bestScore: best,
      });
    });

    on('gs:' + GameEvent.TIMER_UPDATE, (e) => {
      const p = e.detail as { ms: number; formatted: string };
      this.patch({ timerMs: p.ms, timerFormatted: p.formatted });
    });

    on('gs:' + GameEvent.POWER_ACTIVATED, (e) => {
      const p = e.detail as { type: string };
      const powers = [...this._state.activePowers, p.type as PowerType];
      this.patch({ activePowers: powers });
    });

    on('gs:' + GameEvent.POWER_EXPIRED, (e) => {
      const p = e.detail as { type: string };
      const powers = this._state.activePowers.filter(x => x !== p.type);
      this.patch({ activePowers: powers });
    });

    on('gs:' + GameEvent.STAGE_FINISH, (e) => {
      const p = e.detail as { timeMs: number; score: number; maxCombo: number };
      this.patch({ stageCompleted: true, finishTimeMs: p.timeMs, isGameOver: true, isPlaying: false, finalScore: p.score, maxCombo: p.maxCombo });
    });

    on('gs:' + GameEvent.LEVEL_PROGRESS, (e) => {
      const p = e.detail as { progress: number };
      this.patch({ playerProgress: Math.min(1, Math.max(0, p.progress)) });
    });
  }

  init(): void {
    const best = parseInt(localStorage.getItem('gs_best') ?? '0', 10);
    const tutorialSeen = localStorage.getItem('gs_tutorial_seen') === '1';
    this.patch({ bestScore: best, showTutorial: !tutorialSeen });
  }

  hideTutorial(): void {
    this.patch({ showTutorial: false });
  }

  requestRestart(): void {
    window.dispatchEvent(new CustomEvent('gs:ui:restart'));
  }

  private patch(partial: Partial<UIState>): void {
    this._state = { ...this._state, ...partial };
    this.state$.next({ ...this._state });
  }

  ngOnDestroy(): void {
    for (const [event, fn] of this.listeners) {
      window.removeEventListener(event, fn);
    }
  }
}
