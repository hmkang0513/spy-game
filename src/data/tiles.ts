// 타일셋 프레임 표 — 에셋 담당이 실제 타일셋에 맞게 프레임 번호를 채운다.
// 레벨 데이터는 buildLegend() 만 사용한다 (04_상세설계서 §8).
import { TILE_CHARS, TILE_TRAITS } from '../types';
import type { TileLegendEntry, TileName } from '../types';

export type TilesetKey = 'tiles_l1' | 'tiles_l2' | 'tiles_l3';

const TILE_ORDER: TileName[] = [
  'void', 'wall', 'wallWindow', 'floorWood', 'floorTile', 'floorConcrete', 'carpet', 'grass', 'dock', 'water',
  'door', 'counter', 'table', 'chair', 'shelf', 'plant', 'hedge', 'crate', 'machine', 'locker', 'desk', 'safe', 'elevator',
];

/**
 * 프레임 번호: tools/build-tiles.mjs 가 세 타일셋 모두 TILE_ORDER 순서(8열 격자)로 프레임을 배치한다.
 * 타일셋 그림을 바꿔도 이 순서를 지키면 번호는 그대로다.
 */
const ORDERED_FRAMES = Object.fromEntries(TILE_ORDER.map((n, i) => [n, i])) as Record<TileName, number>;

export const TILE_FRAMES: Record<TilesetKey, Record<TileName, number>> = {
  tiles_l1: { ...ORDERED_FRAMES },
  tiles_l2: { ...ORDERED_FRAMES },
  tiles_l3: { ...ORDERED_FRAMES },
};

/** ASCII 문자 → 프레임·충돌·시야 */
export function buildLegend(tileset: TilesetKey): Record<string, TileLegendEntry> {
  const frames = TILE_FRAMES[tileset];
  const legend: Record<string, TileLegendEntry> = {};
  for (const [ch, name] of Object.entries(TILE_CHARS)) {
    legend[ch] = { frame: frames[name], ...TILE_TRAITS[name] };
  }
  return legend;
}
