// localStorage 저장 (04_상세설계서 §3.11, AC-50~55)
import type { CheckpointData, ClueId, Grade, LevelId, SaveData, Settings } from '../types';
import { betterGrade } from './grade';

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export const SAVE_KEY = 'spyGame.save.v1';
export const BACKUP_KEY = 'spyGame.save.v1.bak';
export const CHECKPOINT_KEY = 'spyGame.checkpoint.v1';
export const CORRUPT_KEY_PREFIX = 'spyGame.save.corrupt.';
const PROBE_KEY = 'spyGame.probe';

const GRADES: readonly Grade[] = ['S', 'A', 'B', 'C'];
const TEXT_SPEEDS: readonly Settings['textSpeed'][] = ['slow', 'normal', 'fast', 'instant'];

/** 기본 저장 데이터 (L1 만 해금) */
export function defaultSave(): SaveData {
  return {
    version: 1,
    unlockedLevel: 1,
    bestGrade: {},
    carriedClues: [],
    settings: { volume: 0.8, textSpeed: 'normal', highContrast: false, reduceFlash: false },
  };
}

// ── 검증 ──────────────────────────────────────────
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isLevel = (v: unknown): v is LevelId => v === 1 || v === 2 || v === 3;
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** SaveData 형태를 엄격히 검증하고, 알려진 필드만 담은 사본을 반환한다. 실패 시 null */
export function parseSaveData(v: unknown): SaveData | null {
  if (!isObj(v) || v.version !== 1 || !isLevel(v.unlockedLevel)) return null;
  if (!isObj(v.bestGrade) || !isStrArr(v.carriedClues) || !isObj(v.settings)) return null;

  const bestGrade: SaveData['bestGrade'] = {};
  for (const [k, g] of Object.entries(v.bestGrade)) {
    const lv = Number(k);
    if (!isLevel(lv) || String(lv) !== k || !GRADES.includes(g as Grade)) return null;
    bestGrade[lv] = g as Grade;
  }

  const s = v.settings;
  if (!isNum(s.volume) || !TEXT_SPEEDS.includes(s.textSpeed as Settings['textSpeed'])) return null;
  if (typeof s.highContrast !== 'boolean' || typeof s.reduceFlash !== 'boolean') return null;

  return {
    version: 1,
    unlockedLevel: v.unlockedLevel,
    bestGrade,
    carriedClues: [...v.carriedClues],
    settings: {
      volume: s.volume,
      textSpeed: s.textSpeed as Settings['textSpeed'],
      highContrast: s.highContrast,
      reduceFlash: s.reduceFlash,
    },
  };
}

/** CheckpointData 형태를 검증한다. 실패 시 null */
export function parseCheckpoint(v: unknown): CheckpointData | null {
  if (!isObj(v) || v.version !== 1 || !isLevel(v.level) || typeof v.checkpointId !== 'string') return null;
  const arrays = ['clues', 'flags', 'objectivesDone', 'usedExcuseGuards', 'visitedNodes', 'openedDoors'] as const;
  if (!arrays.every((k) => isStrArr(v[k]))) return null;
  const nums = ['coins', 'coinsUsed', 'alertCount', 'elapsedSec'] as const;
  if (!nums.every((k) => isNum(v[k]))) return null;
  // v1.1 필드: 예전 체크포인트에 없으면 기본값, 있는데 타입이 틀리면 거부
  const restarts = v.checkpointRestarts ?? 0;
  const codeWrong = v.codeWrong ?? {};
  if (!isNum(restarts) || !isObj(codeWrong) || !Object.values(codeWrong).every(isNum)) return null;
  return {
    version: 1,
    level: v.level,
    checkpointId: v.checkpointId,
    clues: [...(v.clues as string[])],
    flags: [...(v.flags as string[])],
    objectivesDone: [...(v.objectivesDone as string[])],
    coins: v.coins as number,
    coinsUsed: v.coinsUsed as number,
    usedExcuseGuards: [...(v.usedExcuseGuards as string[])],
    visitedNodes: [...(v.visitedNodes as string[])],
    alertCount: v.alertCount as number,
    elapsedSec: v.elapsedSec as number,
    openedDoors: [...(v.openedDoors as string[])],
    checkpointRestarts: restarts,
    codeWrong: { ...(codeWrong as Record<string, number>) },
  };
}

function parseJson<T>(raw: string | null, parse: (v: unknown) => T | null): T | null {
  if (raw === null) return null;
  try {
    return parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

// ── 저장소 ────────────────────────────────────────
export class SaveStore {
  private storage: StorageLike | null;
  /** storage 를 못 쓸 때의 대체 저장소 (새로고침하면 사라짐) */
  private readonly memory = new Map<string, string>();

  /**
   * @param storage localStorage 등. null 이면 처음부터 메모리 모드.
   * @param now 손상본 키(epoch)용 시계 — 테스트 주입용
   */
  constructor(
    storage: StorageLike | null,
    private readonly now: () => number = Date.now,
  ) {
    this.storage = storage;
    // 접근 가능 여부를 미리 확인한다 (프라이빗 모드 등에서 쓰기 예외)
    try {
      storage?.setItem(PROBE_KEY, '1');
      storage?.removeItem(PROBE_KEY);
    } catch {
      this.fallback();
    }
  }

  /** false 면 저장이 유지되지 않는다 → HUD 경고 (AC-55) */
  get available(): boolean {
    return this.storage !== null;
  }

  /** 저장 데이터 로드. 손상·버전 불일치 시 손상본 보관 → 백업 복구 → 기본값 (AC-54) */
  load(): { data: SaveData; notice?: 'reset' | 'restoredFromBackup' } {
    const raw = this.get(SAVE_KEY);
    if (raw === null) return { data: defaultSave() };
    const data = parseJson(raw, parseSaveData);
    if (data) return { data };

    this.set(`${CORRUPT_KEY_PREFIX}${this.now()}`, raw);
    this.remove(SAVE_KEY);
    const backup = parseJson(this.get(BACKUP_KEY), parseSaveData);
    if (backup) {
      this.set(SAVE_KEY, JSON.stringify(backup));
      return { data: backup, notice: 'restoredFromBackup' };
    }
    return { data: defaultSave(), notice: 'reset' };
  }

  /** 저장. 기존 값이 정상이면 먼저 BACKUP_KEY 로 복사한다. */
  save(d: SaveData): void {
    const prev = this.get(SAVE_KEY);
    if (prev !== null && parseJson(prev, parseSaveData)) this.set(BACKUP_KEY, prev);
    this.set(SAVE_KEY, JSON.stringify(d));
  }

  /** 체크포인트 로드. 없거나 형식이 틀리면 null */
  loadCheckpoint(): CheckpointData | null {
    return parseJson(this.get(CHECKPOINT_KEY), parseCheckpoint);
  }

  saveCheckpoint(c: CheckpointData): void {
    this.set(CHECKPOINT_KEY, JSON.stringify(c));
  }

  clearCheckpoint(): void {
    this.remove(CHECKPOINT_KEY);
  }

  // storage 호출은 모두 try/catch. 예외가 나면 메모리 모드로 전환한다.
  private get(k: string): string | null {
    if (this.storage) {
      try {
        return this.storage.getItem(k);
      } catch {
        this.fallback();
      }
    }
    return this.memory.get(k) ?? null;
  }

  private set(k: string, v: string): void {
    if (this.storage) {
      try {
        this.storage.setItem(k, v);
        return;
      } catch {
        this.fallback();
      }
    }
    this.memory.set(k, v);
  }

  private remove(k: string): void {
    if (this.storage) {
      try {
        this.storage.removeItem(k);
        return;
      } catch {
        this.fallback();
      }
    }
    this.memory.delete(k);
  }

  private fallback(): void {
    this.storage = null;
  }
}

/**
 * 레벨 클리어 반영 (원본은 바꾸지 않는다).
 * 다음 레벨 해금(최대 3), 더 좋을 때만 최고 등급 갱신, 이월 단서 합집합 (AC-24·58).
 */
export function applyLevelClear(
  d: SaveData,
  level: LevelId,
  grade: Grade,
  carried: ClueId[],
): { data: SaveData; newBest: boolean } {
  const newBest = betterGrade(d.bestGrade[level], grade);
  const unlockedLevel = Math.max(d.unlockedLevel, Math.min(level + 1, 3)) as LevelId;
  const data: SaveData = {
    ...d,
    unlockedLevel,
    bestGrade: newBest ? { ...d.bestGrade, [level]: grade } : { ...d.bestGrade },
    carriedClues: [...new Set([...d.carriedClues, ...carried])],
    settings: { ...d.settings },
  };
  return { data, newBest };
}
