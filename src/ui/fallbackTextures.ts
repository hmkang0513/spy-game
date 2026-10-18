// 에셋 파일이 없을 때 쓰는 대체 텍스처 — 게임이 멈추지 않게 런타임에 그린다
import Phaser from 'phaser';
import { SHEET_COLS, SHEET_FRAME, SHEET_ROWS } from '../types';
import type { TileName } from '../types';
import { TILE_FRAMES, type TilesetKey } from '../data/tiles';

function addGridFrames(tex: Phaser.Textures.CanvasTexture, cols: number, rows: number, size: number): void {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) tex.add(r * cols + c, 0, c * size, r * size, size, size);
}

/** 캐릭터 시트 대체: 4방향 × 9프레임, 몸통은 시그니처 색 */
export function makeCharacterFallback(scene: Phaser.Scene, key: string, color: string): void {
  const F = SHEET_FRAME;
  const tex = scene.textures.createCanvas(key, F * SHEET_COLS, F * SHEET_ROWS.length);
  if (!tex) return;
  const ctx = tex.getContext();
  SHEET_ROWS.forEach((dir, r) => {
    for (let c = 0; c < SHEET_COLS; c++) {
      const ox = c * F;
      const oy = r * F;
      const step = c === 0 ? 0 : (c % 2 === 0 ? 1 : -1) * 2;
      // 다리
      ctx.fillStyle = '#2A2335';
      ctx.fillRect(ox + 25, oy + 48 + Math.max(0, step), 5, 12 - Math.max(0, step));
      ctx.fillRect(ox + 34, oy + 48 + Math.max(0, -step), 5, 12 - Math.max(0, -step));
      // 몸통
      ctx.fillStyle = color;
      ctx.fillRect(ox + 22, oy + 30, 20, 20);
      // 머리
      ctx.fillStyle = '#E8C39E';
      ctx.fillRect(ox + 24, oy + 14, 16, 16);
      ctx.fillStyle = '#3A2A20';
      ctx.fillRect(ox + 24, oy + 12, 16, 5);
      // 시선 방향 표시
      ctx.fillStyle = '#0E1024';
      if (dir === 'down') ctx.fillRect(ox + 27, oy + 21, 10, 2);
      if (dir === 'left') ctx.fillRect(ox + 25, oy + 21, 3, 2);
      if (dir === 'right') ctx.fillRect(ox + 36, oy + 21, 3, 2);
    }
  });
  tex.refresh();
  addGridFrames(tex, SHEET_COLS, SHEET_ROWS.length, F);
}

const TILE_COLOR: Record<TileName, string> = {
  void: '#0E1024', wall: '#4A4466', wallWindow: '#5C6F9A', floorWood: '#8A6440', floorTile: '#B8B2A0',
  floorConcrete: '#6E6E72', carpet: '#7A2E3A', grass: '#4E7A3A', dock: '#9A7A50', water: '#2C5A8A',
  door: '#B08A50', counter: '#5A3A28', table: '#6A4A30', chair: '#8A6A44', shelf: '#4A3020', plant: '#2E6A3A',
  hedge: '#2E5A2A', crate: '#9A7040', machine: '#5A6A7A', locker: '#4A5A6A', desk: '#5A4030', safe: '#3A3A44',
  elevator: '#7A7A60',
};
const SOLID_DETAIL = new Set<TileName>(['counter', 'table', 'shelf', 'plant', 'hedge', 'crate', 'machine', 'locker', 'desk', 'safe']);

/** 타일셋 대체: TILE_FRAMES 의 프레임 번호 위치에 단색 타일을 그린다 */
export function makeTilesetFallback(scene: Phaser.Scene, key: TilesetKey): void {
  const frames = TILE_FRAMES[key];
  const count = Math.max(...Object.values(frames)) + 1;
  const cols = 8;
  const rows = Math.ceil(count / cols);
  const tex = scene.textures.createCanvas(key, cols * 32, rows * 32);
  if (!tex) return;
  const ctx = tex.getContext();
  for (const [name, frame] of Object.entries(frames) as [TileName, number][]) {
    const x = (frame % cols) * 32;
    const y = Math.floor(frame / cols) * 32;
    ctx.fillStyle = TILE_COLOR[name];
    ctx.fillRect(x, y, 32, 32);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x, y + 31, 32, 1);
    ctx.fillRect(x + 31, y, 1, 32);
    if (SOLID_DETAIL.has(name)) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(x + 3, y + 3, 26, 3);
    }
  }
  tex.refresh();
  addGridFrames(tex, cols, rows, 32);
}
