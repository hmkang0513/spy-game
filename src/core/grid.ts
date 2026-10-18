// 타일 그리드 — 충돌·시야 판정의 기반 (04_상세설계서 §3.1)
import { TILE } from '../config';
import type { MapDef, TilePos, Vec2 } from '../types';

export interface Grid {
  width: number;
  height: number;
  isSolid(tx: number, ty: number): boolean;
  isOpaque(tx: number, ty: number): boolean;
}

/**
 * MapDef 의 ASCII 행과 legend 로 그리드를 만든다.
 * 범위 밖·legend 에 없는 문자는 solid & opaque 로 취급한다.
 * @param extraSolid 추가로 막을 타일 (예: 아직 열리지 않은 잠긴 문). 이동과 시야를 모두 막는다.
 */
export function gridFromMap(map: MapDef, extraSolid: TilePos[] = []): Grid {
  const height = map.rows.length;
  const width = height > 0 ? Math.max(...map.rows.map((r) => r.length)) : 0;
  const solid = new Uint8Array(width * height);
  const opaque = new Uint8Array(width * height);

  for (let ty = 0; ty < height; ty++) {
    const row = map.rows[ty] ?? '';
    for (let tx = 0; tx < width; tx++) {
      const ch = row[tx];
      const entry = ch === undefined ? undefined : map.legend[ch];
      const i = ty * width + tx;
      solid[i] = entry ? Number(entry.solid) : 1;
      opaque[i] = entry ? Number(entry.opaque) : 1;
    }
  }
  for (const t of extraSolid) {
    if (inBounds(t.tx, t.ty)) {
      solid[t.ty * width + t.tx] = 1;
      opaque[t.ty * width + t.tx] = 1;
    }
  }

  function inBounds(tx: number, ty: number): boolean {
    return Number.isInteger(tx) && Number.isInteger(ty) && tx >= 0 && ty >= 0 && tx < width && ty < height;
  }

  return {
    width,
    height,
    isSolid: (tx, ty) => !inBounds(tx, ty) || solid[ty * width + tx] === 1,
    isOpaque: (tx, ty) => !inBounds(tx, ty) || opaque[ty * width + tx] === 1,
  };
}

/** 월드 픽셀 좌표 → 타일 좌표 */
export function worldToTile(p: Vec2): TilePos {
  return { tx: Math.floor(p.x / TILE), ty: Math.floor(p.y / TILE) };
}

/** 타일 중심의 월드 픽셀 좌표 (tx*32+16) */
export function tileCenter(t: TilePos): Vec2 {
  return { x: t.tx * TILE + TILE / 2, y: t.ty * TILE + TILE / 2 };
}
