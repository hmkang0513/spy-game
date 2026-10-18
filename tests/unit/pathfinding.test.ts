// U-PATH-01 길찾기 (04 §3.7, AC-34)
import { describe, expect, it } from 'vitest';
import { findPath } from '../../src/core';
import type { TilePos } from '../../src/types';
import { makeGrid } from './fixtures';

function expectValidPath(rows: string[], from: TilePos, to: TilePos, path: TilePos[]): void {
  const g = makeGrid(rows);
  let prev = from;
  for (const p of path) {
    expect(Math.abs(p.tx - prev.tx) + Math.abs(p.ty - prev.ty)).toBe(1); // 4방향 한 칸
    expect(g.isSolid(p.tx, p.ty)).toBe(false);
    prev = p;
  }
  expect(path[path.length - 1]).toEqual(to);
}

describe('pathfinding', () => {
  // x=3 벽이 y=1~2 를 막고 y=3 은 뚫려 있다
  const AROUND = ['#######', '#..#..#', '#..#..#', '#.....#', '#######'];
  // x=3 벽이 완전히 막는다
  const BLOCKED = ['#######', '#..#..#', '#..#..#', '#..#..#', '#######'];

  it('U-PATH-01 벽 우회 최단 경로 (from 제외, to 포함)', () => {
    const from = { tx: 1, ty: 1 };
    const to = { tx: 5, ty: 1 };
    const path = findPath(makeGrid(AROUND), from, to);
    expect(path).not.toBeNull();
    // 맨해튼 거리 4 + 아래로 2·위로 2 우회 = 8
    expect(path).toHaveLength(8);
    expect(path![0]).not.toEqual(from);
    expectValidPath(AROUND, from, to, path!);
  });

  it('U-PATH-01 열린 공간에서는 맨해튼 거리와 같다', () => {
    const from = { tx: 1, ty: 3 };
    const to = { tx: 5, ty: 2 };
    const path = findPath(makeGrid(AROUND), from, to)!;
    expect(path).toHaveLength(5);
    expectValidPath(AROUND, from, to, path);
  });

  it('U-PATH-01 막힌 경우 null', () => {
    expect(findPath(makeGrid(BLOCKED), { tx: 1, ty: 1 }, { tx: 5, ty: 1 })).toBeNull();
  });

});
