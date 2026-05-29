import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  trigger,
  transition,
  style,
  animate,
  keyframes,
} from '@angular/animations';
import { Subscription } from 'rxjs';
import { GameStateService, UIState } from '../services/game-state.service';

@Component({
  selector: 'app-game-over',
  templateUrl: './game-over.component.html',
  styleUrls: ['./game-over.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(40px) scale(0.95)' }),
        animate(
          '350ms cubic-bezier(0.22, 0.61, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '200ms ease-in',
          style({ opacity: 0, transform: 'translateY(-20px) scale(0.97)' })
        ),
      ]),
    ]),
  ],
})
export class GameOverComponent implements OnInit, OnDestroy {
  state: UIState = {
    score: 0, combo: 0, multiplier: 1, chargeLevel: 0,
    isGameOver: false, finalScore: 0, bestScore: 0,
    maxCombo: 0, survivalTime: 0, isPlaying: false,
    showTutorial: false,
  };
  visible = false;

  private stateSub!: Subscription;

  constructor(private gameState: GameStateService) {}

  ngOnInit(): void {
    this.stateSub = this.gameState.state$.subscribe(s => {
      this.state = s;
      this.visible = s.isGameOver;
    });
  }

  ngOnDestroy(): void {
    this.stateSub?.unsubscribe();
  }

  onRestart(): void {
    this.gameState.requestRestart();
  }
}
