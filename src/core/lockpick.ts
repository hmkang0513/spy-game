// 자물쇠 따기 미니게임 (04_상세설계서 §3.8, AC-42~45)
import { TUNING } from '../config';

export interface LockpickOptions {
  pins: number;
  periodSec?: number;
  zoneRatio?: number;
  rng?: () => number;
}

export class LockpickGame {
  readonly pins: number;
  pinsSet = 0;
  /** 표시기 위치 0..1 */
  cursor = 0;
  /** 성공 구간 시작 0..1-zoneRatio */
  zoneStart = 0;
  zoneRatio: number;

  private readonly periodSec: number;
  private readonly rng: () => number;
  private elapsed = 0;

  constructor(opts: LockpickOptions) {
    this.pins = Math.max(1, Math.floor(opts.pins));
    this.periodSec = opts.periodSec ?? TUNING.lockpick.periodSec;
    this.zoneRatio = opts.zoneRatio ?? TUNING.lockpick.zoneRatio;
    this.rng = opts.rng ?? Math.random;
    this.placeZone();
  }

  /** 표시기를 삼각파로 왕복시킨다 (0 → 1 → 0 이 periodSec 한 주기) */
  update(dt: number): void {
    this.elapsed = (this.elapsed + dt) % this.periodSec;
    const phase = this.elapsed / this.periodSec;
    this.cursor = phase < 0.5 ? phase * 2 : 2 - phase * 2;
  }

  /** 핀 맞추기. 구간 안 → 'hit'(마지막 핀이면 'done'), 구간 밖 → 'miss'(진행 초기화) */
  press(): 'hit' | 'miss' | 'done' {
    if (this.pinsSet >= this.pins) return 'done';
    const hit = this.cursor >= this.zoneStart && this.cursor <= this.zoneStart + this.zoneRatio;
    if (!hit) {
      this.pinsSet = 0;
      this.placeZone();
      return 'miss';
    }
    this.pinsSet += 1;
    if (this.pinsSet === this.pins) return 'done';
    this.placeZone();
    return 'hit';
  }

  private placeZone(): void {
    const r = Math.min(Math.max(this.rng(), 0), 1);
    this.zoneStart = r * Math.max(0, 1 - this.zoneRatio);
  }
}
