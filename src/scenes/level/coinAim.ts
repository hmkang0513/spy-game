// 동전 조준·던지기 (AC-46~49) — G 누르고 조준, 좌클릭 던지기, 우클릭/G 떼기 취소
import Phaser from 'phaser';
import { TILE, TUNING } from '../../config';
import { coinTarget } from '../../core';
import type { Grid } from '../../core';
import type { Vec2 } from '../../types';
import type { Guard } from '../../entities/Guard';
import { C } from '../../ui/theme';

export interface CoinAimHost {
  grid(): Grid;
  playerFeet(): Vec2;
  guardsNear(p: Vec2, radiusTiles: number): Guard[];
  clearHighlights(): void;
  /** 착지 — 소음 발생 */
  onLand(p: Vec2): void;
  /** 동전 1개 소모. 없으면 false */
  spendCoin(): boolean;
}

export class CoinAim {
  aiming = false;
  /** 우클릭으로 취소한 뒤 G 를 뗄 때까지 다시 조준하지 않음 */
  private suppressed = false;
  private target: { point: Vec2; valid: boolean } | null = null;
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly host: CoinAimHost,
  ) {
    this.g = scene.add.graphics().setDepth(4000);
    scene.input.mouse?.disableContextMenu();
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (!this.aiming) return;
      if (p.rightButtonDown()) this.cancel(true);
      else if (p.leftButtonDown()) this.throwCoin();
    });
  }

  /** 매 프레임: G 가 눌려 있고 동전이 있으면 조준 */
  update(gHeld: boolean, canAim: boolean): void {
    if (!gHeld) this.suppressed = false;
    const want = gHeld && canAim && !this.suppressed;
    if (!want) {
      if (this.aiming) this.cancel(false);
      return;
    }
    this.aiming = true;
    const ptr = this.scene.input.activePointer;
    const aim = ptr.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    const from = this.host.playerFeet();
    this.target = coinTarget(this.host.grid(), from, { x: aim.x, y: aim.y }, TUNING.coin.maxTiles);
    this.draw(from);
  }

  private draw(from: Vec2): void {
    const t = this.target;
    const g = this.g.clear();
    this.host.clearHighlights();
    if (!t) return;
    const { point, valid } = t;
    const color = valid ? C.accent : C.danger;
    // 포물선 점선
    const peak = Math.min(48, Math.hypot(point.x - from.x, point.y - from.y) * 0.35);
    g.fillStyle(color, 0.9);
    for (let i = 1; i < 16; i++) {
      const s = i / 16;
      const x = from.x + (point.x - from.x) * s;
      const y = from.y + (point.y - from.y) * s - Math.sin(Math.PI * s) * peak;
      g.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
    if (!valid) {
      // 벽 너머: X 표시
      g.lineStyle(2, C.danger, 1).lineBetween(point.x - 5, point.y - 5, point.x + 5, point.y + 5).lineBetween(point.x + 5, point.y - 5, point.x - 5, point.y + 5);
      return;
    }
    g.lineStyle(1, C.accent, 1).strokeCircle(point.x, point.y, 5);
    g.lineStyle(1, 0xffffff, 0.5).strokeCircle(point.x, point.y, TUNING.coin.noiseTiles * TILE);
    for (const guard of this.host.guardsNear(point, TUNING.coin.noiseTiles)) guard.highlighted = true;
  }

  private throwCoin(): void {
    const t = this.target;
    if (!t?.valid || !this.host.spendCoin()) return;
    const from = this.host.playerFeet();
    const coin = this.scene.add.graphics().setDepth(4100);
    coin.fillStyle(C.accent, 1).fillCircle(0, 0, 3);
    const peak = Math.min(48, Math.hypot(t.point.x - from.x, t.point.y - from.y) * 0.35);
    const st = { s: 0 };
    this.scene.tweens.add({
      targets: st,
      s: 1,
      duration: 400,
      onUpdate: () => {
        coin.setPosition(from.x + (t.point.x - from.x) * st.s, from.y + (t.point.y - from.y) * st.s - Math.sin(Math.PI * st.s) * peak);
      },
      onComplete: () => {
        coin.destroy(); // 떨어진 동전은 다시 주울 수 없다 (AC-49)
        this.host.onLand(t.point);
      },
    });
    this.cancel(true);
  }

  private cancel(suppress: boolean): void {
    this.aiming = false;
    this.suppressed = suppress;
    this.target = null;
    this.g.clear();
    this.host.clearHighlights();
  }
}
