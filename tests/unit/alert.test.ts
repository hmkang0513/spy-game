// U-ALR-* 레벨 경보 상태 머신 (04 §3.4, AC-33·52·61)
import { describe, expect, it } from 'vitest';
import { AlertMachine } from '../../src/core';
import type { AlertInput } from '../../src/types';
import { DEFAULT_ALERT_TIMINGS, TUNING } from '../../src/config';

const T = DEFAULT_ALERT_TIMINGS;
const IDLE: AlertInput = { maxGauge: 0, spotted: false, anyGuardSeesPlayer: false, investigating: false, noiseHeard: false };
const inp = (o: Partial<AlertInput> = {}): AlertInput => ({ ...IDLE, ...o });

/** seconds 만큼 dt 단위로 같은 입력을 준다 */
function run(m: AlertMachine, seconds: number, i: AlertInput = IDLE, dt = 0.05): void {
  const steps = Math.round(seconds / dt);
  for (let k = 0; k < steps; k++) m.update(dt, i);
}

/** 입력 없이 상태가 바뀔 때까지 흘리고, 머문 시간을 돌려준다 */
function dwell(m: AlertMachine, dt = 0.05, maxSec = 120): { from: string; to: string; sec: number } {
  const from = m.state;
  let sec = 0;
  while (m.state === from && sec < maxSec) {
    m.update(dt, IDLE);
    sec += dt;
  }
  return { from, to: m.state, sec };
}

function toAlert(m: AlertMachine): void {
  m.update(0.05, inp({ spotted: true, anyGuardSeesPlayer: true, maxGauge: 1 }));
  expect(m.state).toBe('alert');
}

describe('alert', () => {
  it('기본 타이밍은 TUNING.alert 와 같다', () => {
    expect(T.lostSightSec).toBe(TUNING.alert.lostSightSec);
    expect(T.searchSec).toBe(TUNING.alert.searchSec);
    expect(T.cautionSec).toBe(TUNING.alert.cautionSec);
    expect(T.suspiciousClearSec).toBe(TUNING.alert.suspiciousClearSec);
    const m = new AlertMachine();
    expect(m.state).toBe('calm');
    expect(m.alertCount).toBe(0);
  });

  it('U-ALR-01 calm → suspicious (게이지 0.5)', () => {
    const m = new AlertMachine(T);
    expect(m.update(0.05, inp({ maxGauge: TUNING.suspicionThreshold - 0.01 }))).toBe('calm');
    expect(m.update(0.05, inp({ maxGauge: TUNING.suspicionThreshold }))).toBe('suspicious');
    expect(m.state).toBe('suspicious');
    expect(m.alertCount).toBe(0);
  });

  it('U-ALR-01 calm → suspicious (소음)', () => {
    const m = new AlertMachine(T);
    expect(m.update(0.05, inp({ noiseHeard: true }))).toBe('suspicious');
  });

  it('U-ALR-01 suspicious → calm: 게이지 0 + 조사 종료 후 4s', () => {
    const m = new AlertMachine(T);
    m.update(0.05, inp({ maxGauge: 0.6 }));
    // 조사 중이면 시간이 지나도 의심 유지
    run(m, T.suspiciousClearSec + 2, inp({ investigating: true }));
    expect(m.state).toBe('suspicious');
    run(m, T.suspiciousClearSec - 0.3);
    expect(m.state).toBe('suspicious');
    run(m, 0.6);
    expect(m.state).toBe('calm');
  });

  it('U-ALR-02 spotted → alert, alertCount 증가 (calm·suspicious 에서)', () => {
    const m = new AlertMachine(T);
    toAlert(m);
    expect(m.alertCount).toBe(1);

    const m2 = new AlertMachine(T);
    m2.update(0.05, inp({ maxGauge: 0.7 }));
    expect(m2.state).toBe('suspicious');
    m2.update(0.05, inp({ spotted: true, anyGuardSeesPlayer: true, maxGauge: 1 }));
    expect(m2.state).toBe('alert');
    expect(m2.alertCount).toBe(1);
  });

  it('U-ALR-03 alert → search(3s) → caution(20s) → calm(30s)', () => {
    const m = new AlertMachine(T);
    toAlert(m);
    // 계속 보이는 동안은 경보 유지
    run(m, T.lostSightSec + 2, inp({ anyGuardSeesPlayer: true, maxGauge: 1 }));
    expect(m.state).toBe('alert');
    // 각 상태에 머문 시간을 잰다 (허용 오차 0.15s)
    expect(dwell(m)).toEqual({ from: 'alert', to: 'search', sec: expect.closeTo(T.lostSightSec, 0.15) });
    expect(dwell(m)).toEqual({ from: 'search', to: 'caution', sec: expect.closeTo(T.searchSec, 0.15) });
    expect(dwell(m)).toEqual({ from: 'caution', to: 'calm', sec: expect.closeTo(T.cautionSec, 0.15) });
    expect(m.alertCount).toBe(1);
  });

  it('U-ALR-03 caution → suspicious (게이지 0.5 / 소음), caution → alert (spotted)', () => {
    const m = new AlertMachine(T);
    toAlert(m);
    run(m, T.lostSightSec + 0.5);
    run(m, T.searchSec + 0.5);
    expect(m.state).toBe('caution');
    m.update(0.05, inp({ maxGauge: 0.5 }));
    expect(m.state).toBe('suspicious');

    const n = new AlertMachine(T);
    toAlert(n);
    run(n, T.lostSightSec + 0.5);
    run(n, T.searchSec + 0.5);
    expect(n.state).toBe('caution');
    n.update(0.05, inp({ noiseHeard: true }));
    expect(n.state).toBe('suspicious');

    const k = new AlertMachine(T);
    toAlert(k);
    run(k, T.lostSightSec + 0.5);
    run(k, T.searchSec + 0.5);
    expect(k.state).toBe('caution');
    k.update(0.05, inp({ spotted: true, anyGuardSeesPlayer: true, maxGauge: 1 }));
    expect(k.state).toBe('alert');
    expect(k.alertCount).toBe(2);
  });

  it('U-ALR-04 search 중 spotted → alert 복귀', () => {
    const m = new AlertMachine(T);
    toAlert(m);
    run(m, T.lostSightSec + 0.5);
    expect(m.state).toBe('search');
    m.update(0.05, inp({ spotted: true, anyGuardSeesPlayer: true, maxGauge: 1 }));
    expect(m.state).toBe('alert');
    expect(m.alertCount).toBe(2);
  });

  it('U-ALR-05 reset() 후 calm, alertCount 유지', () => {
    const m = new AlertMachine(T);
    toAlert(m);
    m.reset();
    expect(m.state).toBe('calm');
    expect(m.alertCount).toBe(1);
    expect(m.timeInState).toBe(0);
  });

  it('U-ALR-05 forceAlert() → alert, alertCount +1 (무음 경보)', () => {
    const m = new AlertMachine(T);
    m.forceAlert();
    expect(m.state).toBe('alert');
    expect(m.alertCount).toBe(1);
    // 보이지 않으면 일반 경보처럼 수색으로 넘어간다
    run(m, T.lostSightSec + 0.5);
    expect(m.state).toBe('search');
  });

  it('U-ALR-06 enterCaution() → caution, 그 시점부터 cautionSec 후 calm (v1.1, AC-40)', () => {
    const m = new AlertMachine(T);
    // 수색 중 오래 머문 뒤 검문 무마 → 주의 타이머는 새로 시작
    toAlert(m);
    run(m, T.lostSightSec + 0.5);
    run(m, 10);
    expect(m.state).toBe('search');
    const count = m.alertCount;
    m.enterCaution();
    expect(m.state).toBe('caution');
    expect(m.alertCount).toBe(count);
    expect(dwell(m)).toEqual({ from: 'caution', to: 'calm', sec: expect.closeTo(T.cautionSec, 0.15) });
  });

  it('U-ALR-06 caution 이 이미 진행 중이어도 enterCaution 은 타이머를 초기화', () => {
    const m = new AlertMachine(T);
    m.enterCaution();
    run(m, T.cautionSec - 5);
    expect(m.state).toBe('caution');
    m.enterCaution();
    expect(dwell(m).sec).toBeCloseTo(T.cautionSec, 0);
  });
});
