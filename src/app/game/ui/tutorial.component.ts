import {
  Component, OnInit, OnDestroy, Output, EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-tutorial',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeOut', [
      transition(':leave', [
        animate('250ms ease-in', style({ opacity: 0, transform: 'scale(0.97)' })),
      ]),
    ]),
  ],
  template: `
    <div class="tutorial-overlay" @fadeOut (click)="dismiss()" (touchend)="dismiss()">
      <div class="tutorial-card" (click)="$event.stopPropagation()" (touchend)="$event.stopPropagation()">

        <h1 class="title">HOW TO PLAY</h1>

        <div class="steps">
          <div class="step">
            <div class="icon">👆</div>
            <div class="text">
              <strong>Hold &amp; drag</strong> to aim and charge power.<br>
              Longer hold = faster dash.
            </div>
          </div>

          <div class="step">
            <div class="icon">🚀</div>
            <div class="text">
              <strong>Release</strong> to dash in that direction.<br>
              A charge bar at the bottom shows power level.
            </div>
          </div>

          <div class="step">
            <div class="icon obstacle-icon">■</div>
            <div class="text">
              <strong>Red walls</strong> &amp; <strong class="bumper">green bumpers</strong>
              are obstacles — crash into them to destroy them for points.
            </div>
          </div>

          <div class="step">
            <div class="icon enemy-icon">●</div>
            <div class="text">
              <strong>Orange orbs</strong> are enemies — hit them to earn points.
              Getting hit kills you!
            </div>
          </div>

          <div class="step">
            <div class="icon">⚡</div>
            <div class="text">
              <strong>Near misses</strong> give bonus points. Chain hits quickly
              to build combos and score multipliers.
            </div>
          </div>
        </div>

        <button class="play-btn" (click)="dismiss()" (touchend)="dismiss()">
          TAP TO PLAY
        </button>
      </div>
    </div>
  `,
  styles: [`
    .tutorial-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.82);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
      font-family: var(--font-game);
      padding: 16px;
      pointer-events: all;
    }

    .tutorial-card {
      background: rgba(10, 10, 30, 0.97);
      border: 1px solid rgba(0, 255, 255, 0.35);
      border-radius: 12px;
      padding: 28px 22px 22px;
      max-width: 360px;
      width: 100%;
      box-shadow: 0 0 40px rgba(0, 255, 255, 0.15);
    }

    .title {
      text-align: center;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 4px;
      color: #00ffff;
      text-shadow: 0 0 16px rgba(0, 255, 255, 0.8);
      margin-bottom: 24px;
    }

    .steps {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 28px;
    }

    .step {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .icon {
      font-size: 22px;
      min-width: 28px;
      text-align: center;
      line-height: 1.3;
    }

    .obstacle-icon {
      color: #ff4466;
      text-shadow: 0 0 8px rgba(255, 68, 102, 0.8);
      font-size: 20px;
    }

    .enemy-icon {
      color: #ff8800;
      text-shadow: 0 0 8px rgba(255, 136, 0, 0.8);
    }

    .text {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.55;
      font-family: 'Courier New', monospace;

      strong {
        color: #ffffff;
        font-weight: 700;
      }

      .bumper {
        color: #88ff00;
        text-shadow: 0 0 6px rgba(136, 255, 0, 0.6);
      }
    }

    .play-btn {
      display: block;
      width: 100%;
      padding: 14px;
      background: transparent;
      border: 2px solid #00ffff;
      border-radius: 6px;
      color: #00ffff;
      font-family: var(--font-game);
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 3px;
      cursor: pointer;
      text-shadow: 0 0 10px rgba(0, 255, 255, 0.7);
      box-shadow: 0 0 18px rgba(0, 255, 255, 0.2);
      transition: background 0.15s, box-shadow 0.15s;
      animation: pulse-btn 1.4s ease-in-out infinite;

      &:active {
        background: rgba(0, 255, 255, 0.15);
      }
    }

    @keyframes pulse-btn {
      0%, 100% { box-shadow: 0 0 12px rgba(0, 255, 255, 0.2); }
      50%       { box-shadow: 0 0 26px rgba(0, 255, 255, 0.55); }
    }
  `],
})
export class TutorialComponent implements OnInit, OnDestroy {
  @Output() dismissed = new EventEmitter<void>();

  ngOnInit(): void {}
  ngOnDestroy(): void {}

  dismiss(): void {
    localStorage.setItem('gs_tutorial_seen', '1');
    this.dismissed.emit();
  }
}
