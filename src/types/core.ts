// core 모듈이 주고받는 타입 (04_상세설계서 §3)
import type { ClueId } from './clue';
import type { LevelId } from './level';

export interface ConeParams {
  fovDeg: number;
  nearTiles: number;
  midTiles: number;
  farTiles: number;
}
export type ConeZone = 'none' | 'near' | 'mid' | 'far';

export interface DetectionInput {
  zone: ConeZone;
  crouched: boolean;
  hidden: boolean;
}

export type AlertState = 'calm' | 'suspicious' | 'alert' | 'search' | 'caution';

export interface AlertInput {
  /** 모든 경비 중 최대 감지 게이지 0..1 */
  maxGauge: number;
  /** 이번 프레임에 게이지 100% 도달 */
  spotted: boolean;
  anyGuardSeesPlayer: boolean;
  /** 조사 중인 경비가 있음 */
  investigating: boolean;
  noiseHeard: boolean;
}

export interface AlertTimings {
  suspiciousClearSec: number;
  lostSightSec: number;
  searchSec: number;
  cautionSec: number;
}

export interface ChoiceView {
  /** 원본 choices 배열 인덱스 */
  index: number;
  text: string;
  locked: boolean;
  /** 부족한 단서 */
  missing: ClueId[];
  visited: boolean;
}

export type DialogueMode = 'line' | 'choice' | 'present' | 'code' | 'end';

export interface DialogueView {
  nodeId: string;
  speaker: string;
  text: string;
  mode: DialogueMode;
  choices: ChoiceView[];
}

export interface DialogueContext {
  hasClue(id: ClueId): boolean;
  hasFlag(flag: string): boolean;
  isVisited(nodeId: string): boolean;
}

export interface LevelStats {
  level: LevelId;
  timeSec: number;
  alertCount: number;
  cluesFound: number;
  cluesTotal: number;
  coinsUsed: number;
  checkpointRestarts: number;
}

export type Exposure = 'hidden' | 'safe' | 'exposed';
