// 레벨 맵 — ASCII 행으로 타일맵(표시)·충돌 레이어(Arcade)·core Grid(시야·길찾기)를 만든다 (ADR-09)
import Phaser from 'phaser';
import { TILE } from '../../config';
import { gridFromMap } from '../../core';
import type { Grid } from '../../core';
import type { LevelDef, TilePos } from '../../types';

export class LevelWorld {
  grid: Grid;
  readonly map: Phaser.Tilemaps.Tilemap;
  readonly collision: Phaser.Tilemaps.TilemapLayer;
  readonly width: number;
  readonly height: number;
  private readonly collisionIndex: number;
  /** 잠긴 문 id → 타일 (열리기 전에는 막힘) */
  private readonly locked = new Map<string, TilePos>();

  constructor(
    scene: Phaser.Scene,
    private readonly level: LevelDef,
    openedDoors: Set<string>,
  ) {
    const { rows, legend, tileset } = level.map;
    this.height = rows.length;
    this.width = rows[0]?.length ?? 0;
    const frameAt = (ch: string): number => legend[ch]?.frame ?? 0;
    const data = rows.map((r) => [...r].map(frameAt));
    this.map = scene.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const ts = this.map.addTilesetImage(tileset, tileset, TILE, TILE, 0, 0);
    if (!ts) throw new Error(`타일셋 ${tileset} 를 만들 수 없다`);
    this.map.createLayer(0, ts, 0, 0)?.setDepth(0);

    // 장식(deco) 레이어 — legend 에 deco 가 있는 문자만
    if (Object.values(legend).some((e) => e.deco !== undefined)) {
      const deco = this.map.createBlankLayer('deco', ts, 0, 0, this.width, this.height);
      rows.forEach((r, ty) => [...r].forEach((ch, tx) => {
        const d = legend[ch]?.deco;
        if (d !== undefined) deco?.putTileAt(d, tx, ty);
      }));
      deco?.setDepth(1);
    }

    // 보이지 않는 충돌 레이어
    const layer = this.map.createBlankLayer('collision', ts, 0, 0, this.width, this.height);
    if (!layer) throw new Error('충돌 레이어를 만들 수 없다');
    this.collision = layer.setVisible(false);
    this.collisionIndex = Object.values(legend).find((e) => e.solid)?.frame ?? 0;

    for (const it of level.interactables) {
      if (it.kind === 'lockedDoor' && !openedDoors.has(it.id)) this.locked.set(it.id, it.pos);
    }
    this.grid = this.buildGrid();
    for (let ty = 0; ty < this.height; ty++) {
      for (let tx = 0; tx < this.width; tx++) if (this.grid.isSolid(tx, ty)) layer.putTileAt(this.collisionIndex, tx, ty);
    }
    layer.setCollision(this.collisionIndex);
  }

  get widthPx(): number {
    return this.width * TILE;
  }

  get heightPx(): number {
    return this.height * TILE;
  }

  private buildGrid(): Grid {
    // 출구는 닫힌 문처럼 막아 둔다 — 걸어서 지나갈 수 없고 E 로만 나간다
    const exits = this.level.interactables.filter((it) => it.kind === 'exit').map((it) => it.pos);
    return gridFromMap(this.level.map, [...this.locked.values(), ...exits]);
  }

  /** 잠긴 문을 연다 — 충돌·시야·길찾기에서 빠진다 */
  openDoor(id: string): void {
    const pos = this.locked.get(id);
    if (!pos) return;
    this.locked.delete(id);
    this.grid = this.buildGrid();
    if (!this.grid.isSolid(pos.tx, pos.ty)) this.collision.removeTileAt(pos.tx, pos.ty);
  }

  /** 가장 가까운 이동 가능 타일 (BFS) */
  nearestWalkable(t: TilePos): TilePos {
    const seen = new Set<string>();
    const queue: TilePos[] = [t];
    while (queue.length) {
      const c = queue.shift()!;
      const k = `${c.tx},${c.ty}`;
      if (seen.has(k) || c.tx < 0 || c.ty < 0 || c.tx >= this.width || c.ty >= this.height) continue;
      seen.add(k);
      if (!this.grid.isSolid(c.tx, c.ty)) return c;
      queue.push({ tx: c.tx + 1, ty: c.ty }, { tx: c.tx - 1, ty: c.ty }, { tx: c.tx, ty: c.ty + 1 }, { tx: c.tx, ty: c.ty - 1 });
    }
    return t;
  }
}
