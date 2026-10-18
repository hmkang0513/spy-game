// D-08 캐릭터 참조 검증 (06 §4.2)
import { describe, expect, it } from 'vitest';
import { getLevel } from '../../src/data/levels';
import { CHARACTERS, getCharacter } from '../../src/data/characters';
import type { CharacterDef, LevelDef, LevelId } from '../../src/types';

const IDS: LevelId[] = [1, 2, 3];
const levels = (): LevelDef[] => IDS.map((id) => getLevel(id));
const allValues = <T>(x: unknown): T[] => Object.values(x as Record<string, T>);

describe('data.characters', () => {
  it('D-08 캐릭터 ID 참조가 모두 정의됨', () => {
    const defined = new Set(allValues<CharacterDef>(CHARACTERS).map((c) => c.id));
    const missing: string[] = [];
    for (const level of levels()) {
      const refs = [level.player.character, ...level.npcs.map((n) => n.character), ...level.guards.map((g) => g.character)];
      for (const r of refs) {
        if (!defined.has(r)) missing.push(`L${level.id}: ${r}`);
        else expect(getCharacter(r).id).toBe(r);
      }
    }
    expect(missing).toEqual([]);
  });

  it.each(IDS)('D-08 레벨 %i 안 NPC 외형(캐릭터 ID)이 중복되지 않음 (경비 제외)', (id) => {
    const chars = getLevel(id).npcs.map((n) => n.character);
    const dup = chars.filter((c, i) => chars.indexOf(c) !== i);
    expect(dup).toEqual([]);
    const ids = getLevel(id).npcs.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
