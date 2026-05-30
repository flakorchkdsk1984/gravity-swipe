import { StageType } from '../config/types';

const STORAGE_KEY = 'gs_story_v1';

const UNLOCK_ORDER: StageType[] = [
  StageType.MAIN,
  StageType.POWER_SPEED,
  StageType.POWER_SHIELD,
  StageType.POWER_SCORE,
  StageType.POWER_GHOST,
  StageType.POWER_FREEZE,
  StageType.POWER_MAGNET,
  StageType.POWER_SLOW,
  StageType.FINAL,
];

const STORY_ACTS: Record<StageType, { title: string; lines: string[] }> = {
  [StageType.MAIN]: {
    title: 'ACTO I — DESPERTAR',
    lines: [
      'En el vacío entre dimensiones,',
      'una partícula despierta.',
      '',
      'Tú eres AXIOM.',
      '',
      'La Grieta te llama.',
      'Debes atravesarla.',
    ],
  },
  [StageType.POWER_SPEED]: {
    title: 'ACTO II — LA LLAMA ROJA',
    lines: [
      'Bien hecho, AXIOM.',
      'Sentiste el Vacío.',
      '',
      'Ahora... ¿puedes sentir el calor?',
      'El cristal Rojo pulsa ante ti.',
      '',
      'Velocidad sin límites.',
      'Úsala.',
    ],
  },
  [StageType.POWER_SHIELD]: {
    title: 'ACTO III — LA ARMADURA',
    lines: [
      'El cristal Naranja brilla.',
      '',
      'El Vacío no te destruirá.',
      'No mientras tengas el Escudo.',
      '',
      'Aprende a confiar en él.',
    ],
  },
  [StageType.POWER_SCORE]: {
    title: 'ACTO IV — LA MULTIPLICACIÓN',
    lines: [
      'El cristal Amarillo vibra.',
      '',
      'Cada golpe vale más.',
      'Cada combo, una sinfonía.',
      '',
      'El poder de amplificar',
      'es tuyo ahora.',
    ],
  },
  [StageType.POWER_GHOST]: {
    title: 'ACTO V — LA SOMBRA',
    lines: [
      'Espera... ¿puedes ver a través?',
      '',
      'El cristal Violeta te susurra:',
      '"No eres sólido."',
      '',
      'Atraviesa.',
      'Sé la sombra.',
    ],
  },
  [StageType.POWER_FREEZE]: {
    title: 'ACTO VI — EL TIEMPO SE DETIENE',
    lines: [
      'El cristal Azul congela el aire.',
      '',
      'Tus enemigos se paralizan.',
      'El mundo se detiene.',
      '',
      'Solo tú te mueves.',
    ],
  },
  [StageType.POWER_MAGNET]: {
    title: 'ACTO VII — ATRACCIÓN',
    lines: [
      'El cristal Blanco atrae.',
      '',
      'Todo lo que existe',
      'gravita hacia ti.',
      '',
      'Controla la atracción.',
      'Controla el Vacío.',
    ],
  },
  [StageType.POWER_SLOW]: {
    title: 'ACTO VIII — LA PAUSA',
    lines: [
      'El cristal Rosa ralentiza',
      'el flujo del tiempo.',
      '',
      'Precisión sobre velocidad.',
      'Calma sobre caos.',
      '',
      'El último poder te espera.',
    ],
  },
  [StageType.FINAL]: {
    title: 'ACTO IX — LA GRIETA FINAL',
    lines: [
      'AXIOM.',
      '',
      'Ocho dimensiones atravesadas.',
      'Ocho poderes dominados.',
      '',
      'Solo queda LA GRIETA.',
      '',
      'Este es tu destino.',
      'No hay vuelta atrás.',
    ],
  },
};

export class StoryManager {
  private static instance: StoryManager;
  private unlockedStages: Set<StageType>;

  private constructor() {
    this.unlockedStages = this._load();
    this.unlockedStages.add(StageType.MAIN);
    this._save();
  }

  static getInstance(): StoryManager {
    if (!StoryManager.instance) {
      StoryManager.instance = new StoryManager();
    }
    return StoryManager.instance;
  }

  isUnlocked(type: StageType): boolean {
    return this.unlockedStages.has(type);
  }

  /** Call when a stage is completed. Returns the newly unlocked StageType or null. */
  unlockNext(completedStage: StageType): StageType | null {
    const idx = UNLOCK_ORDER.indexOf(completedStage);
    if (idx === -1 || idx >= UNLOCK_ORDER.length - 1) return null;
    const next = UNLOCK_ORDER[idx + 1];
    if (this.unlockedStages.has(next)) return null;
    this.unlockedStages.add(next);
    this._save();
    return next;
  }

  getStoryAct(type: StageType): { title: string; lines: string[] } {
    return STORY_ACTS[type];
  }

  resetProgress(): void {
    this.unlockedStages = new Set([StageType.MAIN]);
    this._save();
  }

  private _load(): Set<StageType> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw) as { unlocked: string[] };
      const validTypes = new Set<string>(Object.values(StageType));
      const types = parsed.unlocked.filter(s => validTypes.has(s)) as StageType[];
      return new Set(types);
    } catch {
      return new Set();
    }
  }

  private _save(): void {
    const data = { unlocked: Array.from(this.unlockedStages) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}
