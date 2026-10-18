// 레벨 전역 경보 상태 머신 (04_상세설계서 §3.4, AC-32~35)
import { DEFAULT_ALERT_TIMINGS, TUNING } from '../config';
import type { AlertInput, AlertState, AlertTimings } from '../types';

export type { AlertInput, AlertState, AlertTimings } from '../types';

export class AlertMachine {
  state: AlertState = 'calm';
  /** 현재 상태에 머문 시간(초) */
  timeInState = 0;
  /** 'alert' 진입 횟수 (reset 해도 유지) */
  alertCount = 0;

  private readonly timings: AlertTimings;
  /** suspicious → calm 조건(게이지 0 + 조사 없음)이 연속으로 유지된 시간 */
  private clearTimer = 0;
  /** alert 중 아무도 플레이어를 못 본 연속 시간 */
  private lostTimer = 0;

  constructor(timings?: Partial<AlertTimings>) {
    this.timings = { ...DEFAULT_ALERT_TIMINGS, ...timings };
  }

  /** dt(초) 만큼 진행하고 (전이 후) 상태를 반환한다. 한 번 호출에 최대 한 번 전이한다. */
  update(dt: number, i: AlertInput): AlertState {
    this.timeInState += dt;
    const t = this.timings;
    const suspicious = i.maxGauge >= TUNING.suspicionThreshold || i.noiseHeard;

    if (i.spotted && this.state !== 'alert') {
      this.enter('alert');
      return this.state;
    }

    switch (this.state) {
      case 'calm':
        if (suspicious) this.enter('suspicious');
        break;
      case 'suspicious':
        this.clearTimer = i.maxGauge <= 0 && !i.investigating ? this.clearTimer + dt : 0;
        if (this.clearTimer >= t.suspiciousClearSec) this.enter('calm');
        break;
      case 'alert':
        this.lostTimer = i.anyGuardSeesPlayer ? 0 : this.lostTimer + dt;
        if (this.lostTimer >= t.lostSightSec) this.enter('search');
        break;
      case 'search':
        if (this.timeInState >= t.searchSec) this.enter('caution');
        break;
      case 'caution':
        if (suspicious) this.enter('suspicious');
        else if (this.timeInState >= t.cautionSec) this.enter('calm');
        break;
    }
    return this.state;
  }

  /** 즉시 경보 (무음 경보 AC-61, 금고 3회 오답 등). 이미 경보 중이면 횟수를 늘리지 않는다. */
  forceAlert(): void {
    if (this.state !== 'alert') this.enter('alert');
  }

  /** 체크포인트 복귀 → calm. alertCount 는 유지한다. */
  reset(): void {
    this.enter('calm');
  }

  private enter(s: AlertState): void {
    if (s === 'alert') this.alertCount += 1;
    this.state = s;
    this.timeInState = 0;
    this.clearTimer = 0;
    this.lostTimer = 0;
  }
}
