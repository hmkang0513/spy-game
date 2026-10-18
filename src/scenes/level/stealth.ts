// 잠입 감독 — 경비 감지 → 경보 상태 머신 → 경비 행동, 소음, 붙잡힘 판정 (AC-29~36, 44, 48)
import Phaser from 'phaser';
import { TILE, TUNING } from '../../config';
import { AlertMachine, guardsInRadius } from '../../core';
import type { AlertState, Exposure, GuardDef, Vec2 } from '../../types';
import { Guard, type GuardWorld } from '../../entities/Guard';
import { dist } from '../../entities/actor';
import { bus } from '../../state/events';
import { drawNoiseRing } from '../../ui/noiseRing';

/** 경보 진입 직후 붙잡지 않는 시간 (조정값) */
const CATCH_GRACE_SEC = 0.4;

export interface StealthHooks {
  /** 발각 직전에 호출. true 를 돌려주면 경보 대신 다른 처리(검문 대화)를 한다 (AC-40) */
  interceptSpot(guard: Guard): boolean;
  onCaught(guard: Guard): void;
}

export class Stealth {
  readonly alert = new AlertMachine();
  readonly guards: Guard[];
  lastSeen: Vec2 | null = null;
  exposure: Exposure = 'safe';
  private noiseHeard = false;

  constructor(
    private readonly scene: Phaser.Scene,
    defs: GuardDef[],
    alertCount: number,
    private readonly hooks: StealthHooks,
  ) {
    this.guards = defs.map((d) => new Guard(scene, d));
    this.alert.alertCount = alertCount;
  }

  get state(): AlertState {
    return this.alert.state;
  }

  update(dt: number, w: GuardWorld): void {
    let spotted: Guard | null = null;
    let maxGauge = 0;
    let anySees = false;
    for (const g of this.guards) {
      if (g.sense(dt, w)) spotted ??= g;
      maxGauge = Math.max(maxGauge, g.gauge);
      if (w.detect && g.zone !== 'none') {
        anySees = true;
        if (this.alert.state === 'alert' || g.gauge >= TUNING.suspicionThreshold) this.lastSeen = { ...w.player.feet };
      }
    }
    if (spotted) {
      if (this.hooks.interceptSpot(spotted)) spotted = null;
      else this.lastSeen = { ...w.player.feet };
    }

    const prev = this.alert.state;
    const state = this.alert.update(dt, {
      maxGauge,
      spotted: spotted !== null,
      anyGuardSeesPlayer: anySees,
      investigating: this.guards.some((g) => g.mode === 'investigate' || g.mode === 'search'),
      noiseHeard: this.noiseHeard,
    });
    this.noiseHeard = false;
    if (state !== prev) this.onStateChange(prev, state, w);
    if (state === 'alert' && this.lastSeen) for (const g of this.guards) if (g.mode !== 'hold') g.chase(this.lastSeen, w.grid);

    for (const g of this.guards) g.update(dt, w);
    this.updateExposure(w);

    // 붙잡힘: 경보 중 0.75타일 이내 (AC-36). 경보 직후 '!' 연출 동안(0.4초)은 피할 틈을 준다
    if (state === 'alert' && this.alert.timeInState >= CATCH_GRACE_SEC && w.detect && !w.player.hidden) {
      const catcher = this.guards.find((g) => g.mode !== 'hold' && dist(g.pos, w.player.feet) <= TUNING.catchRangeTiles * TILE);
      if (catcher) this.hooks.onCaught(catcher);
    }
  }

  private onStateChange(prev: AlertState, state: AlertState, w: GuardWorld): void {
    bus.emit('alert:changed', { state, prev });
    if (state === 'search' && this.lastSeen) for (const g of this.guards) if (g.mode !== 'hold') g.search(this.lastSeen, w.grid);
    if (state === 'calm' || state === 'caution') for (const g of this.guards) if (g.mode === 'chase') g.returnToRoute(w.grid);
  }

  private updateExposure(w: GuardWorld): void {
    let next: Exposure = 'safe';
    if (w.player.hidden) next = 'hidden';
    else if (w.detect && this.guards.some((g) => g.zone !== 'none' && !(g.zone === 'far' && w.player.crouched))) next = 'exposed';
    if (next !== this.exposure) {
      this.exposure = next;
      bus.emit('exposure:changed', { exposure: next });
    }
  }

  /** 소음: 반경 안 경비가 조사하러 온다 (AC-44, 48) */
  makeNoise(origin: Vec2, radiusTiles: number, w: GuardWorld, lookSec: number = TUNING.coin.investigateSec): Guard[] {
    drawNoiseRing(this.scene, origin, radiusTiles);
    const hit = this.guardsNear(origin, radiusTiles);
    for (const g of hit) g.investigate(origin, w.grid, lookSec);
    if (hit.length > 0) this.noiseHeard = true;
    return hit;
  }

  guardsNear(origin: Vec2, radiusTiles: number): Guard[] {
    return guardsInRadius(
      this.guards.map((g) => ({ id: g.id, pos: g.pos, g })),
      origin,
      radiusTiles,
    ).map((x) => x.g);
  }

  /** 무음 경보·금고 오답 (AC-61) — 플레이어 위치를 바로 안다 */
  forceAlert(playerFeet: Vec2): void {
    const prev = this.alert.state;
    this.lastSeen = { ...playerFeet };
    this.alert.forceAlert();
    if (prev !== this.alert.state) bus.emit('alert:changed', { state: this.alert.state, prev });
  }

  /** 검문 무마 후 주의 상태로 (AC-40). AlertMachine 에 전용 API 가 없어 상태 필드를 직접 바꾼다 */
  setCaution(): void {
    const prev = this.alert.state;
    this.alert.state = 'caution';
    this.alert.timeInState = 0;
    for (const g of this.guards) g.gauge = 0;
    if (prev !== 'caution') bus.emit('alert:changed', { state: 'caution', prev });
  }

  setVisible(v: boolean): void {
    for (const g of this.guards) g.setVisible(v);
  }

  clearHighlights(): void {
    for (const g of this.guards) g.highlighted = false;
  }
}
