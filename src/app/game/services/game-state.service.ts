import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GameEvent, GameOverPayload, ScorePayload, ComboPayload } from '../config/types';

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
}

@Injectable({ providedIn: 'root' })
export class GameStateService implements OnDestroy {

  private _state: UIState = {
    score: 0, combo: 0, multiplier: 1, chargeLevel: 0,
    isGameOver: false, finalScore: 0, bestScore: 0,
    maxCombo: 0, survivalTime: 0, isPlaying: false,
    showTutorial: false,
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
