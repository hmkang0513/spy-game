// 세로 메뉴 (타이틀·일시정지·확인창) — ↑↓/W·S, Enter/Space, 마우스 호버·클릭
import Phaser from 'phaser';
import { COLORS } from '../config';
import { C, addText } from './theme';

export interface MenuItem {
  label: string;
  disabled?: boolean;
  /** 비활성일 때 보조 설명 */
  hint?: string;
  onSelect: () => void;
}

export class Menu {
  private readonly texts: Phaser.GameObjects.Text[] = [];
  private readonly cursor: Phaser.GameObjects.Text;
  private readonly underline: Phaser.GameObjects.Graphics;
  private readonly hint: Phaser.GameObjects.Text;
  private index = 0;
  private readonly keyHandler: (e: KeyboardEvent) => void;
  active = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    y: number,
    private readonly items: MenuItem[],
    spacing = 20,
  ) {
    this.index = Math.max(0, items.findIndex((i) => !i.disabled));
    this.cursor = addText(scene, x - 12, y, '>', 'body', COLORS.accent);
    this.underline = scene.add.graphics();
    this.hint = addText(scene, x, y + items.length * spacing + 4, '', 'tag', COLORS.textDim);
    items.forEach((item, i) => {
      const t = addText(scene, x, y + i * spacing, item.label, 'body', item.disabled ? COLORS.textLocked : COLORS.text);
      t.setInteractive({ useHandCursor: !item.disabled });
      t.on('pointerover', () => this.active && this.select(i));
      t.on('pointerdown', () => this.active && this.confirm(i));
      this.texts.push(t);
    });
    this.keyHandler = (e) => this.onKey(e);
    scene.input.keyboard?.on('keydown', this.keyHandler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    this.render();
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.active) return;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.move(-1);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.move(1);
    else if (e.code === 'Enter' || e.code === 'Space') this.confirm(this.index);
  }

  private move(d: number): void {
    const n = this.items.length;
    this.index = (this.index + d + n) % n;
    this.render();
  }

  private select(i: number): void {
    this.index = i;
    this.render();
  }

  private confirm(i: number): void {
    const item = this.items[i];
    this.select(i);
    if (!item) return;
    if (item.disabled) {
      this.scene.tweens.add({ targets: this.texts[i], x: this.x + 2, duration: 40, yoyo: true, repeat: 1 });
      return;
    }
    item.onSelect();
  }

  private render(): void {
    const t = this.texts[this.index];
    if (!t) return;
    this.cursor.setY(t.y);
    this.underline.clear().fillStyle(C.accent, 1).fillRect(t.x, t.y + 14, Math.round(t.width), 1);
    const item = this.items[this.index];
    this.hint.setText(item?.disabled ? (item.hint ?? '') : '');
    this.texts.forEach((tx, i) => {
      const it = this.items[i]!;
      tx.setColor(it.disabled ? COLORS.textLocked : i === this.index ? COLORS.accent : COLORS.text);
    });
  }

  setVisible(v: boolean): void {
    [...this.texts, this.cursor, this.underline, this.hint].forEach((o) => o.setVisible(v));
    this.active = v;
  }

  destroy(): void {
    this.scene.input.keyboard?.off('keydown', this.keyHandler);
  }
}
