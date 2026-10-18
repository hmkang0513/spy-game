// 상호작용 오브젝트 표시 — 조사·은신처·잠긴 문·동전·출구 (AC-38, 42, 46, 60)
import Phaser from 'phaser';
import { TILE } from '../config';
import type { InteractableDef, Vec2 } from '../types';
import { C } from '../ui/theme';
import { tileToFeet } from './actor';

export const HINT_LABEL: Record<InteractableDef['kind'], string> = {
  inspect: '조사',
  hide: '숨기',
  lockedDoor: '열기',
  coinPickup: '줍기',
  exit: '나가기',
};

export class Interactable {
  readonly pos: Vec2;
  private readonly g: Phaser.GameObjects.Graphics;
  private t = 0;
  /** 사라진 오브젝트 (주운 동전, 열린 문) */
  gone = false;
  revealed = true;

  constructor(
    scene: Phaser.Scene,
    readonly def: InteractableDef,
  ) {
    this.pos = tileToFeet(def.pos);
    this.g = scene.add.graphics().setDepth(def.kind === 'lockedDoor' ? 50 : 20);
    this.draw();
  }

  get available(): boolean {
    return !this.gone && this.revealed;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.def.kind === 'inspect' || this.def.kind === 'coinPickup') this.draw();
  }

  setState(gone: boolean, revealed: boolean): void {
    this.gone = gone;
    this.revealed = revealed;
    this.draw();
  }

  private draw(): void {
    const g = this.g.clear();
    g.setVisible(this.available);
    if (!this.available) return;
    const x = this.def.pos.tx * TILE;
    const y = this.def.pos.ty * TILE;
    const { x: cx, y: cy } = this.pos;
    switch (this.def.kind) {
      case 'hide': {
        drawProp(g, propOf(this.def.id), x, y);
        // hide.spot: 하늘색 α0.25 + 모서리 꺾쇠
        g.fillStyle(C.safe, 0.25).fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        g.lineStyle(1, C.safe, 0.9);
        const k = 6;
        for (const [px, py, dx, dy] of [[x + 2, y + 2, 1, 1], [x + 30, y + 2, -1, 1], [x + 2, y + 30, 1, -1], [x + 30, y + 30, -1, -1]] as const) {
          g.lineBetween(px, py, px + dx * k, py);
          g.lineBetween(px, py, px, py + dy * k);
        }
        break;
      }
      case 'lockedDoor':
        g.fillStyle(0x5a3a28, 1).fillRect(x + 2, y, TILE - 4, TILE);
        g.lineStyle(1, C.bgVoid, 1).strokeRect(x + 2.5, y + 0.5, TILE - 5, TILE - 1);
        g.fillStyle(C.accent, 1).fillRect(cx - 3, cy - 2, 6, 5);
        g.lineStyle(1, C.accent, 1).strokeCircle(cx, cy - 4, 2.5);
        break;
      case 'coinPickup': {
        const bob = Math.round(Math.sin(this.t * 3) * 1.5);
        g.fillStyle(C.bgVoid, 0.4).fillEllipse(cx, cy + 6, 8, 3);
        g.fillStyle(C.accent, 1).fillCircle(cx, cy + bob, 4);
        g.fillStyle(0xfff2b0, 1).fillRect(cx - 1, cy - 2 + bob, 1, 3);
        break;
      }
      case 'inspect': {
        const prop = propOf(this.def.id);
        if (prop) drawProp(g, prop, x, y);
        // 반짝이는 조사 지점
        const a = 0.55 + 0.45 * Math.sin(this.t * 4);
        g.fillStyle(C.accent, a).fillRect(cx - 1, cy - 4, 2, 8).fillRect(cx - 4, cy - 1, 8, 2);
        break;
      }
      case 'exit':
        g.lineStyle(1, C.accent2, 0.9).strokeRect(x + 1.5, y + 1.5, TILE - 3, TILE - 3);
        g.fillStyle(C.accent2, 0.8).fillTriangle(cx - 4, cy - 3, cx + 4, cy - 3, cx, cy + 3);
        break;
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

type Prop = 'curtain' | 'locker' | 'plant' | 'crate' | 'safe' | 'vending' | null;

/** 오브젝트 id 로 소품 모양을 고른다 (바닥 타일 위에 놓인 은신처·조사 대상) */
function propOf(id: string): Prop {
  for (const p of ['curtain', 'locker', 'plant', 'crate', 'safe', 'vending'] as const) if (id.includes(p)) return p;
  return null;
}

function drawProp(g: Phaser.GameObjects.Graphics, prop: Prop, x: number, y: number): void {
  switch (prop) {
    case 'curtain':
      g.fillStyle(0x7a2e3a, 1).fillRect(x + 4, y, 24, 30);
      g.fillStyle(0x5a1e2a, 1);
      for (let i = 0; i < 4; i++) g.fillRect(x + 7 + i * 6, y, 2, 30);
      g.fillStyle(C.accent, 1).fillRect(x + 4, y, 24, 2);
      break;
    case 'locker':
      g.fillStyle(0x4a5a6a, 1).fillRect(x + 6, y + 1, 20, 30);
      g.lineStyle(1, C.bgVoid, 1).strokeRect(x + 6.5, y + 1.5, 19, 29);
      g.fillStyle(C.bgVoid, 1).fillRect(x + 10, y + 5, 12, 1).fillRect(x + 10, y + 8, 12, 1).fillRect(x + 22, y + 16, 2, 4);
      break;
    case 'plant':
      g.fillStyle(0x8a5a3a, 1).fillRect(x + 10, y + 20, 12, 10);
      g.fillStyle(0x2e6a3a, 1).fillCircle(x + 16, y + 13, 10);
      g.fillStyle(0x4e8a4a, 1).fillCircle(x + 12, y + 10, 5).fillCircle(x + 20, y + 12, 5);
      break;
    case 'crate':
      g.fillStyle(0x9a7040, 1).fillRect(x + 3, y + 5, 26, 24);
      g.lineStyle(1, 0x5a3a20, 1).strokeRect(x + 3.5, y + 5.5, 25, 23).lineBetween(x + 4, y + 6, x + 28, y + 28).lineBetween(x + 28, y + 6, x + 4, y + 28);
      break;
    case 'safe':
      g.fillStyle(0x3a3a44, 1).fillRect(x + 4, y + 2, 24, 26);
      g.lineStyle(1, C.textDim, 1).strokeRect(x + 4.5, y + 2.5, 23, 25).strokeCircle(x + 16, y + 15, 5);
      break;
    case 'vending':
      g.fillStyle(0x2c5a8a, 1).fillRect(x + 4, y, 24, 30);
      g.fillStyle(0xbfe0ff, 0.8).fillRect(x + 7, y + 4, 12, 14);
      g.fillStyle(C.accent, 1).fillRect(x + 21, y + 6, 4, 2);
      break;
    default:
      break;
  }
}
