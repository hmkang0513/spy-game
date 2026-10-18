// 소음 반경·동전 착지 지점 (04_상세설계서 §3.9, AC-44·47)
import { TILE } from '../config';
import type { Vec2 } from '../types';
import { worldToTile, type Grid } from './grid';
import { hasLineOfSight } from './vision';

/** origin 에서 radiusTiles 이내(경계 포함)에 있는 경비만 반환한다 */
export function guardsInRadius<T extends { id: string; pos: Vec2 }>(
  guards: T[],
  origin: Vec2,
  radiusTiles: number,
): T[] {
  const r = radiusTiles * TILE;
  return guards.filter((g) => Math.hypot(g.pos.x - origin.x, g.pos.y - origin.y) <= r);
}

/**
 * 동전 착지 지점. aim 까지의 거리를 maxTiles 로 자른다.
 * from → 착지점 LOS 가 막히거나 착지 타일이 solid·opaque(벽·가구·닫힌 문 등)이면 valid=false.
 */
export function coinTarget(grid: Grid, from: Vec2, aim: Vec2, maxTiles: number): { point: Vec2; valid: boolean } {
  const dx = aim.x - from.x;
  const dy = aim.y - from.y;
  const dist = Math.hypot(dx, dy);
  const max = maxTiles * TILE;
  const k = dist > max ? max / dist : 1;
  const point = { x: from.x + dx * k, y: from.y + dy * k };
  const t = worldToTile(point);
  const valid = hasLineOfSight(grid, from, point) && !grid.isSolid(t.tx, t.ty) && !grid.isOpaque(t.tx, t.ty);
  return { point, valid };
}
