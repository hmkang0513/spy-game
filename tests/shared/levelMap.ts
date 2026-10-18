// 레벨 데이터 분석 도우미 — 단위(데이터 검증)와 E2E 가 함께 쓴다. 구현 코드가 아니라 계약(LevelDef)만 본다.
import type { ClueId, Dialogue, LevelDef, TilePos, TileRect } from '../../src/types';

export const key = (t: TilePos): string => `${t.tx},${t.ty}`;

export function mapSize(level: LevelDef): { width: number; height: number } {
  return { width: level.map.rows[0]?.length ?? 0, height: level.map.rows.length };
}

export function inBounds(level: LevelDef, t: TilePos): boolean {
  const { width, height } = mapSize(level);
  return Number.isInteger(t.tx) && Number.isInteger(t.ty) && t.tx >= 0 && t.ty >= 0 && t.tx < width && t.ty < height;
}

/** legend 의 solid 플래그 기준 이동 가능 여부 (범위 밖·미정의 문자 = 불가) */
export function isPassable(level: LevelDef, t: TilePos): boolean {
  if (!inBounds(level, t)) return false;
  const ch = level.map.rows[t.ty]![t.tx]!;
  const entry = level.map.legend[ch];
  return entry !== undefined && !entry.solid;
}

export function neighbours4(t: TilePos): TilePos[] {
  return [
    { tx: t.tx + 1, ty: t.ty },
    { tx: t.tx - 1, ty: t.ty },
    { tx: t.tx, ty: t.ty + 1 },
    { tx: t.tx, ty: t.ty - 1 },
  ];
}

/** 스폰에서 BFS. 잠긴 문(lockedDoor) 위치는 열린 것으로 간주한다 (D-05) */
export function reachableFrom(level: LevelDef, start: TilePos): Set<string> {
  const doors = new Set(level.interactables.filter((i) => i.kind === 'lockedDoor').map((i) => key(i.pos)));
  const ok = (t: TilePos) => inBounds(level, t) && (isPassable(level, t) || doors.has(key(t)));
  const seen = new Set<string>();
  if (!ok(start)) return seen;
  const queue: TilePos[] = [start];
  seen.add(key(start));
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of neighbours4(cur)) {
      if (!seen.has(key(n)) && ok(n)) {
        seen.add(key(n));
        queue.push(n);
      }
    }
  }
  return seen;
}

/** 대상 타일 자체나 4방향 이웃 중 하나에 닿을 수 있으면 true (가구 위 은신처·금고 등) */
export function canApproach(reach: Set<string>, t: TilePos): boolean {
  return reach.has(key(t)) || neighbours4(t).some((n) => reach.has(key(n)));
}

export function inRect(r: TileRect, t: TilePos): boolean {
  return t.tx >= r.tx && t.ty >= r.ty && t.tx < r.tx + r.w && t.ty < r.ty + r.h;
}

/** 대화 하나에서 참조하는 단서 ID 전부 */
export function clueRefsOfDialogue(d: Dialogue): ClueId[] {
  const out: ClueId[] = [];
  for (const e of d.entries) out.push(...(e.when?.clues ?? []), ...(e.when?.notClues ?? []));
  for (const n of Object.values(d.nodes)) {
    for (const ef of n.effects ?? []) if (ef.type === 'giveClue') out.push(ef.clue);
    for (const c of n.choices ?? []) {
      out.push(...(c.requires ?? []), ...(c.showIf?.clues ?? []), ...(c.showIf?.notClues ?? []));
      for (const ef of c.effects ?? []) if (ef.type === 'giveClue') out.push(ef.clue);
    }
    out.push(...(n.present?.accept ?? []));
  }
  return out;
}

/** 대화 안에서 giveClue 로 주는 단서 */
export function cluesGivenBy(d: Dialogue): ClueId[] {
  const out: ClueId[] = [];
  for (const n of Object.values(d.nodes)) {
    for (const ef of n.effects ?? []) if (ef.type === 'giveClue') out.push(ef.clue);
    for (const c of n.choices ?? []) for (const ef of c.effects ?? []) if (ef.type === 'giveClue') out.push(ef.clue);
  }
  return out;
}
