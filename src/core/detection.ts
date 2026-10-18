// 감지 게이지 (04_상세설계서 §3.3, AC-27·28)
import { TUNING } from '../config';
import type { DetectionInput } from '../types';

export type { DetectionInput } from '../types';

/** 구역·자세별 게이지 충전 시간(초). null = 감지 안 됨 (원뿔 밖·숨음·먼 구역 웅크리기) */
export function fillTimeSec(i: DetectionInput): number | null {
  if (i.hidden || i.zone === 'none') return null;
  const row = TUNING.fillTime[i.zone];
  return i.crouched ? row.crouch : row.stand;
}

/** dt(초) 동안 게이지를 갱신한다. 감지되면 충전, 아니면 초당 gaugeDecayPerSec 감소. 결과는 0..1 */
export function updateGauge(gauge: number, dt: number, i: DetectionInput): number {
  const fill = fillTimeSec(i);
  const next = fill === null ? gauge - TUNING.gaugeDecayPerSec * dt : gauge + dt / fill;
  return Math.min(1, Math.max(0, next));
}
