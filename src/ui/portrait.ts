// 초상 64×64 — down 정지 프레임의 머리(32×32)를 2배로 확대, 배경은 시그니처 색 (04 §2.5, 03 §8)
import Phaser from 'phaser';
import { SHEET_COLS, SHEET_ROWS } from '../types';
import { character } from '../state/content';
import { C, hex } from './theme';

/** 64px 프레임 안 머리 영역 (LPC 기준) */
const HEAD = { x: 16, y: 8, size: 32 };

export function makePortrait(scene: Phaser.Scene, charId: string, x: number, y: number): Phaser.GameObjects.Container {
  const def = character(charId);
  const bg = scene.add.graphics();
  bg.fillStyle(C.bgVoid, 1).fillRect(-1, -1, 66, 66);
  bg.fillStyle(def ? hex(def.signatureColor) : C.panelGlass, 1).fillRect(0, 0, 64, 64);
  const items: Phaser.GameObjects.GameObject[] = [bg];
  if (scene.textures.exists(charId)) {
    const frame = SHEET_ROWS.indexOf('down') * SHEET_COLS;
    const img = scene.add.image(-HEAD.x * 2, -HEAD.y * 2, charId, frame).setOrigin(0, 0).setScale(2);
    img.setCrop(HEAD.x, HEAD.y, HEAD.size, HEAD.size);
    items.push(img);
  }
  items.push(scene.add.graphics().lineStyle(1, C.panelLine, 1).strokeRect(0.5, 0.5, 63, 63));
  return scene.add.container(Math.round(x), Math.round(y), items);
}
