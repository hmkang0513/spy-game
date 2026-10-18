// 레벨 1회 플레이의 진행 상태 (단서·플래그·목표·동전·체크포인트)
import { ClueBook } from '../core';
import { TUNING } from '../config';
import type {
  CheckpointData,
  ClueId,
  DialogueContext,
  Effect,
  LevelDef,
  LevelStats,
  ObjectiveDef,
} from '../types';
import { bus } from './events';
import { allClueDefs } from './content';

/** 세션이 직접 처리하지 않고 레벨 씬에 넘기는 효과 */
export type SignalEffect = Extract<Effect, { type: 'excuseAccepted' | 'triggerAlarm' | 'endLevel' }>;

export class LevelSession {
  readonly level: LevelDef;
  readonly clues: ClueBook;
  readonly flags = new Set<string>();
  readonly objectivesDone = new Set<string>();
  readonly usedExcuseGuards = new Set<string>();
  readonly visited = new Set<string>();
  readonly openedDoors = new Set<string>();
  /** 수첩에서 아직 보지 않은 단서 (배지) */
  readonly unseen = new Set<ClueId>();
  coins = 0;
  coinsUsed = 0;
  alertCount = 0;
  elapsedSec = 0;
  checkpointRestarts = 0;
  checkpointId: string | null = null;
  /** 대화 로그 (L 키) */
  readonly log: string[] = [];
  /** endLevel 등 씬이 처리할 효과 */
  onSignal: ((e: SignalEffect) => void) | null = null;
  /** 새 플래그가 켜질 때 (L3 chip_taken 등) */
  onFlag: ((flag: string) => void) | null = null;

  constructor(level: LevelDef, carried: ClueId[], checkpoint?: CheckpointData | null) {
    this.level = level;
    const known = new Set(allClueDefs().map((c) => c.id));
    if (checkpoint) {
      this.clues = new ClueBook(allClueDefs(), checkpoint.clues.filter((c) => known.has(c)));
      this.restore(checkpoint);
    } else {
      const start = [...carried, ...level.briefing.startClues].filter((c) => known.has(c));
      this.clues = new ClueBook(allClueDefs(), [...new Set(start)]);
    }
  }

  private restore(c: CheckpointData): void {
    c.flags.forEach((f) => this.flags.add(f));
    c.objectivesDone.forEach((o) => this.objectivesDone.add(o));
    c.usedExcuseGuards.forEach((g) => this.usedExcuseGuards.add(g));
    c.visitedNodes.forEach((n) => this.visited.add(n));
    c.openedDoors.forEach((d) => this.openedDoors.add(d));
    this.coins = c.coins;
    this.coinsUsed = c.coinsUsed;
    this.alertCount = c.alertCount;
    this.elapsedSec = c.elapsedSec;
    this.checkpointId = c.checkpointId;
  }

  /** 체크포인트 저장용 스냅샷 (AC-51) */
  toCheckpoint(checkpointId: string): CheckpointData {
    return {
      version: 1,
      level: this.level.id,
      checkpointId,
      clues: this.clues.ids(),
      flags: [...this.flags],
      objectivesDone: [...this.objectivesDone],
      coins: this.coins,
      coinsUsed: this.coinsUsed,
      usedExcuseGuards: [...this.usedExcuseGuards],
      visitedNodes: [...this.visited],
      alertCount: this.alertCount,
      elapsedSec: this.elapsedSec,
      openedDoors: [...this.openedDoors],
    };
  }

  // ── 단서 ──
  hasClue(id: ClueId): boolean {
    return this.clues.has(id);
  }

  /** 새 단서면 토스트·배지 이벤트를 낸다 (AC-20, AC-22) */
  addClue(id: ClueId): boolean {
    if (!this.clues.add(id)) return false;
    const def = this.clues.list().find((c) => c.id === id);
    this.unseen.add(id);
    if (def) bus.emit('clue:added', { clue: def });
    return true;
  }

  /** L3 단서 연결 (AC-23) */
  combine(a: ClueId, b: ClueId): ClueId | null {
    const before = new Set(this.clues.ids());
    const result = this.clues.combine(a, b, this.level.combos);
    if (result && !before.has(result)) {
      this.unseen.add(result);
      const def = this.clues.list().find((c) => c.id === result);
      if (def) bus.emit('clue:added', { clue: def });
    }
    return result;
  }

  // ── 목표 ──
  get currentObjective(): ObjectiveDef | null {
    return this.level.objectives.find((o) => !this.objectivesDone.has(o.id)) ?? null;
  }

  /** 목표 달성. 순서대로 진행하므로 앞선 목표도 함께 완료 처리한다 */
  completeObjective(id: string): void {
    const idx = this.level.objectives.findIndex((o) => o.id === id);
    if (idx < 0 || this.objectivesDone.has(id)) return;
    for (let i = 0; i <= idx; i++) this.objectivesDone.add(this.level.objectives[i]!.id);
    const completed = this.level.objectives[idx]!;
    bus.emit('objective:changed', { current: this.currentObjective, completed });
  }

  // ── 동전 ──
  giveCoins(n: number): void {
    this.coins = Math.min(TUNING.coin.max, this.coins + n);
    bus.emit('coins:changed', { coins: this.coins });
  }

  useCoin(): boolean {
    if (this.coins <= 0) return false;
    this.coins -= 1;
    this.coinsUsed += 1;
    bus.emit('coins:changed', { coins: this.coins });
    return true;
  }

  // ── 대화 ──
  dialogueContext(): DialogueContext {
    return {
      hasClue: (id) => this.clues.has(id),
      hasFlag: (f) => this.flags.has(f),
      isVisited: (n) => this.visited.has(n),
    };
  }

  setFlag(flag: string): void {
    if (this.flags.has(flag)) return;
    this.flags.add(flag);
    this.onFlag?.(flag);
  }

  applyEffects(effects: Effect[]): void {
    for (const e of effects) {
      switch (e.type) {
        case 'giveClue':
          this.addClue(e.clue);
          break;
        case 'setFlag':
          this.setFlag(e.flag);
          break;
        case 'giveCoins':
          this.giveCoins(e.amount);
          break;
        case 'completeObjective':
          this.completeObjective(e.objective);
          break;
        default:
          this.onSignal?.(e);
      }
    }
  }

  // ── 결과 ──
  stats(): LevelStats {
    // 수집률은 이월 단서를 빼고 현재 레벨 접두어(C1-/C2-/C3-) 단서로 계산한다
    const own = this.level.clues.filter((c) => c.id.startsWith(`C${this.level.id}-`));
    return {
      level: this.level.id,
      timeSec: Math.round(this.elapsedSec),
      alertCount: this.alertCount,
      cluesFound: own.filter((c) => this.clues.has(c.id)).length,
      cluesTotal: own.length,
      coinsUsed: this.coinsUsed,
      checkpointRestarts: this.checkpointRestarts,
    };
  }

  /** 클리어 시 다음 레벨로 넘길 단서 (AC-24) */
  carryOverClues(): ClueId[] {
    return this.clues
      .list()
      .filter((c) => c.carryOver)
      .map((c) => c.id);
  }
}

/** 현재 진행 중인 세션 (씬 사이 공유) */
let current: LevelSession | null = null;

export function currentSession(): LevelSession | null {
  return current;
}

export function setSession(s: LevelSession | null): void {
  current = s;
}
