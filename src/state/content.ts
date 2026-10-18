// 콘텐츠 데이터 접근 창구 — 씬·엔티티는 data/* 를 직접 import 하지 않고 여기를 쓴다
import { ABILITIES } from '../data/abilities';
import { CHARACTERS } from '../data/characters';
import { LEVELS } from '../data/levels';
import type { AbilityDef, CharacterDef, ClueDef, ClueId, Dialogue, LevelDef, LevelId } from '../types';

export const LEVEL_IDS: LevelId[] = [1, 2, 3];

export function getLevel(id: LevelId): LevelDef {
  return LEVELS[id];
}

/** 모든 레벨의 단서 정의 (이월 단서 표시에 필요) */
export function allClueDefs(): ClueDef[] {
  const map = new Map<ClueId, ClueDef>();
  for (const id of LEVEL_IDS) for (const c of LEVELS[id].clues) if (!map.has(c.id)) map.set(c.id, c);
  return [...map.values()];
}

export function clueName(id: ClueId): string {
  return allClueDefs().find((c) => c.id === id)?.name ?? id;
}

export function findDialogue(level: LevelDef, id: string): Dialogue | undefined {
  return level.dialogues.find((d) => d.id === id);
}

export function character(id: string): CharacterDef | undefined {
  return CHARACTERS[id];
}

/** 레벨 N 에서 쓸 수 있는 능력 (level <= N) */
export function abilitiesFor(level: LevelId): AbilityDef[] {
  return ABILITIES.filter((a) => a.level <= level);
}

/** 레벨 N 에서 새로 생기는 능력 */
export function newAbilitiesAt(level: LevelId): AbilityDef[] {
  return ABILITIES.filter((a) => a.level === level);
}
