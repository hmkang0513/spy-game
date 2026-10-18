// 소음 원 (03 §4.1·§4.4) — 반경까지 600ms 동안 퍼지며 사라진다. 소리는 항상 눈으로도 보이게 한다
import Phaser from 'phaser';
import { TILE } from '../config';
import type { Vec2 } from '../types';

export function drawNoiseRing(scene: Phaser.Scene, origin: Vec2, radiusTiles: number): void {
  const g = scene.add.graphics().setDepth(4500);
  const state = { r: 0, a: 0.6 };
  scene.tweens.add({
    targets: state,
    r: radiusTiles * TILE,
    a: 0,
    duration: 600,
    onUpdate: () => {
      g.clear().lineStyle(2, 0xffffff, state.a).strokeCircle(origin.x, origin.y, state.r);
    },
    onComplete: () => g.destroy(),
  });
}
