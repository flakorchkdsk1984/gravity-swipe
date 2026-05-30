import { Injectable } from '@angular/core';

export interface LeaderboardEntry {
  name: string;   // 1-4 char initials
  emoji: string;
  timeMs: number;
  score: number;
  date: string;   // ISO date string
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly KEY = 'gs_leaderboard_v1';
  private readonly MAX_ENTRIES = 10;

  getEntries(): LeaderboardEntry[] {
    try {
      const raw = localStorage.getItem(this.KEY);
      const entries: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];
      return entries.sort((a, b) => a.timeMs - b.timeMs);
    } catch {
      return [];
    }
  }

  addEntry(entry: LeaderboardEntry): LeaderboardEntry[] {
    const entries = this.getEntries();
    entries.push(entry);
    entries.sort((a, b) => a.timeMs - b.timeMs);
    const trimmed = entries.slice(0, this.MAX_ENTRIES);
    localStorage.setItem(this.KEY, JSON.stringify(trimmed));
    return trimmed;
  }

  clear(): void {
    localStorage.removeItem(this.KEY);
  }

  formatTime(ms: number): string {
    const totalSec = ms / 1000;
    const min = Math.floor(totalSec / 60);
    const sec = Math.floor(totalSec % 60);
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }
}
