// 레벨 레지스트리
import type { LevelDef, LevelId } from '../../types';
import level1 from './level1';
import level2 from './level2';
import level3 from './level3';

export const LEVELS: Record<LevelId, LevelDef> = {
  1: level1,
  2: level2,
  3: level3,
};

export function getLevel(id: LevelId): LevelDef {
  return LEVELS[id];
}
