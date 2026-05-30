import { EventBus } from './EventBus';
import { GameEvent } from '../config/types';

const EMIT_INTERVAL_MS = 100; // throttle UI updates

export class TimerManager {
  private startMs    = 0;
  private elapsedMs  = 0;
  private running    = false;
  private finished   = false;
  private lastEmitMs = 0;

  // ── Lifecycle ────────────────────────────────────────────────

  start(): void {
    this.startMs    = performance.now();
    this.elapsedMs  = 0;
    this.lastEmitMs = 0;
    this.running    = true;
    this.finished   = false;
  }

  stop(): void {
    this.running = false;
  }

  finish(): void {
    this.running  = false;
    this.finished = true;
  }

  reset(): void {
    this.startMs    = 0;
    this.elapsedMs  = 0;
    this.lastEmitMs = 0;
    this.running    = false;
    this.finished   = false;
  }

  // ── Per-frame update ─────────────────────────────────────────

  update(): void {
    if (!this.running) return;

    this.elapsedMs = performance.now() - this.startMs;

    // Throttle TIMER_UPDATE events to every 100 ms
    if (this.elapsedMs - this.lastEmitMs >= EMIT_INTERVAL_MS) {
      this.lastEmitMs = this.elapsedMs;
      EventBus.emit(GameEvent.TIMER_UPDATE, {
        elapsedMs:    this.elapsedMs,
        formatted:    TimerManager.format(this.elapsedMs),
      });
    }
  }

  // ── Accessors ────────────────────────────────────────────────

  getElapsedMs(): number  { return this.elapsedMs; }
  isFinished():   boolean { return this.finished;   }

  // ── Static Helpers ───────────────────────────────────────────

  /** Format milliseconds as MM:SS.cc */
  static format(ms: number): string {
    const totalSec = ms / 1000;
    const min  = Math.floor(totalSec / 60);
    const sec  = Math.floor(totalSec % 60);
    const cs   = Math.floor((ms % 1000) / 10);
    return (
      String(min).padStart(2, '0') + ':' +
      String(sec).padStart(2, '0') + '.' +
      String(cs).padStart(2, '0')
    );
  }
}
