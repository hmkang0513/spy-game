// EventBus 이벤트 (04_상세설계서 §2.7)
import type { ClueDef } from './clue';
import type { AlertState, Exposure, LevelStats } from './core';
import type { ObjectiveDef } from './level';

export interface GameEvents {
  'clue:added': { clue: ClueDef };
  'objective:changed': { current: ObjectiveDef | null; completed?: ObjectiveDef };
  'alert:changed': { state: AlertState; prev: AlertState };
  'exposure:changed': { exposure: Exposure };
  'coins:changed': { coins: number };
  toast: { kind: 'clue' | 'objective' | 'info' | 'warn'; text: string };
  'checkpoint:saved': { id: string };
  'player:caught': { by: string };
  'level:complete': { stats: LevelStats };
}

export type GameEventName = keyof GameEvents;
