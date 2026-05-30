import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { GameStateService } from './services/game-state.service';
import { GameLogger } from './systems/GameLogger';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
})
export class GameComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('phaserContainer') phaserContainer!: ElementRef;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private game: any = null;
  showTutorial = false;
  private stateSub!: Subscription;

  constructor(
    private gameState: GameStateService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.gameState.init();
    this.stateSub = this.gameState.state$.subscribe(s => {
      this.showTutorial = s.showTutorial;
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit(): void {
    // Initialize Phaser OUTSIDE Angular zone to avoid change detection spam
    this.ngZone.runOutsideAngular(() => {
      this.initPhaser();
    });
  }

  onTutorialDismissed(): void {
    this.gameState.hideTutorial();
  }

  private async initPhaser(): Promise<void> {
    try {
      GameLogger.info('Game', 'Phaser game initializing');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const PhaserMod: any = await import('phaser');
      const PhaserLib = PhaserMod.default ?? PhaserMod;
      const { PreloadScene } = await import('./scenes/PreloadScene');
      const { MainGameScene } = await import('./scenes/MainGameScene');
      const { PHASER_CONFIG } = await import('./config/GameConfig');

      const config = {
        ...PHASER_CONFIG,
        parent: this.phaserContainer.nativeElement,
        scene: [PreloadScene, MainGameScene],
      };

      this.game = new PhaserLib.Game(config);
    } catch (err) {
      GameLogger.error('Game', 'Phaser init failed', err);
      console.error('[GameComponent] Phaser init failed:', err);
    }
  }

  ngOnDestroy(): void {
    this.stateSub?.unsubscribe();
    this.game?.destroy(true);
    this.game = null;
  }
}

