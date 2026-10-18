// 경비 머리 위 AlertIcon + 감지 미터 (03 §3·§7) — 모양으로도 상태를 구분한다
import Phaser from 'phaser';
import { COLORS } from '../config';
import { C, addText } from './theme';

export type IconKind = 'none' | 'question' | 'alert' | 'search' | 'caution';

export class AlertIcon {
  readonly container: Phaser.GameObjects.Container;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private kind: IconKind = 'none';
  private gauge = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.g = scene.add.graphics();
    this.label = addText(scene, 0, 0, '', 'small', COLORS.ink).setOrigin(0.5, 0.5);
    this.container = scene.add.container(0, 0, [this.g, this.label]).setDepth(5000);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(Math.round(x), Math.round(y));
  }

  update(kind: IconKind, gauge: number): void {
    if (kind !== this.kind) {
      this.kind = kind;
      // 등장 연출: 스케일 1.6 → 1, 100ms
      if (kind !== 'none') {
        this.container.setScale(1.6);
        this.scene.tweens.add({ targets: this.container, scale: 1, duration: 100 });
      }
    }
    this.gauge = gauge;
    this.draw();
  }

  private draw(): void {
    const g = this.g.clear();
    this.label.setText('');
    switch (this.kind) {
      case 'question': // 마름모 안 ?
        g.fillStyle(C.cone, 1).fillPoints([v(0, -8), v(7, 0), v(0, 8), v(-7, 0)], true);
        this.label.setText('?').setColor(COLORS.ink);
        break;
      case 'alert': // 삼각형 안 !
        g.fillStyle(C.danger, 1).fillTriangle(0, -9, 8, 6, -8, 6);
        this.label.setText('!').setColor('#FFFFFF');
        break;
      case 'search': // 돋보기
        g.lineStyle(2, C.suspicion, 1).strokeCircle(-1, -2, 4);
        g.lineBetween(2, 1, 6, 5);
        break;
      case 'caution': // 모래시계
        g.fillStyle(C.cone, 1).fillTriangle(-4, -6, 4, -6, 0, 0).fillTriangle(-4, 6, 4, 6, 0, 0);
        break;
      default:
        break;
    }
    // 감지 미터 16×3 (아이콘 아래)
    if (this.gauge > 0 && this.kind !== 'alert') {
      g.fillStyle(C.bgVoid, 0.8).fillRect(-8, 9, 16, 3);
      g.fillStyle(this.gauge >= 0.5 ? C.suspicion : C.cone, 1).fillRect(-8, 9, Math.max(1, Math.round(16 * this.gauge)), 3);
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}

function v(x: number, y: number): Phaser.Math.Vector2 {
  return new Phaser.Math.Vector2(x, y);
}
