// 수첩(단서 모음) (04_상세설계서 §3.6, AC-20~24)
import type { ClueCombo, ClueDef, ClueId } from '../types';

export class ClueBook {
  private readonly defs: Map<ClueId, ClueDef>;
  /** 획득 순서를 유지한다 */
  private readonly owned = new Set<ClueId>();

  constructor(defs: ClueDef[], initial: ClueId[] = []) {
    this.defs = new Map(defs.map((d) => [d.id, d]));
    for (const id of initial) this.owned.add(id);
  }

  /** 단서를 추가한다. 새로 얻으면 true, 이미 있으면 false (AC-22) */
  add(id: ClueId): boolean {
    if (this.owned.has(id)) return false;
    this.owned.add(id);
    return true;
  }

  has(id: ClueId): boolean {
    return this.owned.has(id);
  }

  /** 보유 단서 정의 (획득 순). defs 에 없는 id 는 제외한다. */
  list(): ClueDef[] {
    return this.ids().flatMap((id) => this.defs.get(id) ?? []);
  }

  /** 보유 단서 id (획득 순) */
  ids(): ClueId[] {
    return [...this.owned];
  }

  /** 단서 두 개를 연결한다 (순서 무관, AC-23). 유효하면 결과를 add 하고 그 id 를, 아니면 null */
  combine(a: ClueId, b: ClueId, combos: ClueCombo[]): ClueId | null {
    if (a === b) return null;
    const hit = combos.find((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a));
    if (!hit) return null;
    this.add(hit.result);
    return hit.result;
  }
}
