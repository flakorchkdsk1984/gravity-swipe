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
import { LeaderboardService, LeaderboardEntry } from '../services/leaderboard.service';

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
    timerMs: 0, timerFormatted: '00:00.00',
    activePowers: [], stageCompleted: false, finishTimeMs: 0,
    playerProgress: 0,
  };
  visible = false;

  selectedEmoji = '😀';
  playerName = 'AAA';
  leaderboardEntries: LeaderboardEntry[] = [];
  timeSaved = false;

  readonly EMOJI_OPTIONS = ['😀','😎','🦊','🐉','🚀','🌟','💎','⚡','🔥','👾','🤖','🏆'];

  private stateSub!: Subscription;

  constructor(private gameState: GameStateService, private leaderboardSvc: LeaderboardService) {}

  ngOnInit(): void {
    this.leaderboardEntries = this.leaderboardSvc.getEntries();
    this.stateSub = this.gameState.state$.subscribe(s => {
      const wasCompleted = this.state.stageCompleted;
      this.state = s;
      this.visible = s.isGameOver;

      if (s.stageCompleted && !wasCompleted) {
        this.timeSaved = false;
        this.leaderboardEntries = this.leaderboardSvc.getEntries();
      }
      if (!s.isGameOver) {
        this.timeSaved = false;
        this.playerName = 'AAA';
      }
    });
  }

  ngOnDestroy(): void {
    this.stateSub?.unsubscribe();
  }

  onRestart(): void {
    this.gameState.requestRestart();
  }

  onNameChange(value: string): void {
    this.playerName = value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4) || 'AAA';
  }

  onEmojiSelect(emoji: string): void {
    this.selectedEmoji = emoji;
  }

  onSaveTime(): void {
    if (this.timeSaved) return;
    const sanitized = (this.playerName || 'AAA').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4) || 'AAA';
    const entry: LeaderboardEntry = {
      name: sanitized,
      emoji: this.selectedEmoji,
      timeMs: this.state.finishTimeMs,
      score: this.state.finalScore,
      date: new Date().toISOString(),
    };
    this.leaderboardEntries = this.leaderboardSvc.addEntry(entry);
    this.timeSaved = true;
  }

  onGoToStageSelect(): void {
    this.gameState.requestStageSelect();
  }

  isNewBest(): boolean {
    const entries = this.leaderboardSvc.getEntries();
    if (entries.length === 0) return true;
    return this.state.finishTimeMs <= entries[0].timeMs;
  }

  formatTime(ms: number): string {
    return this.leaderboardSvc.formatTime(ms);
  }

  getEntryIndex(entry: LeaderboardEntry): number {
    return this.leaderboardEntries.indexOf(entry);
  }
}
