// 결과 등급 (04_상세설계서 §3.10, AC-56~58)
import type { Grade, LevelStats } from '../types';

export type { LevelStats } from '../types';

const RANK: Record<Grade, number> = { C: 0, B: 1, A: 2, S: 3 };

/**
 * 등급 계산. S = 경보 0 + 단서 100% + 목표 시간 이내 / A = 경보 ≤1 + 단서 ≥80% / B = 경보 ≤3 / C.
 * L1(경비 없음)은 경보를 무시: S = 단서 100% + 시간 이내 / A = 80%+ / B = 50%+ / C.
 */
export function computeGrade(s: LevelStats, targetTimeSec: number): Grade {
  const ratio = s.cluesTotal > 0 ? s.cluesFound / s.cluesTotal : 1;
  const inTime = s.timeSec <= targetTimeSec;
  if (s.level === 1) {
    if (ratio >= 1 && inTime) return 'S';
    if (ratio >= 0.8) return 'A';
    if (ratio >= 0.5) return 'B';
    return 'C';
  }
  if (s.alertCount === 0 && ratio >= 1 && inTime) return 'S';
  if (s.alertCount <= 1 && ratio >= 0.8) return 'A';
  if (s.alertCount <= 3) return 'B';
  return 'C';
}

/** b 가 a 보다 좋으면 true (a 가 없으면 항상 true) */
export function betterGrade(a: Grade | undefined, b: Grade): boolean {
  return a === undefined || RANK[b] > RANK[a];
}
