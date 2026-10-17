// 좌표·방향 공통 타입 (04_상세설계서 §1)
export interface Vec2 {
  x: number;
  y: number;
}

/** 타일 좌표 (정수, 맵 좌상단이 0,0) */
export interface TilePos {
  tx: number;
  ty: number;
}

export interface TileRect {
  tx: number;
  ty: number;
  w: number;
  h: number;
}

/** 스프라이트 방향 */
export type Facing = 'up' | 'down' | 'left' | 'right';
