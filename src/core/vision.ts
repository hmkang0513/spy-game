// 시야 판정 — LOS, 원뿔 구역 분류, 원뿔 폴리곤 (04_상세설계서 §3.2)
import { TILE } from '../config';
import type { ConeParams, ConeZone, Vec2 } from '../types';
import { worldToTile, type Grid } from './grid';

export type { ConeParams, ConeZone } from '../types';

const EPS = 1e-9;

/**
 * 선분 a→b 가 지나는 타일을 순서대로 방문한다 (DDA, 슈퍼커버).
 * 정확히 모서리를 지날 때는 양옆 두 타일도 방문한다.
 * visit 이 true 를 반환하면 멈추고 그때의 매개변수 t(0..1)를 돌려준다. 끝까지 가면 null.
 */
function traverse(a: Vec2, b: Vec2, visit: (tx: number, ty: number) => boolean): number | null {
  const start = worldToTile(a);
  let { tx, ty } = start;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const tDeltaX = dx !== 0 ? TILE / Math.abs(dx) : Infinity;
  const tDeltaY = dy !== 0 ? TILE / Math.abs(dy) : Infinity;
  let tMaxX = dx > 0 ? ((tx + 1) * TILE - a.x) / dx : dx < 0 ? (tx * TILE - a.x) / dx : Infinity;
  let tMaxY = dy > 0 ? ((ty + 1) * TILE - a.y) / dy : dy < 0 ? (ty * TILE - a.y) / dy : Infinity;

  for (;;) {
    const t = Math.min(tMaxX, tMaxY);
    if (t > 1) return null;
    if (Math.abs(tMaxX - tMaxY) < EPS) {
      // 모서리 통과: 양옆 타일 중 하나라도 막히면 막힌 것으로 본다
      if (visit(tx + stepX, ty) || visit(tx, ty + stepY)) return t;
      tx += stepX;
      ty += stepY;
      tMaxX += tDeltaX;
      tMaxY += tDeltaY;
    } else if (tMaxX < tMaxY) {
      tx += stepX;
      tMaxX += tDeltaX;
    } else {
      ty += stepY;
      tMaxY += tDeltaY;
    }
    if (visit(tx, ty)) return t;
  }
}

/**
 * a 와 b 사이에 시야를 막는(opaque) 타일이 없는지 검사한다.
 * 시작 타일과 끝 타일 자체는 무시한다.
 */
export function hasLineOfSight(grid: Grid, a: Vec2, b: Vec2): boolean {
  const s = worldToTile(a);
  const e = worldToTile(b);
  const hit = traverse(a, b, (tx, ty) => {
    if ((tx === s.tx && ty === s.ty) || (tx === e.tx && ty === e.ty)) return false;
    return grid.isOpaque(tx, ty);
  });
  return hit === null;
}

/** 각도를 -π..π 로 정규화 */
function normalizeAngle(r: number): number {
  const two = Math.PI * 2;
  let v = r % two;
  if (v > Math.PI) v -= two;
  if (v < -Math.PI) v += two;
  return v;
}

/**
 * 경비 원뿔 안에서 대상이 어느 구역에 있는지 판정한다.
 * 거리(타일) 경계는 포함: near ≤ nearTiles < mid ≤ midTiles < far ≤ farTiles.
 * 시야각(fov/2) 밖, LOS 막힘, farTiles 초과 → 'none'.
 */
export function classifyTarget(grid: Grid, origin: Vec2, facingRad: number, p: ConeParams, target: Vec2): ConeZone {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distTiles = Math.hypot(dx, dy) / TILE;
  if (distTiles > p.farTiles) return 'none';
  if (distTiles > 0) {
    const diff = Math.abs(normalizeAngle(Math.atan2(dy, dx) - facingRad));
    const half = (p.fovDeg * Math.PI) / 360;
    if (diff > half + EPS) return 'none';
  }
  if (!hasLineOfSight(grid, origin, target)) return 'none';
  if (distTiles <= p.nearTiles) return 'near';
  if (distTiles <= p.midTiles) return 'mid';
  return 'far';
}

/**
 * 원뿔 폴리곤을 만든다: [origin, 끝점 × (rays+1)] (길이 rays+2).
 * 각 레이는 첫 opaque 타일 경계(시작 타일 제외) 또는 farTiles 에서 잘린다.
 */
export function castCone(grid: Grid, origin: Vec2, facingRad: number, p: ConeParams, rays: number): Vec2[] {
  const n = Math.max(1, Math.floor(rays));
  const half = (p.fovDeg * Math.PI) / 360;
  const maxDist = p.farTiles * TILE;
  const s = worldToTile(origin);
  const points: Vec2[] = [{ x: origin.x, y: origin.y }];

  for (let i = 0; i <= n; i++) {
    const ang = facingRad - half + (2 * half * i) / n;
    const end = { x: origin.x + Math.cos(ang) * maxDist, y: origin.y + Math.sin(ang) * maxDist };
    const t = traverse(origin, end, (tx, ty) => !(tx === s.tx && ty === s.ty) && grid.isOpaque(tx, ty));
    const k = t === null ? 1 : Math.max(0, t);
    points.push({ x: origin.x + (end.x - origin.x) * k, y: origin.y + (end.y - origin.y) * k });
  }
  return points;
}
