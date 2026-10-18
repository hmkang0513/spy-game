// 4방향 A* 길찾기 (04_상세설계서 §3.7, AC-34)
import type { TilePos } from '../types';
import type { Grid } from './grid';

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * from → to 최단 경로 (4방향, 맨해튼 휴리스틱).
 * 결과는 from 제외, to 포함. from === to 면 []. 갈 수 없거나 maxNodes 만큼 확장해도 못 찾으면 null.
 */
export function findPath(grid: Grid, from: TilePos, to: TilePos, maxNodes = 4000): TilePos[] | null {
  if (from.tx === to.tx && from.ty === to.ty) return [];
  if (grid.isSolid(to.tx, to.ty)) return null;

  const key = (tx: number, ty: number): number => ty * grid.width + tx;
  const h = (tx: number, ty: number): number => Math.abs(tx - to.tx) + Math.abs(ty - to.ty);

  const g = new Map<number, number>([[key(from.tx, from.ty), 0]]);
  const parent = new Map<number, number>();
  const closed = new Set<number>();
  // 열린 목록: 작은 맵이므로 선형 탐색으로 충분하다
  const open: { tx: number; ty: number; f: number; h: number }[] = [
    { tx: from.tx, ty: from.ty, f: h(from.tx, from.ty), h: h(from.tx, from.ty) },
  ];
  let expanded = 0;

  while (open.length > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      const o = open[i]!;
      const b = open[best]!;
      if (o.f < b.f || (o.f === b.f && o.h < b.h)) best = i;
    }
    const cur = open.splice(best, 1)[0]!;
    const ck = key(cur.tx, cur.ty);
    if (closed.has(ck)) continue;
    closed.add(ck);

    if (cur.tx === to.tx && cur.ty === to.ty) return rebuild(parent, ck, key(from.tx, from.ty), grid.width);
    if (++expanded > maxNodes) return null;

    const cg = g.get(ck) ?? 0;
    for (const [dx, dy] of DIRS) {
      const nx = cur.tx + dx;
      const ny = cur.ty + dy;
      if (grid.isSolid(nx, ny)) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const ng = cg + 1;
      if (ng >= (g.get(nk) ?? Infinity)) continue;
      g.set(nk, ng);
      parent.set(nk, ck);
      const nh = h(nx, ny);
      open.push({ tx: nx, ty: ny, f: ng + nh, h: nh });
    }
  }
  return null;
}

function rebuild(parent: Map<number, number>, end: number, start: number, width: number): TilePos[] {
  const path: TilePos[] = [];
  let k: number | undefined = end;
  while (k !== undefined && k !== start) {
    path.push({ tx: k % width, ty: Math.floor(k / width) });
    k = parent.get(k);
  }
  return path.reverse();
}
