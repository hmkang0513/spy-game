// U-DET-* 감지 게이지 (04 §3.3, AC-27·28·38)
import { describe, expect, it } from 'vitest';
import { fillTimeSec, updateGauge } from '../../src/core';
import type { ConeZone, DetectionInput } from '../../src/types';
import { TUNING } from '../../src/config';

const inp = (zone: ConeZone, crouched = false, hidden = false): DetectionInput => ({ zone, crouched, hidden });

describe('detection', () => {
  it('U-DET-01 near 0.4s / mid 1.0·2.0s / far 1.6s·null 충전 시간', () => {
    expect(fillTimeSec(inp('near'))).toBeCloseTo(TUNING.fillTime.near.stand);
    expect(fillTimeSec(inp('near', true))).toBeCloseTo(TUNING.fillTime.near.crouch);
    expect(fillTimeSec(inp('mid'))).toBeCloseTo(TUNING.fillTime.mid.stand);
    expect(fillTimeSec(inp('mid', true))).toBeCloseTo(TUNING.fillTime.mid.crouch);
    expect(fillTimeSec(inp('far'))).toBeCloseTo(TUNING.fillTime.far.stand);
    expect(fillTimeSec(inp('far', true))).toBeNull();
    expect(fillTimeSec(inp('none'))).toBeNull();
    // 숨은 상태는 near 에서도 감지 없음 (AC-38)
    expect(fillTimeSec(inp('near', false, true))).toBeNull();
    // 문서 기본값 확인
    expect(TUNING.fillTime.near.stand).toBe(0.4);
    expect(TUNING.fillTime.mid.crouch).toBe(2.0);
  });

  it('U-DET-01 게이지는 충전 시간에 비례해 오르고 1 에서 멈춘다', () => {
    const t = TUNING.fillTime.mid.stand;
    expect(updateGauge(0, t / 4, inp('mid'))).toBeCloseTo(0.25, 5);
    // near: 0.4초를 잘게 나눠 진행하면 ≈1
    let g = 0;
    for (let i = 0; i < 10; i++) g = updateGauge(g, TUNING.fillTime.near.stand / 10, inp('near'));
    expect(g).toBeCloseTo(1, 5);
    // 웅크린 mid 는 서 있을 때의 절반 속도
    expect(updateGauge(0, 0.5, inp('mid', true))).toBeCloseTo(0.5 / TUNING.fillTime.mid.crouch, 5);
    // 클램프
    expect(updateGauge(0.9, 1, inp('near'))).toBe(1);
  });

  it('U-DET-02 원뿔 밖·숨음 → 초당 0.4 감소, 0 미만 안 됨', () => {
    const decay = TUNING.gaugeDecayPerSec;
    expect(decay).toBe(0.4);
    expect(updateGauge(1, 1, inp('none'))).toBeCloseTo(1 - decay, 5);
    expect(updateGauge(0.8, 0.5, inp('none'))).toBeCloseTo(0.8 - decay * 0.5, 5);
    // 숨으면 near 안에서도 줄어든다
    expect(updateGauge(1, 1, inp('near', false, true))).toBeCloseTo(1 - decay, 5);
    // 0 미만으로 내려가지 않는다
    expect(updateGauge(0.1, 1, inp('none'))).toBe(0);
    expect(updateGauge(0, 5, inp('none'))).toBe(0);
  });
});
