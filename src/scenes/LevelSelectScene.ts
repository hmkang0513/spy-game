// S2 레벨 선택 — 서류철 카드 L1~L3, 잠금(AC-03), 이어하기/처음부터(AC-53)
import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { LevelId } from '../types';
import { LEVEL_IDS, abilitiesFor, getLevel } from '../state/content';
import { gameState } from '../state/game';
import { setSession } from '../state/session';
import { Menu } from '../ui/menu';
import { C, addText, drawPanel, fadeIn, fadeTo } from '../ui/theme';

const CARD_W = 160;
const CARD_H = 200;
const GAP = 24;
const TOP = 52;
const PHOTO: Record<LevelId, number> = { 1: 0x2c5a8a, 2: 0x7a2e3a, 3: 0x4e5a4a };

export class LevelSelectScene extends Phaser.Scene {
  private index = 0;
  private cards: Phaser.GameObjects.Container[] = [];
  private frame!: Phaser.GameObjects.Graphics;
  private prompt: Menu | null = null;
  private promptObjs: Phaser.GameObjects.GameObject[] = [];
  private toastText!: Phaser.GameObjects.Text;

  constructor() {
    super('LevelSelect');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bgDeep);
    this.cards = [];
    this.prompt = null;
    this.index = Math.min(gameState.data.unlockedLevel, 3) - 1;
    addText(this, 16, 12, '임무 목록', 'title', COLORS.accent);
    const abil = abilitiesFor(gameState.data.unlockedLevel).map((a) => a.name).join(' · ');
    addText(this, GAME_WIDTH - 16, 16, `보유 능력: ${abil}`, 'tag', COLORS.textDim).setOrigin(1, 0);
    addText(this, 16, GAME_HEIGHT - 20, '←→ 선택   Enter 브리핑   Esc 타이틀', 'small', COLORS.textDim);
    this.toastText = addText(this, GAME_WIDTH / 2, GAME_HEIGHT - 44, '', 'small', COLORS.stamp).setOrigin(0.5, 0);
    if (!gameState.store.available) addText(this, GAME_WIDTH - 16, GAME_HEIGHT - 20, '저장 불가 — 진행이 저장되지 않습니다', 'small', COLORS.danger).setOrigin(1, 0);

    this.frame = this.add.graphics().setDepth(5);
    LEVEL_IDS.forEach((id, i) => this.cards.push(this.makeCard(id, i)));
    this.select(this.index);

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (this.prompt) {
        if (e.code === 'Escape') this.closePrompt();
        return;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.select(this.index - 1);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.select(this.index + 1);
      else if (e.code === 'Enter' || e.code === 'Space') this.choose();
      else if (e.code === 'Escape') fadeTo(this, 'Title');
    });
    fadeIn(this);
  }

  private locked(id: LevelId): boolean {
    return id > gameState.data.unlockedLevel;
  }

  private makeCard(id: LevelId, i: number): Phaser.GameObjects.Container {
    const x = Math.round((GAME_WIDTH - (CARD_W * 3 + GAP * 2)) / 2 + i * (CARD_W + GAP));
    const level = getLevel(id);
    const g = this.add.graphics();
    drawPanel(g, 'paper', 0, 0, CARD_W, CARD_H);
    g.fillStyle(PHOTO[id], 1).fillRect(8, 8, CARD_W - 16, 84);
    const objs: Phaser.GameObjects.GameObject[] = [g];
    const num = String(id).padStart(2, '0');
    if (this.locked(id)) {
      // 사진 영역 빗금 + 자물쇠
      g.fillStyle(C.ink, 1).fillRect(8, 8, CARD_W - 16, 84);
      g.lineStyle(1, C.textLocked, 0.6);
      const pw = CARD_W - 16;
      const ph = 84;
      for (let k = 6; k < pw + ph; k += 6) {
        // 대각선 x + y = k 를 사진 영역 안으로 자른다
        const x0 = Math.min(k, pw);
        const x1 = Math.max(0, k - ph);
        g.lineBetween(8 + x0, 8 + (k - x0), 8 + x1, 8 + (k - x1));
      }
      g.fillStyle(C.paper, 1).fillRect(CARD_W / 2 - 8, 46, 16, 12);
      g.lineStyle(2, C.paper, 1).strokeCircle(CARD_W / 2, 44, 5);
      objs.push(addText(this, 10, 100, `${num} ???`, 'bold', COLORS.ink));
      objs.push(addText(this, 10, 122, '이전 레벨 클리어 필요', 'small', COLORS.textLocked));
      objs.push(addText(this, 10, 136, `${String(id - 1).padStart(2, '0')} 완료 시 해금`, 'small', COLORS.textLocked));
    } else {
      objs.push(addText(this, 10, 100, `${num} ${level.title}`, 'bold', COLORS.ink));
      objs.push(addText(this, 10, 118, level.subtitle, 'small', COLORS.textLocked, { wordWrap: { width: CARD_W - 20, useAdvancedWrap: true } }));
      const best = gameState.data.bestGrade[id];
      objs.push(addText(this, 10, CARD_H - 22, `등급: ${best ?? '-'}`, 'small', COLORS.ink));
      if (gameState.checkpoint()?.level === id) objs.push(addText(this, CARD_W - 10, CARD_H - 22, '진행 중', 'small', COLORS.accent2).setOrigin(1, 0));
      if (best) {
        // 극비 등급 도장 (-8°)
        const stamp = this.add.container(CARD_W - 34, CARD_H - 52);
        const sg = this.add.graphics();
        drawPanel(sg, 'stamp', -18, -18, 36, 36);
        stamp.add([sg, addText(this, 0, -10, best, 'title', COLORS.stamp).setOrigin(0.5, 0)]);
        stamp.setRotation(Phaser.Math.DegToRad(-8));
        objs.push(stamp);
      }
    }
    const c = this.add.container(x, TOP, objs);
    c.setSize(CARD_W, CARD_H).setInteractive(new Phaser.Geom.Rectangle(0, 0, CARD_W, CARD_H), Phaser.Geom.Rectangle.Contains);
    c.on('pointerdown', () => {
      if (this.prompt) return;
      if (this.index === i) this.choose();
      else this.select(i);
    });
    return c;
  }

  private select(i: number): void {
    this.index = Phaser.Math.Clamp(i, 0, LEVEL_IDS.length - 1);
    this.cards.forEach((c, k) => c.setY(TOP - (k === this.index ? 2 : 0)));
    const c = this.cards[this.index]!;
    this.frame.clear().lineStyle(2, C.accent, 1).strokeRect(c.x - 1, c.y - 1, CARD_W + 2, CARD_H + 2);
  }

  private choose(): void {
    const id = LEVEL_IDS[this.index]!;
    if (this.locked(id)) {
      const c = this.cards[this.index]!;
      this.tweens.add({ targets: c, x: c.x + 3, duration: 40, yoyo: true, repeat: 2 });
      this.toastText.setText(`${String(id - 1).padStart(2, '0')} 완료 시 해금`);
      return;
    }
    if (gameState.checkpoint()?.level === id) this.openPrompt(id);
    else this.startBriefing(id);
  }

  private startBriefing(id: LevelId): void {
    // 시작하는 레벨의 체크포인트만 지운다
    if (gameState.checkpoint()?.level === id) gameState.store.clearCheckpoint();
    setSession(null);
    fadeTo(this, 'Briefing', { level: id });
  }

  /** 체크포인트가 있으면 이어하기/처음부터 (AC-53) */
  private openPrompt(id: LevelId): void {
    const g = this.add.graphics().setDepth(10);
    g.fillStyle(C.bgVoid, 0.6).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    drawPanel(g, 'glass', 200, 120, 240, 100);
    const t = addText(this, 216, 132, '진행 중인 기록이 있습니다', 'body', COLORS.accent).setDepth(11);
    this.promptObjs = [g, t];
    const before = this.children.list.length;
    this.prompt = new Menu(this, 236, 160, [
      {
        label: '이어하기',
        onSelect: () => {
          setSession(null);
          fadeTo(this, 'Level', { level: id, fromCheckpoint: true });
        },
      },
      { label: '처음부터', onSelect: () => this.startBriefing(id) },
    ]);
    this.promptObjs.push(...this.children.list.slice(before));
    this.promptObjs.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(11));
  }

  private closePrompt(): void {
    this.prompt?.destroy();
    this.prompt = null;
    this.promptObjs.forEach((o) => o.destroy());
    this.promptObjs = [];
  }
}
