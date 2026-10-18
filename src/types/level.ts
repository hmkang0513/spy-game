// 레벨 (04_상세설계서 §2.4)
import type { CharacterId } from './character';
import type { ClueCombo, ClueDef, ClueId } from './clue';
import type { Dialogue } from './dialogue';
import type { Facing, TilePos, TileRect } from './geometry';

export type LevelId = 1 | 2 | 3;

export interface TileLegendEntry {
  /** 타일셋 프레임 인덱스 */
  frame: number;
  /** 이동 충돌 */
  solid: boolean;
  /** 시야 차단 */
  opaque: boolean;
  /** 위 레이어 장식 프레임 (선택) */
  deco?: number;
}

export interface MapDef {
  /** public/assets/tiles/<tileset>.png 의 키 */
  tileset: string;
  /** ASCII 행. 모든 행 길이가 같아야 한다 (= width) */
  rows: string[];
  legend: Record<string, TileLegendEntry>;
}

export type GuardKind = 'static' | 'rotate' | 'patrol';

export interface GuardDef {
  id: string;
  character: CharacterId;
  kind: GuardKind;
  pos: TilePos;
  facingDeg: number;
  /** static/rotate: 순서대로 바라봄 */
  rotate?: { anglesDeg: number[]; holdSec: number };
  /** patrol: 순환 */
  patrol?: { waypoints: TilePos[]; waitSec: number };
  /** L3 브루노 하품 (C3-05) */
  blink?: { everySec: number; closedSec: number };
  catchLine?: string;
}

export interface NpcDef {
  id: string;
  character: CharacterId;
  pos: TilePos;
  facing: Facing;
  /** Dialogue.id */
  dialogue: string;
}

export type InteractableKind = 'inspect' | 'hide' | 'lockedDoor' | 'coinPickup' | 'exit';

export interface InteractableDef {
  id: string;
  kind: InteractableKind;
  pos: TilePos;
  /** inspect, 금고 등은 대화로 처리 */
  dialogue?: string;
  /** lockedDoor 핀 수 */
  pins?: number;
  /** lockedDoor 를 바로 여는 단서 (C3-03) */
  opensWithClue?: ClueId;
  /** 이 단서를 얻기 전엔 숨김 (비상 통로) */
  revealedBy?: ClueId;
  /** exit: 필요한 단서. 없으면 blockedText (AC-60) */
  requires?: ClueId[];
  /** exit·lockedDoor: 조건을 못 채웠을 때 문구 */
  blockedText?: string;
  /** lockedDoor: opensWithClue 로 열렸을 때 문구 */
  openText?: string;
}

export interface ObjectiveDef {
  id: string;
  text: string;
}

export interface CheckpointDef {
  id: string;
  area: TileRect;
  spawn: TilePos;
}

export interface ZoneDef {
  id: string;
  kind: 'guest' | 'staff';
  area: TileRect;
  label: string;
}

/** 대화 효과로 표현하지 않는 레벨 진행 규칙 (NFR-07: 엔진 코드에 콘텐츠 id 를 두지 않는다) */
export interface LevelRules {
  /** 이 플래그가 켜지면 체크포인트 저장 후 무음 경보 (AC-61) */
  silentAlarmFlag?: string;
  /** staff 구역에 처음 들어가면 완료되는 목표 */
  staffZoneObjective?: string;
  /** 단서가 생기면 완료되는 목표 { 단서: 목표 } */
  clueObjectives?: Record<ClueId, string>;
  /** 경비 blink(하품) 빈틈 표시를 여는 단서 */
  blinkRevealClue?: ClueId;
  /** 검문 무마 후 돌려보낼 손님 구역 id (AC-40) */
  excuseReturnZone?: string;
  /** 경비 원뿔에 처음 들어갔을 때 한 번 띄우는 안내 (L1 튜토리얼) */
  coneHintText?: string;
}

export interface LevelDef {
  id: LevelId;
  title: string;
  subtitle: string;
  targetTimeSec: number;
  /** L1 = false (AC-13, AC-59) */
  guardsActive: boolean;
  briefing: { dialogue: string; objectivesPreview: string[]; startClues: ClueId[] };
  map: MapDef;
  player: { spawn: TilePos; facing: Facing; character: CharacterId };
  npcs: NpcDef[];
  guards: GuardDef[];
  interactables: InteractableDef[];
  clues: ClueDef[];
  combos: ClueCombo[];
  /** 순서대로 진행 */
  objectives: ObjectiveDef[];
  checkpoints: CheckpointDef[];
  zones: ZoneDef[];
  dialogues: Dialogue[];
  rules?: LevelRules;
}
