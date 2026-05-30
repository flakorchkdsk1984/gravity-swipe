// ─────────────────────────────────────────────────────────────────────────────
// GameDataLoader — singleton that parses game-data.txt and exposes typed data.
// Usage: call parse(rawText) from PreloadScene, then query from any scene.
// ─────────────────────────────────────────────────────────────────────────────

export interface GameDataEntry {
  category: string;   // OBSTACLE, ENEMY, COMBO, BONUS, POWER, MECHANIC, SCORE
  id: string;
  value: number;      // numeric value (point value, threshold, duration, etc.)
  name: string;
  description: string;
}

export class GameDataLoader {
  private static instance: GameDataLoader;
  private entries: GameDataEntry[] = [];
  private loaded = false;

  private constructor() {}

  static getInstance(): GameDataLoader {
    if (!GameDataLoader.instance) GameDataLoader.instance = new GameDataLoader();
    return GameDataLoader.instance;
  }

  /** Call from PreloadScene after Phaser loads game-data.txt into cache.text */
  parse(rawText: string): void {
    this.entries = [];
    const lines = rawText.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const parts = trimmed.split('|');
      if (parts.length < 5) continue;
      this.entries.push({
        category:    parts[0].trim(),
        id:          parts[1].trim(),
        value:       parseFloat(parts[2]) || 0,
        name:        parts[3].trim(),
        description: parts[4].trim(),
      });
    }
    this.loaded = true;
  }

  isLoaded(): boolean { return this.loaded; }

  getAll(): GameDataEntry[] { return this.entries; }

  getByCategory(category: string): GameDataEntry[] {
    return this.entries.filter(e => e.category === category);
  }

  getById(category: string, id: string): GameDataEntry | undefined {
    return this.entries.find(e => e.category === category && e.id === id);
  }

  /** Get point value for an object (obstacle, enemy, bonus) */
  getPointValue(category: string, id: string): number {
    return this.getById(category, id)?.value ?? 0;
  }

  /** Get all power descriptions for UI */
  getPowerDescriptions(): Map<string, { name: string; description: string; color: string }> {
    const map = new Map<string, { name: string; description: string; color: string }>();
    this.getByCategory('POWER').forEach(e => {
      map.set(e.id, { name: e.name, description: e.description, color: e.value.toString() });
    });
    return map;
  }

  /** Dump all entries to console (for debugging) */
  dump(): void {
    console.table(this.entries);
  }
}
