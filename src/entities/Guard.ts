// 경비 — 정지/회전/순찰, 시야 원뿔, 감지 게이지, 조사·추적·수색·복귀 (AC-25~36)
import Phaser from 'phaser';
import { DEFAULT_CONE, TILE, TUNING } from '../config';
import { castCone, classifyTarget, findPath, tileCenter, updateGauge, worldToTile } from '../core';
import type { Grid } from '../core';
import type { AlertState, ConeParams, ConeZone, GuardDef, TilePos, Vec2 } from '../types';
import { AlertIcon, type IconKind } from '../ui/alertIcon';
import { drawCone, type ConeLook } from '../ui/visionCone';
import { animate, dist, facingFromAngle, makeActorSprite, placeActor, tileToFeet, turnToward } from './actor';

export type GuardMode = 'route' | 'investigate' | 'chase' | 'search' | 'return' | 'hold';

/** 경비가 매 프레임 참고하는 바깥 상태 */
export interface GuardWorld {
  grid: Grid;
  alert: AlertState;
  player: { feet: Vec2; crouched: boolean; hidden: boolean };
  /** false 면 원뿔만 보이고 감지 없음 (L1, 대화 중) */
  detect: boolean;
  highContrast: boolean;
  /** 하품(눈 감음) 빈틈을 원뿔로 보여 줄지 — 근무표 단서(C3-05)를 얻은 뒤에만 */
  showBlink: boolean;
}

const PATROL_SPEED = 64; // px/s (조정값)
const TURN_RATE = 5; // rad/s
const LOOK_AROUND_SEC = 2.5;

export class Guard {
  readonly def: GuardDef;
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly cone: Phaser.GameObjects.Graphics;
  private readonly icon: AlertIcon;
  pos: Vec2;
  facingRad: number;
  gauge = 0;
  zone: ConeZone = 'none';
  mode: GuardMode = 'route';
  /** 동전 조준 미리보기에서 반응 대상으로 강조 */
  highlighted = false;
  private highlightG: Phaser.GameObjects.Graphics;
  private path: TilePos[] = [];
  private targetAngle: number;
  private waitTimer = 0;
  private waypointIdx = 0;
  private rotateIdx = 0;
  private lookTimer = 0;
  private lookBase: number | null = null;
  private searchPoints: Vec2[] = [];
  private chaseGoal: Vec2 | null = null;
  private blinkTimer = 0;
  eyesClosed = false;
  private flashTimer = 0;

  constructor(scene: Phaser.Scene, def: GuardDef) {
    this.def = def;
    this.pos = tileToFeet(def.pos);
    this.facingRad = Phaser.Math.DegToRad(def.facingDeg);
    this.targetAngle = this.facingRad;
    this.cone = scene.add.graphics().setDepth(10);
    this.highlightG = scene.add.graphics().setDepth(11);
    this.sprite = makeActorSprite(scene, def.character, this.pos, facingFromAngle(this.facingRad));
    this.icon = new AlertIcon(scene);
  }

  get tile(): TilePos {
    return worldToTile(this.pos);
  }

  get id(): string {
    return this.def.id;
  }

  setVisible(v: boolean): void {
    this.sprite.setVisible(v);
    this.cone.setVisible(v);
    this.icon.container.setVisible(v);
    this.highlightG.setVisible(v);
  }

  coneParams(alert: AlertState): ConeParams {
    return alert === 'caution' ? { ...DEFAULT_CONE, farTiles: DEFAULT_CONE.farTiles + TUNING.cone.cautionBonusTiles } : DEFAULT_CONE;
  }

  /**
   * 감지 판정. 이번 프레임에 게이지가 100%에 닿았으면 true (발각).
   * 숨은 플레이어는 게이지가 0 으로 고정된다 (AC-38).
   */
  sense(dt: number, w: GuardWorld): boolean {
    this.updateBlink(dt);
    const p = this.coneParams(w.alert);
    const raw = this.eyesClosed ? 'none' : classifyTarget(w.grid, this.pos, this.facingRad, p, w.player.feet);
    this.zone = w.player.hidden ? 'none' : raw;
    if (!w.detect) {
      this.gauge = 0;
      return false;
    }
    const before = this.gauge;
    this.gauge = w.player.hidden ? 0 : updateGauge(this.gauge, dt, { zone: this.zone, crouched: w.player.crouched, hidden: false });
    this.flashTimer = this.gauge > before ? this.flashTimer + dt : 0;
    // 의심: 플레이어 쪽으로 돌아 그 위치를 조사 (AC-29)
    if (this.gauge >= TUNING.suspicionThreshold && (this.mode === 'route' || this.mode === 'return')) {
      this.investigate(w.player.feet, w.grid, 1.5);
    }
    return before < 1 && this.gauge >= 1;
  }

  /** 근거리에서 플레이어를 직접 보고 있는지 (숨는 장면 목격, AC-39) */
  seesNear(w: GuardWorld, target: Vec2): boolean {
    if (this.eyesClosed) return false;
    return classifyTarget(w.grid, this.pos, this.facingRad, this.coneParams(w.alert), target) === 'near';
  }

  // ── 행동 명령 ──
  /** 소음·의심 위치 조사 (AC-29, 44, 48) */
  investigate(point: Vec2, grid: Grid, lookSec: number = TUNING.coin.investigateSec): void {
    if (this.mode === 'chase' || this.mode === 'hold') return;
    this.mode = 'investigate';
    this.lookTimer = lookSec;
    this.targetAngle = Math.atan2(point.y - this.pos.y, point.x - this.pos.x);
    this.pathTo(point, grid);
  }

  /** 경보: 마지막 목격 위치로 추적 (AC-34) */
  chase(goal: Vec2, grid: Grid): void {
    this.mode = 'chase';
    if (!this.chaseGoal || dist(goal, this.chaseGoal) > TILE) {
      this.chaseGoal = goal;
      this.pathTo(goal, grid);
    }
  }

  /** 수색: 목격 위치 주변 무작위 지점 순회 (AC-34) */
  search(center: Vec2, grid: Grid): void {
    this.mode = 'search';
    this.chaseGoal = null;
    this.searchPoints = pickSearchPoints(center, grid);
    this.nextSearchPoint(grid);
  }

  /** 원래 위치·경로로 복귀 */
  returnToRoute(grid: Grid): void {
    if (this.mode === 'route') return;
    this.mode = 'return';
    this.chaseGoal = null;
    this.pathTo(this.routeAnchor(), grid);
  }

  /** 검문 대화 중 정지 */
  hold(on: boolean, grid: Grid): void {
    if (on) {
      this.mode = 'hold';
      this.path = [];
    } else if (this.mode === 'hold') {
      this.mode = 'investigate';
      this.returnToRoute(grid);
    }
  }

  /** 체크포인트 복귀: 처음 위치로 */
  resetToStart(): void {
    this.pos = tileToFeet(this.def.pos);
    this.facingRad = this.targetAngle = Phaser.Math.DegToRad(this.def.facingDeg);
    this.mode = 'route';
    this.path = [];
    this.gauge = 0;
    this.waypointIdx = 0;
    this.rotateIdx = 0;
    this.waitTimer = 0;
  }

  // ── 매 프레임 이동 ──
  update(dt: number, w: GuardWorld): void {
    const speed = PATROL_SPEED * (w.alert === 'alert' && this.mode === 'chase' ? TUNING.alert.alertSpeedMul : 1);
    const moving = this.path.length > 0 && this.mode !== 'hold';
    if (moving) this.followPath(dt, speed);
    else this.idleBehaviour(dt, w.grid);
    this.facingRad = turnToward(this.facingRad, this.targetAngle, TURN_RATE * dt);
    animate(this.sprite, this.def.character, facingFromAngle(this.facingRad), moving);
    placeActor(this.sprite, this.pos);
    this.render(w);
  }

  private followPath(dt: number, speed: number): void {
    const next = this.path[0];
    if (!next) return;
    const goal = tileCenter(next);
    const d = dist(this.pos, goal);
    const step = speed * dt;
    this.targetAngle = Math.atan2(goal.y - this.pos.y, goal.x - this.pos.x);
    if (d <= step) {
      this.pos = goal;
      this.path.shift();
    } else {
      this.pos = { x: this.pos.x + ((goal.x - this.pos.x) / d) * step, y: this.pos.y + ((goal.y - this.pos.y) / d) * step };
    }
  }

  private idleBehaviour(dt: number, grid: Grid): void {
    switch (this.mode) {
      case 'route':
        this.routeStep(dt, grid);
        break;
      case 'investigate':
        if (this.lookAround(dt)) this.returnToRoute(grid);
        break;
      case 'search':
        if (this.lookAround(dt)) this.nextSearchPoint(grid);
        break;
      case 'chase':
        this.lookAround(dt);
        break;
      case 'return':
        this.mode = 'route';
        this.waitTimer = 0;
        break;
      case 'hold':
        break;
    }
  }

  /** 제자리에서 좌우를 둘러본다. 끝나면 true */
  private lookAround(dt: number): boolean {
    if (this.lookTimer <= 0) return true;
    this.lookBase ??= this.facingRad;
    this.lookTimer -= dt;
    this.targetAngle = this.lookBase + Math.sin(this.lookTimer * 2.5) * 0.9;
    if (this.lookTimer <= 0) {
      this.lookBase = null;
      return true;
    }
    return false;
  }

  private routeStep(dt: number, grid: Grid): void {
    const { patrol, rotate } = this.def;
    if (this.def.kind === 'patrol' && patrol && patrol.waypoints.length > 0) {
      this.waitTimer -= dt;
      if (this.waitTimer > 0) return;
      const wp = patrol.waypoints[this.waypointIdx % patrol.waypoints.length]!;
      const here = this.tile;
      if (here.tx === wp.tx && here.ty === wp.ty) {
        this.waypointIdx = (this.waypointIdx + 1) % patrol.waypoints.length;
        this.waitTimer = patrol.waitSec;
        return;
      }
      this.pathTo(tileCenter(wp), grid);
      // 갈 수 없는 웨이포인트는 건너뛴다
      if (this.path.length === 0) this.waypointIdx = (this.waypointIdx + 1) % patrol.waypoints.length;
      return;
    }
    if (rotate && rotate.anglesDeg.length > 0) {
      this.waitTimer -= dt;
      if (this.waitTimer <= 0) {
        this.targetAngle = Phaser.Math.DegToRad(rotate.anglesDeg[this.rotateIdx % rotate.anglesDeg.length]!);
        this.rotateIdx = (this.rotateIdx + 1) % rotate.anglesDeg.length;
        this.waitTimer = rotate.holdSec;
      }
      return;
    }
    this.targetAngle = Phaser.Math.DegToRad(this.def.facingDeg);
  }

  private routeAnchor(): Vec2 {
    const wps = this.def.patrol?.waypoints;
    if (this.def.kind === 'patrol' && wps && wps.length > 0) return tileCenter(wps[this.waypointIdx % wps.length]!);
    return tileToFeet(this.def.pos);
  }

  private nextSearchPoint(grid: Grid): void {
    const p = this.searchPoints.shift();
    if (!p) {
      this.returnToRoute(grid);
      return;
    }
    this.lookTimer = LOOK_AROUND_SEC;
    this.pathTo(p, grid);
  }

  private pathTo(point: Vec2, grid: Grid): void {
    const path = findPath(grid, this.tile, worldToTile(point));
    this.path = path ?? [];
  }

  /** L3 브루노 하품: everySec 마다 closedSec 동안 눈을 감음 (C3-05) */
  private updateBlink(dt: number): void {
    const b = this.def.blink;
    if (!b) return;
    this.blinkTimer = (this.blinkTimer + dt) % b.everySec;
    this.eyesClosed = this.blinkTimer >= b.everySec - b.closedSec;
  }

  // ── 표시 ──
  private render(w: GuardWorld): void {
    this.cone.clear();
    if (!(this.eyesClosed && w.showBlink)) {
      const p = this.coneParams(w.alert);
      const poly = castCone(w.grid, this.pos, this.facingRad, p, TUNING.cone.rays);
      drawCone(this.cone, poly, {
        look: this.coneLook(w.alert),
        nearTiles: p.nearTiles,
        midTiles: p.midTiles,
        flash: this.flashTimer > 0 && Math.floor(this.flashTimer * 8) % 2 === 0,
        highContrast: w.highContrast,
      });
    }
    this.icon.setPosition(this.pos.x, this.pos.y - 62);
    this.icon.update(this.iconKind(w.alert), w.detect ? this.gauge : 0);
    this.highlightG.clear();
    if (this.highlighted) {
      this.highlightG.lineStyle(1, 0xe69f00, 1).strokeEllipse(this.pos.x, this.pos.y + 2, 30, 14);
    }
  }

  private coneLook(alert: AlertState): ConeLook {
    if (alert === 'alert' && this.mode === 'chase') return 'alert';
    if (this.gauge >= TUNING.suspicionThreshold || this.mode === 'investigate' || alert === 'search') return 'suspicious';
    return 'base';
  }

  private iconKind(alert: AlertState): IconKind {
    if (alert === 'alert' && this.mode === 'chase') return 'alert';
    if (this.mode === 'search') return 'search';
    if (this.gauge >= TUNING.suspicionThreshold || this.mode === 'investigate' || this.highlighted) return 'question';
    if (alert === 'caution') return 'caution';
    return 'none';
  }

  destroy(): void {
    this.sprite.destroy();
    this.cone.destroy();
    this.icon.destroy();
    this.highlightG.destroy();
  }
}

/** 중심 반경 radiusTiles 안의 이동 가능 타일 중 무작위 points 곳 */
function pickSearchPoints(center: Vec2, grid: Grid): Vec2[] {
  const c = worldToTile(center);
  const r = TUNING.search.radiusTiles;
  const out: Vec2[] = [];
  for (let tries = 0; tries < 60 && out.length < TUNING.search.points; tries++) {
    const t = { tx: c.tx + Math.round((Math.random() * 2 - 1) * r), ty: c.ty + Math.round((Math.random() * 2 - 1) * r) };
    if (!grid.isSolid(t.tx, t.ty) && Math.hypot(t.tx - c.tx, t.ty - c.ty) <= r) out.push(tileCenter(t));
  }
  return out;
}
