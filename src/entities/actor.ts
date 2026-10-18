// 캐릭터 스프라이트 공통 도우미 — 시트 규격(04 §2.5): 4행(up,left,down,right) × 9열, 열 0 = 정지
import Phaser from 'phaser';
import { TILE } from '../config';
import { SHEET_COLS, SHEET_ROWS } from '../types';
import type { Facing, TilePos, Vec2 } from '../types';

/** 프레임 안에서 발이 닿는 y (64px 프레임 기준) */
const FEET_IN_FRAME = 62;
/** 충돌 박스(20×12) 중심에서 발바닥까지 */
export const FEET_BELOW_CENTER = 6;
/** 캐릭터 깊이 기준값 (타일·원뿔보다 위) */
export const ACTOR_DEPTH = 100;

export function idleFrame(facing: Facing): number {
  return SHEET_ROWS.indexOf(facing) * SHEET_COLS;
}

export function walkAnim(charId: string, facing: Facing): string {
  return `${charId}:walk:${facing}`;
}

/** 이동 벡터 → 4방향 */
export function facingFromVector(dx: number, dy: number, current: Facing): Facing {
  if (dx === 0 && dy === 0) return current;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  if (Math.abs(dy) > Math.abs(dx)) return dy > 0 ? 'down' : 'up';
  // 대각선은 지금 방향이 성분 중 하나면 유지
  const h: Facing = dx > 0 ? 'right' : 'left';
  const v: Facing = dy > 0 ? 'down' : 'up';
  return current === h || current === v ? current : h;
}

/** 각도(라디안, 0 = 오른쪽, 시계 방향) → 4방향 */
export function facingFromAngle(rad: number): Facing {
  return facingFromVector(Math.cos(rad), Math.sin(rad), 'down');
}

export function facingToAngle(f: Facing): number {
  return { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[f];
}

export function tileToFeet(t: TilePos): Vec2 {
  return { x: t.tx * TILE + TILE / 2, y: t.ty * TILE + TILE / 2 };
}

/** 발 좌표에 맞춰 놓이는 캐릭터 스프라이트 */
export function makeActorSprite(scene: Phaser.Scene, charId: string, feet: Vec2, facing: Facing): Phaser.GameObjects.Sprite {
  const s = scene.add.sprite(0, 0, charId, idleFrame(facing));
  s.setOrigin(0.5, FEET_IN_FRAME / 64);
  placeActor(s, feet);
  return s;
}

export function placeActor(s: Phaser.GameObjects.Sprite, feet: Vec2): void {
  s.setPosition(Math.round(feet.x), Math.round(feet.y + FEET_BELOW_CENTER));
  s.setDepth(ACTOR_DEPTH + feet.y);
}

/** 걷기/정지 애니메이션 */
export function animate(s: Phaser.GameObjects.Sprite, charId: string, facing: Facing, moving: boolean): void {
  if (moving) s.anims.play(walkAnim(charId, facing), true);
  else {
    s.anims.stop();
    s.setFrame(idleFrame(facing));
  }
}

/** 두 각도 사이 최단 회전 */
export function turnToward(current: number, target: number, maxStep: number): number {
  let d = Phaser.Math.Angle.Wrap(target - current);
  if (Math.abs(d) <= maxStep) return target;
  d = Math.sign(d) * maxStep;
  return Phaser.Math.Angle.Wrap(current + d);
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
