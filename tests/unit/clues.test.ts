// U-CLU-* 단서 수첩 (04 §3.6, AC-22·23)
import { describe, expect, it } from 'vitest';
import { ClueBook } from '../../src/core';
import { CLUE_DEFS, COMBOS } from './fixtures';

describe('clues', () => {
  it('U-CLU-01 새 단서 add → true, 중복 add → false', () => {
    const b = new ClueBook(CLUE_DEFS, ['C1-01']);
    expect(b.has('C1-01')).toBe(true);
    expect(b.add('C1-01')).toBe(false);
    expect(b.add('C1-03')).toBe(true);
    expect(b.add('C1-03')).toBe(false);
    expect(b.ids().filter((id) => id === 'C1-03')).toHaveLength(1);
    expect(new Set(b.ids())).toEqual(new Set(['C1-01', 'C1-03']));
    expect(b.list().map((d) => d.id).sort()).toEqual(['C1-01', 'C1-03']);
    expect(b.list().find((d) => d.id === 'C1-03')?.name).toBe('단서 C1-03');
  });

  it('U-CLU-02 combine 순서 무관 성공 (결과 add 까지)', () => {
    const b1 = new ClueBook(CLUE_DEFS, ['C2-04', 'C3-01']);
    expect(b1.combine('C2-04', 'C3-01', COMBOS)).toBe('C3-02');
    expect(b1.has('C3-02')).toBe(true);

    const b2 = new ClueBook(CLUE_DEFS, ['C2-04', 'C3-01']);
    expect(b2.combine('C3-01', 'C2-04', COMBOS)).toBe('C3-02');
    expect(b2.has('C3-02')).toBe(true);
  });

  it('U-CLU-02 무효 조합 → null, 수첩 변화 없음', () => {
    const b = new ClueBook(CLUE_DEFS, ['C2-04', 'C1-01', 'C3-01']);
    const before = [...b.ids()].sort();
    expect(b.combine('C2-04', 'C1-01', COMBOS)).toBeNull();
    expect(b.combine('C3-01', 'C3-01', COMBOS)).toBeNull();
    expect([...b.ids()].sort()).toEqual(before);
    expect(b.has('C3-02')).toBe(false);
  });
});
