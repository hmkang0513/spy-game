// D-01 ~ D-08 레벨 데이터 검증 (06 §4.2, 05_레벨설계서)
import { describe, expect, it } from 'vitest';
import { validateDialogue } from '../../src/core';
import { getLevel, LEVELS } from '../../src/data/levels';
import { ABILITIES } from '../../src/data/abilities';
import type { AbilityDef, ClueId, LevelDef, LevelId } from '../../src/types';
import {
  canApproach,
  clueRefsOfDialogue,
  inBounds,
  inRect,
  isPassable,
  key,
  mapSize,
  reachableFrom,
} from '../shared/levelMap';

const IDS: LevelId[] = [1, 2, 3];

/** 레벨 N 에서 정의로 인정하는 단서: 레벨 1..N 의 clues 합집합 (이월 단서 포함) */
function knownClues(id: LevelId): Set<ClueId> {
  const s = new Set<ClueId>();
  for (const l of IDS.filter((i) => i <= id)) for (const c of getLevel(l).clues) s.add(c.id);
  return s;
}

/** 레벨 N 시작 시 들고 오는 단서: 이전 레벨의 carryOver 단서 */
function carriedInto(id: LevelId): Set<ClueId> {
  const s = new Set<ClueId>();
  for (const l of IDS.filter((i) => i < id)) for (const c of getLevel(l).clues) if (c.carryOver) s.add(c.id);
  return s;
}

/** 획득 가능한 단서의 고정점: 시작·이월 단서 + 대화 giveClue(선택지 requires 충족 시) + 조합 */
function obtainable(level: LevelDef): Set<ClueId> {
  const have = new Set<ClueId>([...level.briefing.startClues, ...carriedInto(level.id)]);
  let changed = true;
  while (changed) {
    changed = false;
    const add = (c: ClueId) => {
      if (!have.has(c)) {
        have.add(c);
        changed = true;
      }
    };
    for (const d of level.dialogues) {
      for (const n of Object.values(d.nodes)) {
        for (const ef of n.effects ?? []) if (ef.type === 'giveClue') add(ef.clue);
        for (const c of n.choices ?? []) {
          if ((c.requires ?? []).every((r) => have.has(r))) {
            for (const ef of c.effects ?? []) if (ef.type === 'giveClue') add(ef.clue);
          }
        }
      }
    }
    for (const cb of level.combos) if (have.has(cb.a) && have.has(cb.b)) add(cb.result);
  }
  return have;
}

const allValues = <T>(x: unknown): T[] => Object.values(x as Record<string, T>);

describe('data.levels', () => {
  it('LEVELS 에 레벨 1~3 이 있고 getLevel(id).id 가 일치', () => {
    expect(allValues<LevelDef>(LEVELS)).toHaveLength(3);
    for (const id of IDS) expect(getLevel(id).id).toBe(id);
    expect(getLevel(1).guardsActive).toBe(false);
    expect(getLevel(2).guardsActive).toBe(true);
    expect(getLevel(3).guardsActive).toBe(true);
  });

  describe.each(IDS)('레벨 %i', (id) => {
    const L = () => getLevel(id);

    it('D-01 모든 대화가 validateDialogue 오류 0, 참조 대화 존재, id 중복 없음', () => {
      const level = L();
      const known = [...knownClues(id)];
      const errors: string[] = [];
      for (const d of level.dialogues) {
        for (const e of validateDialogue(d, known)) errors.push(`${d.id}: ${e}`);
      }
      expect(errors).toEqual([]);

      const dialogueIds = level.dialogues.map((d) => d.id);
      expect(new Set(dialogueIds).size).toBe(dialogueIds.length);
      const refs = [
        level.briefing.dialogue,
        ...level.npcs.map((n) => n.dialogue),
        ...level.interactables.flatMap((i) => (i.dialogue ? [i.dialogue] : [])),
      ];
      const missing = refs.filter((r) => !dialogueIds.includes(r));
      expect(missing).toEqual([]);
    });

    it('D-02 대화·인터랙트·출구·조합·브리핑이 참조하는 단서 ID 가 모두 정의됨', () => {
      const level = L();
      const known = knownClues(id);
      const refs: { where: string; clue: ClueId }[] = [];
      for (const d of level.dialogues) for (const c of clueRefsOfDialogue(d)) refs.push({ where: `dialogue ${d.id}`, clue: c });
      for (const i of level.interactables) {
        for (const c of [i.opensWithClue, i.revealedBy, ...(i.requires ?? [])]) {
          if (c) refs.push({ where: `interactable ${i.id}`, clue: c });
        }
      }
      for (const cb of level.combos) for (const c of [cb.a, cb.b, cb.result]) refs.push({ where: 'combo', clue: c });
      for (const c of level.briefing.startClues) refs.push({ where: 'briefing', clue: c });
      expect(refs.filter((r) => !known.has(r.clue))).toEqual([]);
      // 레벨 안 단서 ID 중복 없음
      const ids = level.clues.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('D-03 맵 행 길이 동일, legend 미정의 문자 없음, 크기', () => {
      const level = L();
      const { width, height } = mapSize(level);
      const expected = id === 1 ? { width: 28, height: 20 } : { width: 40, height: 30 };
      expect({ width, height }).toEqual(expected);
      const badRows = level.map.rows.map((r, y) => ({ y, len: r.length })).filter((r) => r.len !== width);
      expect(badRows).toEqual([]);
      const undefinedChars = new Set<string>();
      for (const r of level.map.rows) for (const ch of r) if (!(ch in level.map.legend)) undefinedChars.add(ch);
      expect([...undefinedChars]).toEqual([]);
    });

    it('D-04 스폰·NPC·경비·웨이포인트·인터랙트·체크포인트가 맵 안의 이동 가능 타일', () => {
      const level = L();
      const bad: string[] = [];
      const strict = (what: string, t: { tx: number; ty: number }) => {
        if (!isPassable(level, t)) bad.push(`${what} @${key(t)}`);
      };
      strict('spawn', level.player.spawn);
      for (const n of level.npcs) strict(`npc ${n.id}`, n.pos);
      for (const g of level.guards) {
        strict(`guard ${g.id}`, g.pos);
        for (const w of g.patrol?.waypoints ?? []) strict(`guard ${g.id} waypoint`, w);
      }
      for (const cp of level.checkpoints) {
        strict(`checkpoint ${cp.id} spawn`, cp.spawn);
        const corners = [
          { tx: cp.area.tx, ty: cp.area.ty },
          { tx: cp.area.tx + cp.area.w - 1, ty: cp.area.ty + cp.area.h - 1 },
        ];
        if (!corners.every((c) => inBounds(level, c)) || cp.area.w < 1 || cp.area.h < 1) bad.push(`checkpoint ${cp.id} area`);
      }
      // 인터랙트는 가구(은신처·금고) 위에 놓일 수 있다 → 그 경우 이동 가능한 4방향 이웃이 있어야 한다
      for (const i of level.interactables) {
        if (!inBounds(level, i.pos)) {
          bad.push(`interactable ${i.id} out of map`);
          continue;
        }
        const ok =
          isPassable(level, i.pos) ||
          i.kind === 'lockedDoor' ||
          [
            { tx: i.pos.tx + 1, ty: i.pos.ty },
            { tx: i.pos.tx - 1, ty: i.pos.ty },
            { tx: i.pos.tx, ty: i.pos.ty + 1 },
            { tx: i.pos.tx, ty: i.pos.ty - 1 },
          ].some((n) => isPassable(level, n));
        if (!ok) bad.push(`interactable ${i.id} @${key(i.pos)}`);
      }
      expect(bad).toEqual([]);
    });

    it('D-04 체크포인트 spawn 은 자기 area 안', () => {
      const level = L();
      expect(level.checkpoints.filter((cp) => !inRect(cp.area, cp.spawn)).map((cp) => cp.id)).toEqual([]);
    });

    it('D-05 스폰에서 모든 NPC·인터랙트·출구·체크포인트까지 길이 존재 (잠긴 문 = 열림)', () => {
      const level = L();
      const reach = reachableFrom(level, level.player.spawn);
      const unreachable: string[] = [];
      for (const n of level.npcs) if (!canApproach(reach, n.pos)) unreachable.push(`npc ${n.id}`);
      for (const i of level.interactables) if (!canApproach(reach, i.pos)) unreachable.push(`${i.kind} ${i.id}`);
      for (const cp of level.checkpoints) if (!canApproach(reach, cp.spawn)) unreachable.push(`checkpoint ${cp.id}`);
      expect(unreachable).toEqual([]);
      expect(level.interactables.some((i) => i.kind === 'exit')).toBe(true);
    });

    it('D-06 필수 단서(출구 requires·비선택 단서)는 획득 경로가 있음', () => {
      const level = L();
      const have = obtainable(level);
      const exitReqs = level.interactables.filter((i) => i.kind === 'exit').flatMap((i) => i.requires ?? []);
      expect(exitReqs.filter((c) => !have.has(c))).toEqual([]);
      const required = level.clues.filter((c) => !c.optional).map((c) => c.id);
      expect(required.filter((c) => !have.has(c))).toEqual([]);
    });
  });

  it('D-06 레벨별 핵심 단서 (05_레벨설계서)', () => {
    // L1: 초대장(이월). L2: 거래 문서·박사의 메모가 뒷문 조건(AC-60). L3: 금고 번호 조합·오로라 칩
    const c1 = getLevel(1).clues.find((c) => c.id === 'C1-06');
    expect(c1?.carryOver).toBe(true);
    expect(obtainable(getLevel(1)).has('C1-06')).toBe(true);

    const l2 = getLevel(2);
    const l2Exit = l2.interactables.filter((i) => i.kind === 'exit');
    expect(l2Exit.some((e) => ['C2-03', 'C2-04'].every((c) => e.requires?.includes(c)))).toBe(true);
    for (const id of ['C2-03', 'C2-04', 'C2-05']) expect(l2.clues.find((c) => c.id === id)?.carryOver).toBe(true);

    const l3 = getLevel(3);
    const combo = l3.combos.find(
      (cb) => cb.result === 'C3-02' && new Set([cb.a, cb.b]).size === 2 && [cb.a, cb.b].every((c) => ['C2-04', 'C3-01'].includes(c)),
    );
    expect(combo).toBeDefined();
    const have3 = obtainable(l3);
    expect(have3.has('C3-02')).toBe(true);
    expect(have3.has('C3-06')).toBe(true);
    expect(l3.interactables.some((i) => i.kind === 'exit')).toBe(true);
  });

  it('D-07 능력 해금표: L1 2개, L2 4개, L3 6개', () => {
    const list = allValues<AbilityDef>(ABILITIES);
    expect(list).toHaveLength(6);
    expect(new Set(list.map((a) => a.id))).toEqual(new Set(['move', 'talk', 'crouch', 'hide', 'lockpick', 'coin']));
    const upTo = (n: number) => list.filter((a) => a.level <= n).length;
    expect([upTo(1), upTo(2), upTo(3)]).toEqual([2, 4, 6]);
    const levelOf = Object.fromEntries(list.map((a) => [a.id, a.level]));
    expect(levelOf).toEqual({ move: 1, talk: 1, crouch: 2, hide: 2, lockpick: 3, coin: 3 });
  });

});
