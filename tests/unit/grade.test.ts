// U-GRD-* 등급 (04 §3.10, AC-57·58)
import { describe, expect, it } from 'vitest';
import { betterGrade, computeGrade } from '../../src/core';
import type { LevelStats } from '../../src/types';

const TARGET = 720; // L2 목표 12분
const stats = (o: Partial<LevelStats> = {}): LevelStats => ({
  level: 2,
  timeSec: 600,
  alertCount: 0,
  cluesFound: 6,
  cluesTotal: 6,
  coinsUsed: 0,
  checkpointRestarts: 0,
  ...o,
});

describe('grade', () => {
  it('U-GRD-01 S = 경보 0 + 단서 100% + 목표 시간 이내 (같으면 이내)', () => {
    expect(computeGrade(stats(), TARGET)).toBe('S');
    expect(computeGrade(stats({ timeSec: TARGET }), TARGET)).toBe('S');
  });

  it('U-GRD-01 A = 경보 1회 이하 + 단서 80% 이상', () => {
    expect(computeGrade(stats({ timeSec: TARGET + 1 }), TARGET)).toBe('A'); // 시간 초과
    expect(computeGrade(stats({ alertCount: 1 }), TARGET)).toBe('A');
    expect(computeGrade(stats({ cluesFound: 5 }), TARGET)).toBe('A'); // 83%
    expect(computeGrade(stats({ alertCount: 1, cluesFound: 4, cluesTotal: 5 }), TARGET)).toBe('A'); // 정확히 80%
  });

  it('U-GRD-01 B = 경보 3회 이하', () => {
    expect(computeGrade(stats({ alertCount: 2 }), TARGET)).toBe('B');
    expect(computeGrade(stats({ alertCount: 3 }), TARGET)).toBe('B');
    expect(computeGrade(stats({ alertCount: 1, cluesFound: 3, cluesTotal: 5 }), TARGET)).toBe('B'); // 60%
    expect(computeGrade(stats({ alertCount: 0, cluesFound: 0 }), TARGET)).toBe('B');
  });

  it('U-GRD-01 C = 그 외', () => {
    expect(computeGrade(stats({ alertCount: 4 }), TARGET)).toBe('C');
    expect(computeGrade(stats({ alertCount: 10, timeSec: 9999 }), TARGET)).toBe('C');
  });

  it('U-GRD-01 L1 규칙: 경보 무시, S=100%+시간 / A=80%+ / B=50%+ / C', () => {
    const l1 = (o: Partial<LevelStats>) => stats({ level: 1, cluesTotal: 6, ...o });
    const T1 = 360;
    expect(computeGrade(l1({ timeSec: 300, cluesFound: 6, alertCount: 5 }), T1)).toBe('S');
    expect(computeGrade(l1({ timeSec: 400, cluesFound: 6 }), T1)).toBe('A');
    expect(computeGrade(l1({ timeSec: 300, cluesFound: 5 }), T1)).toBe('A');
    expect(computeGrade(l1({ timeSec: 300, cluesFound: 4, cluesTotal: 5 }), T1)).toBe('A');
    expect(computeGrade(l1({ timeSec: 300, cluesFound: 3 }), T1)).toBe('B'); // 정확히 50%
    expect(computeGrade(l1({ timeSec: 300, cluesFound: 4 }), T1)).toBe('B');
    expect(computeGrade(l1({ timeSec: 300, cluesFound: 2 }), T1)).toBe('C');
  });

  it('U-GRD-02 betterGrade: b 가 더 좋을 때만 true', () => {
    expect(betterGrade(undefined, 'C')).toBe(true);
    expect(betterGrade('C', 'B')).toBe(true);
    expect(betterGrade('A', 'S')).toBe(true);
    expect(betterGrade('S', 'A')).toBe(false);
    expect(betterGrade('B', 'B')).toBe(false);
    expect(betterGrade('A', 'C')).toBe(false);
  });
});
