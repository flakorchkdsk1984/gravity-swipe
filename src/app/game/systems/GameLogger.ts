import Phaser from 'phaser';

// ─────────────────────────────────────────────────────────────────────────────
// GameLogger — singleton debug logging system for Gravity Swipe.
// ─────────────────────────────────────────────────────────────────────────────

export enum LogLevel {
  DEBUG = 0,
  INFO  = 1,
  WARN  = 2,
  ERROR = 3,
}

export interface LogEntry {
  level:      LogLevel;
  tag:        string;
  message:    string;
  data?:      unknown;
  timestamp:  number;
  frameCount?: number;
}

const RING_SIZE   = 200;
const OVERLAY_MAX = 12;

const LEVEL_LABEL: Record<LogLevel, string>  = { [LogLevel.DEBUG]: 'DEBUG', [LogLevel.INFO]: 'INFO', [LogLevel.WARN]: 'WARN', [LogLevel.ERROR]: 'ERROR' };
const LEVEL_COLOR: Record<LogLevel, string>  = { [LogLevel.DEBUG]: 'gray',  [LogLevel.INFO]: 'cyan',  [LogLevel.WARN]: 'yellow', [LogLevel.ERROR]: 'red' };
const LEVEL_CSS:   Record<LogLevel, string>  = {
  [LogLevel.DEBUG]: 'color:#888',
  [LogLevel.INFO]:  'color:#0ff',
  [LogLevel.WARN]:  'color:#ff0',
  [LogLevel.ERROR]: 'color:#f44',
};

class GameLoggerImpl {
  private buffer: LogEntry[] = [];
  private head     = 0;
  private count    = 0;
  private frame    = 0;
  private minLevel = LogLevel.DEBUG;

  private overlay:     HTMLElement | null = null;
  private overlayList: HTMLElement | null = null;
  private overlayVisible = false;

  constructor() {
    this._installGlobalHandlers();
    this._buildOverlay();
    this._listenBacktick();
  }

  // ── Frame counter ──────────────────────────────────────────────────────────

  tick(): void {
    this.frame++;
  }

  // ── Log level filter ───────────────────────────────────────────────────────

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  // ── Core logging ───────────────────────────────────────────────────────────

  debug(tag: string, message: string, data?: unknown): void {
    this._log(LogLevel.DEBUG, tag, message, data);
  }

  info(tag: string, message: string, data?: unknown): void {
    this._log(LogLevel.INFO, tag, message, data);
  }

  warn(tag: string, message: string, data?: unknown): void {
    this._log(LogLevel.WARN, tag, message, data);
  }

  error(tag: string, message: string, data?: unknown): void {
    this._log(LogLevel.ERROR, tag, message, data);
  }

  // ── Buffer access ──────────────────────────────────────────────────────────

  getLogs(): LogEntry[] {
    const result: LogEntry[] = [];
    const total = Math.min(this.count, RING_SIZE);
    for (let i = 0; i < total; i++) {
      result.push(this.buffer[(this.head - total + i + RING_SIZE) % RING_SIZE]);
    }
    return result;
  }

  clear(): void {
    this.buffer = [];
    this.head   = 0;
    this.count  = 0;
    this._refreshOverlay();
  }

  // ── Phaser scene hook ──────────────────────────────────────────────────────

  hookScene(scene: Phaser.Scene): void {
    scene.sys.events.on('error', (err: unknown) => {
      this.error('Phaser', 'Scene system error', err);
    });
    scene.events.on(Phaser.Scenes.Events.DESTROY, () => {
      this.info('Phaser', `Scene destroyed: ${scene.sys.settings.key}`);
    });
    scene.events.on(Phaser.Scenes.Events.PAUSE, () => {
      this.info('Phaser', `Scene paused: ${scene.sys.settings.key}`);
    });
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private _log(level: LogLevel, tag: string, message: string, data?: unknown): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      level,
      tag,
      message,
      data,
      timestamp:  Date.now(),
      frameCount: this.frame,
    };

    this.buffer[this.head] = entry;
    this.head  = (this.head + 1) % RING_SIZE;
    this.count = Math.min(this.count + 1, RING_SIZE);

    this._consoleOut(entry);
    this._refreshOverlay();
  }

  private _formatTimestamp(ts: number): string {
    const ms  = ts % 60000;
    const min = Math.floor(ts / 60000) % 60;
    const sec = Math.floor(ms / 1000);
    const mss = (ms % 1000).toString().padStart(3, '0');
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${mss}`;
  }

  private _consoleOut(entry: LogEntry): void {
    const prefix = `[GS ${this._formatTimestamp(entry.timestamp)}][${entry.tag}]`;
    const args: unknown[] = [`%c${prefix} ${entry.message}`, LEVEL_CSS[entry.level]];
    if (entry.data !== undefined) args.push(entry.data);

    switch (entry.level) {
      case LogLevel.DEBUG: console.debug(...args);  break;
      case LogLevel.INFO:  console.info(...args);   break;
      case LogLevel.WARN:  console.warn(...args);   break;
      case LogLevel.ERROR: console.error(...args);  break;
    }
  }

  // ── On-screen overlay ──────────────────────────────────────────────────────

  private _buildOverlay(): void {
    // ── Log panel ─────────────────────────────────────────────────────────────
    const el = document.createElement('div');
    el.id = 'gs-logger-overlay';
    Object.assign(el.style, {
      position:      'fixed',
      top:           '48px',
      left:          '4px',
      right:         '4px',
      zIndex:        '99999',
      background:    'rgba(0,0,0,0.88)',
      border:        '1px solid #0ff4',
      padding:       '6px 10px 8px',
      borderRadius:  '6px',
      fontFamily:    'monospace',
      fontSize:      '11px',
      lineHeight:    '1.5',
      maxHeight:     '55vh',
      overflowY:     'auto',
      wordBreak:     'break-all',
      display:       'none',
      pointerEvents: 'auto',
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      color: '#0ff', marginBottom: '4px', fontWeight: 'bold',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    });
    header.innerHTML = '<span>🪲 GravitySwipe Log</span>';

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'CLEAR';
    Object.assign(clearBtn.style, {
      background: 'transparent', border: '1px solid #f44', color: '#f44',
      fontSize: '10px', padding: '1px 6px', cursor: 'pointer', borderRadius: '3px',
    });
    clearBtn.addEventListener('click', () => this.clear());
    header.appendChild(clearBtn);
    el.appendChild(header);

    const list = document.createElement('div');
    el.appendChild(list);

    document.body.appendChild(el);
    this.overlay     = el;
    this.overlayList = list;

    // ── Toggle button — always visible, tap to open/close ─────────────────────
    const btn = document.createElement('button');
    btn.id = 'gs-logger-toggle';
    btn.textContent = '🪲';
    Object.assign(btn.style, {
      position:     'fixed',
      top:          '4px',
      left:         '4px',
      zIndex:       '100000',
      width:        '36px',
      height:       '36px',
      borderRadius: '50%',
      background:   'rgba(0,0,0,0.7)',
      border:       '1px solid #0ff4',
      color:        '#fff',
      fontSize:     '18px',
      lineHeight:   '36px',
      textAlign:    'center',
      cursor:       'pointer',
      pointerEvents:'auto',
      padding:      '0',
      userSelect:   'none',
      touchAction:  'manipulation',
    });
    btn.addEventListener('click', () => this._toggleOverlay());
    document.body.appendChild(btn);
  }

  private _toggleOverlay(): void {
    this.overlayVisible = !this.overlayVisible;
    if (this.overlay) {
      this.overlay.style.display = this.overlayVisible ? 'block' : 'none';
    }
    if (this.overlayVisible) this._refreshOverlay();
  }

  private _refreshOverlay(): void {
    if (!this.overlayVisible || !this.overlayList) return;

    const logs  = this.getLogs();
    const slice = logs.slice(-OVERLAY_MAX);
    this.overlayList.innerHTML = '';

    for (const entry of slice) {
      const row = document.createElement('div');
      row.style.color = LEVEL_COLOR[entry.level];
      const ts  = this._formatTimestamp(entry.timestamp);
      const lbl = LEVEL_LABEL[entry.level].padEnd(5);
      row.textContent = `[${ts}][${entry.tag}] ${lbl} ${entry.message}`;
      this.overlayList.appendChild(row);
    }

    // Auto-scroll to bottom
    this.overlayList.scrollTop = this.overlayList.scrollHeight;
  }

  private _listenBacktick(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === '`') this._toggleOverlay();
    });
  }

  // ── Global error capture ───────────────────────────────────────────────────

  private _installGlobalHandlers(): void {
    window.onerror = (msg, src, line, col, err) => {
      this.error('Global', String(msg), { src, line, col, err });
      return false;
    };

    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      this.error('Global', 'Unhandled promise rejection', event.reason);
    };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

const _instance = new GameLoggerImpl();

export const GameLogger = {
  debug:    (tag: string, msg: string, data?: unknown) => _instance.debug(tag, msg, data),
  info:     (tag: string, msg: string, data?: unknown) => _instance.info(tag, msg, data),
  warn:     (tag: string, msg: string, data?: unknown) => _instance.warn(tag, msg, data),
  error:    (tag: string, msg: string, data?: unknown) => _instance.error(tag, msg, data),
  getLogs:  ()                      => _instance.getLogs(),
  clear:    ()                      => _instance.clear(),
  setLevel: (level: LogLevel)       => _instance.setLevel(level),
  tick:     ()                      => _instance.tick(),
  hookScene:(scene: Phaser.Scene)   => _instance.hookScene(scene),
};
