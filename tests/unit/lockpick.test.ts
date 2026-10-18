// U-LCK-* 자물쇠 미니게임 (04 §3.8, AC-42~44). rng 를 주입해 결정적으로 돈다.
import { describe, expect, it } from 'vitest';
import { LockpickGame } from '../../src/core';
import { TUNING } from '../../src/config';

/** 고정 순서 rng */
function seqRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

function make(pins = 3, rng: () => number = seqRng([0.3, 0.7, 0.1, 0.55])): LockpickGame {
  return new LockpickGame({ pins, periodSec: TUNING.lockpick.periodSec, zoneRatio: TUNING.lockpick.zoneRatio, rng });
}

/** 커서가 [lo, hi] 안에 들어올 때까지 시간을 잘게 흘린다 */
function moveCursorInto(g: LockpickGame, lo: number, hi: number): void {
  for (let i = 0; i < 20000; i++) {
    if (g.cursor >= lo && g.cursor <= hi) return;
    g.update(0.002);
  }
  throw new Error(`커서가 [${lo}, ${hi}] 에 들어오지 않음 (cursor=${g.cursor})`);
}

/** 성공 구간 가운데로 */
function aimInside(g: LockpickGame): void {
  const pad = g.zoneRatio * 0.3;
  moveCursorInto(g, g.zoneStart + pad, g.zoneStart + g.zoneRatio - pad);
}

/** 성공 구간에서 충분히 먼 곳으로 */
function aimOutside(g: LockpickGame): void {
  const lo = g.zoneStart - 0.08;
  const hi = g.zoneStart + g.zoneRatio + 0.08;
  if (lo > 0.1) moveCursorInto(g, 0.01, lo - 0.02);
  else moveCursorInto(g, hi + 0.02, 0.99);
}

describe('lockpick', () => {
  it('초기 상태: pins, pinsSet 0, 구간이 막대 안', () => {
    const g = make(3);
    expect(g.pins).toBe(3);
    expect(g.pinsSet).toBe(0);
    expect(g.zoneRatio).toBeCloseTo(TUNING.lockpick.zoneRatio);
    expect(g.zoneStart).toBeGreaterThanOrEqual(0);
    expect(g.zoneStart + g.zoneRatio).toBeLessThanOrEqual(1 + 1e-9);
    expect(g.cursor).toBeGreaterThanOrEqual(0);
    expect(g.cursor).toBeLessThanOrEqual(1);
  });

  it('커서는 0..1 을 삼각파로 왕복하고 주기는 periodSec', () => {
    const g = make(3);
    let min = 1;
    let max = 0;
    for (let i = 0; i < 1200; i++) {
      g.update(0.002);
      min = Math.min(min, g.cursor);
      max = Math.max(max, g.cursor);
      expect(g.cursor).toBeGreaterThanOrEqual(0);
      expect(g.cursor).toBeLessThanOrEqual(1);
    }
    expect(min).toBeLessThan(0.05);
    expect(max).toBeGreaterThan(0.95);
    // 한 주기 뒤 같은 위치
    g.update(0.1);
    const c0 = g.cursor;
    g.update(TUNING.lockpick.periodSec / 2);
    g.update(TUNING.lockpick.periodSec / 2);
    expect(g.cursor).toBeCloseTo(c0, 2);
  });

  it('U-LCK-01 구간 안 press → hit, 핀 수만큼 → done', () => {
    const g = make(3);
    aimInside(g);
    expect(g.press()).toBe('hit');
    expect(g.pinsSet).toBe(1);
    aimInside(g);
    expect(g.press()).toBe('hit');
    expect(g.pinsSet).toBe(2);
    aimInside(g);
    expect(g.press()).toBe('done');
    expect(g.pinsSet).toBe(3);
  });

  it('U-LCK-01 금고실 문 4핀도 4번 맞히면 done', () => {
    const g = make(4);
    const results: string[] = [];
    for (let i = 0; i < 4; i++) {
      aimInside(g);
      results.push(g.press());
    }
    expect(results).toEqual(['hit', 'hit', 'hit', 'done']);
  });

  it('U-LCK-02 구간 밖 → miss, pinsSet 0', () => {
    const g = make(3);
    aimInside(g);
    expect(g.press()).toBe('hit');
    aimInside(g);
    expect(g.press()).toBe('hit');
    expect(g.pinsSet).toBe(2);
    aimOutside(g);
    expect(g.press()).toBe('miss');
    expect(g.pinsSet).toBe(0);
    // miss 후에도 구간은 막대 안에 재배치되고 다시 시도할 수 있다
    expect(g.zoneStart).toBeGreaterThanOrEqual(0);
    expect(g.zoneStart + g.zoneRatio).toBeLessThanOrEqual(1 + 1e-9);
    aimInside(g);
    expect(g.press()).toBe('hit');
    expect(g.pinsSet).toBe(1);
  });

  it('U-LCK-02 첫 핀부터 miss 해도 pinsSet 0', () => {
    const g = make(3);
    aimOutside(g);
    expect(g.press()).toBe('miss');
    expect(g.pinsSet).toBe(0);
  });
});
