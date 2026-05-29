import Phaser from 'phaser';
import { GameEvent } from '../config/types';

/**
 * EventBus — Phaser.Events.EventEmitter singleton shared across
 * all game systems AND exposed to Angular via window.GS_EVENTS.
 *
 * Usage:
 *   EventBus.emit(GameEvent.PLAYER_DASH, payload);
 *   EventBus.on(GameEvent.SCORE_UPDATED, handler, context);
 *   EventBus.off(GameEvent.SCORE_UPDATED, handler, context);
 */
class EventBusClass extends Phaser.Events.EventEmitter {
  constructor() {
    super();
  }

  /** Emit to Angular subscribers too (Angular listens via window) */
  override emit(event: string | symbol, ...args: unknown[]): boolean {
    const result = super.emit(event, ...args);
    // Bridge to Angular via custom DOM events
    try {
      window.dispatchEvent(
        new CustomEvent('gs:' + String(event), { detail: args[0] ?? null })
      );
    } catch (_) { /* SSR/test guard */ }
    return result;
  }
}

export const EventBus = new EventBusClass();

// Expose globally for Angular bridge
(window as unknown as Record<string, unknown>)['GS_EVENTS'] = EventBus;
