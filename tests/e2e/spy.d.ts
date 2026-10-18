// window.__spy 테스트 API 타입 (04_상세설계서 §7 그대로)
import type { AlertState, ClueId, DialogueView, LevelId, SaveData } from '../../src/types';

export type SpySceneKey = 'Title' | 'LevelSelect' | 'Briefing' | 'Level' | 'Result';

export interface SpyState {
  level?: LevelId;
  clues: ClueId[];
  flags: string[];
  objective?: string;
  alert?: AlertState;
  coins?: number;
  phase?: string;
}

export interface SpyTestApi {
  /** 현재 활성 메인 씬 키 */
  scene(): string;
  state(): SpyState;
  goto(scene: SpySceneKey, data?: object): void;
  teleport(tx: number, ty: number): void;
  giveClue(id: ClueId): void;
  /** E 와 동일 */
  interact(): void;
  /** 열린 대화 */
  dialogue(): DialogueView | null;
  choose(index: number): void;
  advance(): void;
  present(id: ClueId): void;
  save(): SaveData;
}

declare global {
  interface Window {
    __spy: SpyTestApi;
  }
}
