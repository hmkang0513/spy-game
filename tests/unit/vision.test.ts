// U-VIS-* 시야 판정 (04 §3.2, AC-25·26)
import { describe, expect, it } from 'vitest';
import { castCone, classifyTarget, gridFromMap, hasLineOfSight } from '../../src/core';
import type { ConeParams } from '../../src/types';
import { DEFAULT_CONE, TILE, TUNING } from '../../src/config';
import { center, deg, makeGrid, makeMap, openRoom, polar, withVerticalWall } from './fixtures';

const P: ConeParams = DEFAULT_CONE;
// 경비: 타일 (2,5) 중심, 오른쪽(0 rad)을 본다. 방은 26×11 로 원뿔 끝(7타일)보다 넓다.
const ROOM = openRoom(26, 11);
const OPEN = makeGrid(ROOM);
const O = center(2, 5);
const RIGHT = 0;

describe('vision', () => {
  it('U-VIS-01 각도 밖 / 거리 밖 → none', () => {
    // 정면 2타일은 보인다 (대조군)
    expect(classifyTarget(OPEN, O, RIGHT, P, polar(O, 0, 2))).not.toBe('none');
    // 시야각 70° → 반각 35°. 40° 벗어나면 안 보인다 (위·아래 모두)
    expect(classifyTarget(OPEN, O, RIGHT, P, polar(O, deg(40), 2))).toBe('none');
    expect(classifyTarget(OPEN, O, RIGHT, P, polar(O, deg(-40), 2))).toBe('none');
    // 30° 는 각도 안
    expect(classifyTarget(OPEN, O, RIGHT, P, polar(O, deg(30), 2))).not.toBe('none');
    expect(classifyTarget(OPEN, O, RIGHT, P, polar(O, deg(-30), 2))).not.toBe('none');
    // 등 뒤
    expect(classifyTarget(OPEN, center(10, 5), RIGHT, P, polar(center(10, 5), Math.PI, 2))).toBe('none');
    // 거리 밖 (far 7타일 초과)
    expect(classifyTarget(OPEN, O, RIGHT, P, polar(O, 0, P.farTiles + 0.5))).toBe('none');
  });

  it('U-VIS-01 각도는 시계 방향 양수(화면 y 아래) — 아래를 보는 경비', () => {
    const o = center(10, 2);
    const down = Math.PI / 2;
    expect(classifyTarget(OPEN, o, down, P, polar(o, down, 2))).not.toBe('none');
    // 위쪽(화면 y 감소)은 등 뒤
    expect(classifyTarget(OPEN, center(10, 8), down, P, polar(center(10, 8), -Math.PI / 2, 2))).toBe('none');
  });

  it('U-VIS-02 거리 경계 near/mid/far (2.5/5/7타일)', () => {
    const at = (d: number) => classifyTarget(OPEN, O, RIGHT, P, polar(O, 0, d));
    expect(P.nearTiles).toBe(TUNING.cone.nearTiles);
    expect(at(1)).toBe('near');
    expect(at(P.nearTiles - 0.1)).toBe('near');
    expect(at(P.nearTiles + 0.1)).toBe('mid');
    expect(at(P.midTiles - 0.1)).toBe('mid');
    expect(at(P.midTiles + 0.1)).toBe('far');
    expect(at(P.farTiles - 0.1)).toBe('far');
    expect(at(P.farTiles + 0.1)).toBe('none');
  });

  it('U-VIS-02 주의 상태 far+1 (cautionBonus) 파라미터를 따른다', () => {
    const caution: ConeParams = { ...P, farTiles: P.farTiles + TUNING.cone.cautionBonusTiles };
    const d = P.farTiles + TUNING.cone.cautionBonusTiles / 2;
    expect(classifyTarget(OPEN, O, RIGHT, P, polar(O, 0, d))).toBe('none');
    expect(classifyTarget(OPEN, O, RIGHT, caution, polar(O, 0, d))).toBe('far');
  });

  it('U-VIS-03 벽 뒤 타깃 → none, hasLineOfSight false', () => {
    const walled = makeGrid(withVerticalWall(ROOM, 4));
    const target = center(6, 5); // 4타일 = mid, 사이에 x=4 벽
    expect(hasLineOfSight(OPEN, O, target)).toBe(true);
    expect(classifyTarget(OPEN, O, RIGHT, P, target)).toBe('mid');
    expect(hasLineOfSight(walled, O, target)).toBe(false);
    expect(classifyTarget(walled, O, RIGHT, P, target)).toBe('none');
  });

  it('U-VIS-03 시야만 막는다: 카운터(solid, 비불투명) 너머는 보인다', () => {
    const counter = makeGrid(ROOM.map((r) => r.slice(0, 4) + '=' + r.slice(5)));
    expect(hasLineOfSight(counter, O, center(6, 5))).toBe(true);
  });

  it('U-VIS-03 끝점 타일은 무시한다', () => {
    const walled = makeGrid(withVerticalWall(ROOM, 4));
    // 끝점이 벽 타일 자체여도 그 사이에 다른 벽이 없으면 true
    expect(hasLineOfSight(walled, O, center(4, 5))).toBe(true);
  });

  it('U-VIS-04 castCone 폴리곤 점 수 = rays+2, 첫 점은 origin', () => {
    for (const rays of [8, TUNING.cone.rays]) {
      const poly = castCone(OPEN, O, RIGHT, P, rays);
      expect(poly).toHaveLength(rays + 2);
      expect(poly[0]!.x).toBeCloseTo(O.x, 5);
      expect(poly[0]!.y).toBeCloseTo(O.y, 5);
    }
  });

  it('U-VIS-04 열린 방에서는 far 거리까지, 벽이 있으면 벽에서 잘린다', () => {
    const rays = 16;
    const far = P.farTiles * TILE;
    const open = castCone(OPEN, O, RIGHT, P, rays).slice(1);
    const dist = (p: { x: number; y: number }) => Math.hypot(p.x - O.x, p.y - O.y);
    for (const p of open) expect(dist(p)).toBeLessThanOrEqual(far + 1);
    // 가운데 광선은 far 까지 닿는다
    expect(Math.max(...open.map(dist))).toBeGreaterThanOrEqual(far - 1);

    const wallCol = 5; // 벽 왼쪽 면 x = 160
    const walled = makeGrid(withVerticalWall(ROOM, wallCol));
    const cut = castCone(walled, O, RIGHT, P, rays).slice(1);
    for (const p of cut) expect(p.x).toBeLessThanOrEqual(wallCol * TILE + 1);
    // 정면 광선은 벽 면 근처에서 멈춘다
    expect(Math.max(...cut.map((p) => p.x))).toBeGreaterThanOrEqual(wallCol * TILE - 1);
  });
});

describe('grid 계약 (gridFromMap)', () => {
  it('legend 의 solid/opaque, 범위 밖 = solid&opaque, extraSolid', () => {
    const g = gridFromMap(makeMap(['####', '#.=#', '####']), [{ tx: 1, ty: 1 }]);
    expect(g.width).toBe(4);
    expect(g.height).toBe(3);
    expect(g.isSolid(0, 0)).toBe(true);
    expect(g.isOpaque(0, 0)).toBe(true);
    expect(g.isSolid(2, 1)).toBe(true); // counter
    expect(g.isOpaque(2, 1)).toBe(false);
    expect(g.isSolid(1, 1)).toBe(true); // extraSolid (잠긴 문)
    expect(g.isSolid(-1, 0)).toBe(true);
    expect(g.isOpaque(4, 0)).toBe(true);
    const g2 = gridFromMap(makeMap(['####', '#.=#', '####']));
    expect(g2.isSolid(1, 1)).toBe(false);
  });

  it('v1.1 닫힌 잠긴 문(extraSolid)은 solid & opaque → 시야 차단', () => {
    // 가운데 x=4 가 문(D, 통과·투과 가능)인 복도
    const rows = ['##########', '#...D....#', '##########'];
    const a = center(1, 1);
    const b = center(7, 1);
    const open = gridFromMap(makeMap(rows));
    expect(open.isOpaque(4, 1)).toBe(false);
    expect(hasLineOfSight(open, a, b)).toBe(true);
    const locked = gridFromMap(makeMap(rows), [{ tx: 4, ty: 1 }]);
    expect(locked.isSolid(4, 1)).toBe(true);
    expect(locked.isOpaque(4, 1)).toBe(true);
    expect(hasLineOfSight(locked, a, b)).toBe(false);
    expect(classifyTarget(locked, a, 0, P, b)).toBe('none');
  });
});
