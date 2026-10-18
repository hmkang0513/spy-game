// 단위 테스트용 손으로 만든 고정 데이터 (구현 코드와 무관하게 계약만으로 작성)
import type {
  ClueCombo,
  ClueDef,
  CheckpointData,
  Dialogue,
  DialogueContext,
  MapDef,
  SaveData,
  Vec2,
} from '../../src/types';
import type { Grid } from '../../src/core';
import { TILE } from '../../src/config';
import { buildLegend } from '../../src/data/tiles';

/**
 * ASCII 행으로 Grid 계약(04 §3.1)을 직접 구현한다.
 * '#' = solid+opaque(벽), '=' = solid만(카운터), 그 외 = 바닥. 범위 밖 = solid & opaque.
 */
export function makeGrid(rows: string[]): Grid {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const at = (tx: number, ty: number): string | undefined =>
    tx < 0 || ty < 0 || tx >= width || ty >= height ? undefined : rows[ty]?.[tx];
  return {
    width,
    height,
    isSolid(tx: number, ty: number) {
      const c = at(tx, ty);
      return c === undefined || c === '#' || c === '=';
    },
    isOpaque(tx: number, ty: number) {
      const c = at(tx, ty);
      return c === undefined || c === '#';
    },
  };
}

/** 테두리만 벽인 빈 방 */
export function openRoom(width: number, height: number): string[] {
  const rows: string[] = [];
  for (let y = 0; y < height; y++) {
    if (y === 0 || y === height - 1) rows.push('#'.repeat(width));
    else rows.push('#' + '.'.repeat(width - 2) + '#');
  }
  return rows;
}

/** 빈 방에 세로 벽 한 줄(x = col)을 세운다 */
export function withVerticalWall(rows: string[], col: number): string[] {
  return rows.map((r) => r.slice(0, col) + '#' + r.slice(col + 1));
}

/** 타일 중심 픽셀 좌표 (04 §1: tx*32+16) */
export function center(tx: number, ty: number): Vec2 {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

/** origin 에서 angleRad 방향으로 distTiles 타일 떨어진 점 */
export function polar(origin: Vec2, angleRad: number, distTiles: number): Vec2 {
  return {
    x: origin.x + Math.cos(angleRad) * distTiles * TILE,
    y: origin.y + Math.sin(angleRad) * distTiles * TILE,
  };
}

export const deg = (d: number): number => (d * Math.PI) / 180;

/** buildLegend 기반 MapDef (gridFromMap 계약 확인용) */
export function makeMap(rows: string[]): MapDef {
  return { tileset: 'tiles_l1', rows, legend: buildLegend('tiles_l1') };
}

/** 대화 문맥 — 단서·플래그·방문 노드를 바깥에서 조작할 수 있는 가짜 */
export interface FakeContext extends DialogueContext {
  clues: Set<string>;
  flags: Set<string>;
  visited: Set<string>;
}
export function makeContext(init: { clues?: string[]; flags?: string[]; visited?: string[] } = {}): FakeContext {
  const clues = new Set(init.clues ?? []);
  const flags = new Set(init.flags ?? []);
  const visited = new Set(init.visited ?? []);
  return {
    clues,
    flags,
    visited,
    hasClue: (id) => clues.has(id),
    hasFlag: (f) => flags.has(f),
    isVisited: (n) => visited.has(n),
  };
}

export const KNOWN_CLUES = ['C-KEY', 'C-HIDDEN', 'C-A', 'C-B', 'C-BADGE', 'C-X'];

/**
 * 테스트용 대화 그래프.
 * entries: flag 'met' → again / 단서 C-KEY → withKey / 기본 → start
 */
export function makeDialogue(): Dialogue {
  return {
    id: 'test_npc',
    entries: [
      { when: { flags: ['met'] }, node: 'again' },
      { when: { clues: ['C-KEY'] }, node: 'withKey' },
      { node: 'start' },
    ],
    nodes: {
      start: { id: 'start', speaker: 'npc', text: '처음 보는 얼굴이군.', summaryText: '또 왔군.', next: 'menu' },
      again: { id: 'again', speaker: 'npc', text: '다시 왔군.', next: 'menu' },
      withKey: { id: 'withKey', speaker: 'npc', text: '열쇠 냄새가 나는군.', next: 'menu' },
      menu: {
        id: 'menu',
        speaker: 'npc',
        text: '무엇을 원하지?',
        choices: [
          { text: '평범한 질문', next: 'plain', effects: [{ type: 'setFlag', flag: 'asked' }] },
          { text: '암호를 말한다', next: 'secret', requires: ['C-KEY'] },
          { text: '숨겨진 선택지', next: 'plain', showIf: { clues: ['C-HIDDEN'] } },
          { text: '증거를 보여 준다', next: 'ask' },
          { text: '금고를 연다', next: 'safe' },
        ],
      },
      plain: {
        id: 'plain',
        speaker: 'npc',
        text: '그렇군.',
        effects: [
          { type: 'giveClue', clue: 'C-A' },
          { type: 'giveCoins', amount: 3 },
          { type: 'completeObjective', objective: 'obj1' },
        ],
      },
      secret: { id: 'secret', speaker: 'npc', text: '암호가 맞다.', effects: [{ type: 'giveClue', clue: 'C-B' }] },
      ask: {
        id: 'ask',
        speaker: 'npc',
        text: '누가 보냈지?',
        present: { accept: ['C-BADGE'], success: 'askOk', wrong: 'askWrong' },
      },
      askWrong: { id: 'askWrong', speaker: 'npc', text: '그건 아닌데.', next: 'ask' },
      askOk: { id: 'askOk', speaker: 'npc', text: '좋아, 믿지.', effects: [{ type: 'setFlag', flag: 'trusted' }] },
      safe: {
        id: 'safe',
        speaker: 'narrator',
        text: '번호를 입력한다.',
        codeInput: { answer: '0321', success: 'safeOpen', wrong: 'safeWrong', maxWrong: 3, onMaxWrong: 'safeAlarm' },
      },
      safeWrong: { id: 'safeWrong', speaker: 'narrator', text: '틀렸다.', next: 'safe' },
      safeOpen: { id: 'safeOpen', speaker: 'narrator', text: '열렸다!', effects: [{ type: 'giveClue', clue: 'C-X' }] },
      safeAlarm: { id: 'safeAlarm', speaker: 'narrator', text: '경보가 울린다!', effects: [{ type: 'triggerAlarm' }] },
    },
  };
}

export function clueDef(id: string, extra: Partial<ClueDef> = {}): ClueDef {
  return { id, name: `단서 ${id}`, kind: 'document', description: '설명', source: '테스트', ...extra };
}

export const CLUE_DEFS: ClueDef[] = ['C2-04', 'C3-01', 'C3-02', 'C1-01', 'C1-03'].map((id) => clueDef(id));
export const COMBOS: ClueCombo[] = [{ a: 'C2-04', b: 'C3-01', result: 'C3-02' }];

/** 메모리 StorageLike — 내부 Map 을 그대로 노출해 저장 내용을 검사한다 */
export class MemoryStorage {
  readonly map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  keys(): string[] {
    return [...this.map.keys()];
  }
}

/** 모든 호출에서 예외를 던지는 storage (프라이빗 모드·할당량 초과 흉내) */
export class ThrowingStorage {
  getItem(_k: string): string | null {
    throw new Error('SecurityError: storage blocked');
  }
  setItem(_k: string, _v: string): void {
    throw new Error('QuotaExceededError');
  }
  removeItem(_k: string): void {
    throw new Error('SecurityError: storage blocked');
  }
}

export function sampleSave(base: SaveData): SaveData {
  return { ...base, unlockedLevel: 2, bestGrade: { 1: 'A' }, carriedClues: ['C1-06'] };
}

export function sampleCheckpoint(): CheckpointData {
  return {
    version: 1,
    level: 2,
    checkpointId: 'CP2-2',
    clues: ['C1-06', 'C2-01'],
    flags: ['entered'],
    objectivesDone: ['o1', 'o2'],
    coins: 0,
    coinsUsed: 0,
    usedExcuseGuards: ['G1'],
    visitedNodes: ['bella_start'],
    alertCount: 1,
    elapsedSec: 123.5,
    openedDoors: [],
  };
}
