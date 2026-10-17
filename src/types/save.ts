// 저장 (04_상세설계서 §2.6)
import type { ClueId } from './clue';
import type { LevelId } from './level';

export type Grade = 'S' | 'A' | 'B' | 'C';

export interface Settings {
  volume: number;
  textSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  highContrast: boolean;
  reduceFlash: boolean;
}

export interface SaveData {
  version: 1;
  unlockedLevel: LevelId;
  bestGrade: Partial<Record<LevelId, Grade>>;
  carriedClues: ClueId[];
  settings: Settings;
}

export interface CheckpointData {
  version: 1;
  level: LevelId;
  checkpointId: string;
  clues: ClueId[];
  flags: string[];
  objectivesDone: string[];
  coins: number;
  coinsUsed: number;
  usedExcuseGuards: string[];
  visitedNodes: string[];
  alertCount: number;
  elapsedSec: number;
  openedDoors: string[];
}
