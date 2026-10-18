// U-NOI-* 소음·동전 (04 §3.9, AC-44·47)
import { describe, expect, it } from 'vitest';
import { coinTarget, guardsInRadius } from '../../src/core';
import { TILE, TUNING } from '../../src/config';
import { center, makeGrid, openRoom, withVerticalWall } from './fixtures';

describe('noise', () => {
  it('U-NOI-01 반경 안 경비만 반환', () => {
    const origin = center(10, 10);
    const r = TUNING.coin.noiseTiles; // 5
    const guards = [
      { id: 'g-near', pos: { x: origin.x + 2 * TILE, y: origin.y } },
      { id: 'g-edge-in', pos: { x: origin.x, y: origin.y + (r - 0.1) * TILE } },
      { id: 'g-edge-out', pos: { x: origin.x - (r + 0.1) * TILE, y: origin.y } },
      { id: 'g-diag-out', pos: { x: origin.x + 4 * TILE, y: origin.y + 4 * TILE } }, // 5.66타일
      { id: 'g-far', pos: { x: origin.x + 20 * TILE, y: origin.y } },
    ];
    const ids = guardsInRadius(guards, origin, r).map((g) => g.id);
    expect(ids.sort()).toEqual(['g-edge-in', 'g-near']);
    // 자물쇠 소음 반경(6타일)이면 5.1·5.66타일 경비도 들어온다
    const ids6 = guardsInRadius(guards, origin, TUNING.lockpick.noiseTiles).map((g) => g.id);
    expect(ids6.sort()).toEqual(['g-diag-out', 'g-edge-in', 'g-edge-out', 'g-near']);
    expect(guardsInRadius([], origin, r)).toEqual([]);
  });

  it('U-NOI-02 최대 거리 안이면 조준 지점 그대로, valid', () => {
    const grid = makeGrid(openRoom(30, 11));
    const from = center(2, 5);
    const aim = { x: from.x + 3 * TILE, y: from.y };
    const t = coinTarget(grid, from, aim, TUNING.coin.maxTiles);
    expect(t.valid).toBe(true);
    expect(t.point.x).toBeCloseTo(aim.x, 0);
    expect(t.point.y).toBeCloseTo(aim.y, 0);
  });

  it('U-NOI-02 최대 거리(8타일)로 자르기', () => {
    const grid = makeGrid(openRoom(30, 11));
    const from = center(2, 5);
    const aim = { x: from.x + 12 * TILE, y: from.y };
    const t = coinTarget(grid, from, aim, TUNING.coin.maxTiles);
    expect(t.valid).toBe(true);
    const d = Math.hypot(t.point.x - from.x, t.point.y - from.y);
    expect(d).toBeCloseTo(TUNING.coin.maxTiles * TILE, 0);
    expect(t.point.y).toBeCloseTo(from.y, 0); // 방향 유지
  });

  it('U-NOI-02 벽 너머 → invalid', () => {
    const grid = makeGrid(withVerticalWall(openRoom(30, 11), 5));
    const from = center(2, 5);
    const t = coinTarget(grid, from, center(7, 5), TUNING.coin.maxTiles);
    expect(t.valid).toBe(false);
  });
});
