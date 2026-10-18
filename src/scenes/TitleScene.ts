// S1 타이틀 — 이어하기 / 새 게임 / 설정 / 크레딧 (03 §2 S1)
import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { Settings } from '../types';
import { gameState } from '../state/game';
import { Menu, type MenuItem } from '../ui/menu';
import { C, addText, drawPanel, fadeIn, fadeTo } from '../ui/theme';

type TitleMode = 'main' | 'confirm' | 'settings';

const SPEED_LABEL: Record<Settings['textSpeed'], string> = { slow: '느림', normal: '보통', fast: '빠름', instant: '즉시' };
const SPEEDS: Settings['textSpeed'][] = ['slow', 'normal', 'fast', 'instant'];

export class TitleScene extends Phaser.Scene {
  private mode: TitleMode = 'main';
  private sweep!: Phaser.GameObjects.Graphics;
  private t = 0;

  constructor() {
    super('Title');
  }

  init(data: { mode?: TitleMode }): void {
    this.mode = data.mode ?? 'main';
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bgDeep);
    this.drawHarbor();
    this.sweep = this.add.graphics();
    const title = addText(this, GAME_WIDTH / 2, 92, '코드네임 모스', 'title', COLORS.accent, { shadow: { offsetX: 1, offsetY: 1, color: COLORS.bgVoid, fill: true } });
    title.setOrigin(0.5, 0).setX(Math.round(title.x));
    addText(this, GAME_WIDTH / 2, 116, '- A SPY IN THE PORT CITY -', 'small', COLORS.textDim).setOrigin(0.5, 0);
    addText(this, GAME_WIDTH - 8, GAME_HEIGHT - 14, 'v0.1', 'tag', COLORS.textDim).setOrigin(1, 0);

    const x = GAME_WIDTH / 2 - 50;
    if (this.mode === 'confirm') {
      addText(this, GAME_WIDTH / 2, 160, '기존 기록을 덮어씁니다. 계속할까요?', 'body', COLORS.text).setOrigin(0.5, 0);
      new Menu(this, x, 190, [
        { label: '덮어쓰고 새로 시작', onSelect: () => this.newGame() },
        { label: '취소', onSelect: () => this.scene.restart({ mode: 'main' }) },
      ]);
    } else if (this.mode === 'settings') this.settingsMenu(x);
    else this.mainMenu(x);
    this.notices();
    fadeIn(this);
  }

  private mainMenu(x: number): void {
    const has = gameState.hasProgress();
    const items: MenuItem[] = [
      { label: '이어하기', disabled: !has, hint: '저장된 기록 없음', onSelect: () => fadeTo(this, 'LevelSelect') },
      { label: '새 게임', onSelect: () => (has ? this.scene.restart({ mode: 'confirm' }) : this.newGame()) },
      { label: '설정', onSelect: () => this.scene.restart({ mode: 'settings' }) },
      { label: '크레딧', onSelect: () => fadeTo(this, 'Credits') },
    ];
    new Menu(this, x, 170, items);
  }

  private settingsMenu(x: number): void {
    const s = gameState.settings;
    const onOff = (v: boolean): string => (v ? '켬' : '끔');
    const set = (patch: Partial<Settings>): void => {
      gameState.updateSettings(patch);
      this.scene.restart({ mode: 'settings' });
    };
    new Menu(this, x - 20, 160, [
      { label: `텍스트 속도: ${SPEED_LABEL[s.textSpeed]}`, onSelect: () => set({ textSpeed: SPEEDS[(SPEEDS.indexOf(s.textSpeed) + 1) % SPEEDS.length]! }) },
      { label: `깜빡임 줄이기: ${onOff(s.reduceFlash)}`, onSelect: () => set({ reduceFlash: !s.reduceFlash }) },
      { label: `고대비 원뿔: ${onOff(s.highContrast)}`, onSelect: () => set({ highContrast: !s.highContrast }) },
      { label: '돌아가기', onSelect: () => this.scene.restart({ mode: 'main' }) },
    ]);
  }

  private newGame(): void {
    gameState.resetProgress();
    fadeTo(this, 'LevelSelect');
  }

  /** 세이브 초기화 안내 (AC-54), 저장 불가 경고 (AC-55) */
  private notices(): void {
    const lines: string[] = [];
    const n = gameState.takeNotice();
    if (n === 'reset') lines.push('저장 데이터를 초기화했습니다');
    if (n === 'restoredFromBackup') lines.push('저장 데이터가 손상되어 백업에서 복구했습니다');
    if (!gameState.store.available) lines.push('저장할 수 없는 환경입니다. 진행이 저장되지 않습니다.');
    if (lines.length === 0) return;
    const g = this.add.graphics();
    const h = 8 + lines.length * 14;
    drawPanel(g, 'paper', 120, 16, 400, h);
    lines.forEach((l, i) => addText(this, GAME_WIDTH / 2, 20 + i * 14, l, 'small', COLORS.stamp).setOrigin(0.5, 0));
  }

  /** 배경: 항구 야경 실루엣 */
  private drawHarbor(): void {
    const g = this.add.graphics();
    g.fillStyle(C.bgVoid, 1).fillRect(0, 250, GAME_WIDTH, 110);
    const skyline = [[20, 210, 50], [80, 190, 40], [130, 225, 60], [450, 205, 40], [500, 185, 40], [550, 220, 80]];
    g.fillStyle(0x151833, 1);
    for (const [x, y, w] of skyline) g.fillRect(x!, y!, w!, 250 - y!);
    g.fillStyle(C.accent, 0.6);
    for (const [x, y, w] of skyline) for (let i = 6; i < w! - 4; i += 10) g.fillRect(x! + i, y! + 8, 2, 3);
    // 등대
    g.fillStyle(0x2a2f55, 1).fillRect(394, 180, 12, 70);
    g.fillStyle(C.accent, 1).fillRect(392, 174, 16, 6);
  }

  update(_t: number, deltaMs: number): void {
    this.t += deltaMs / 1000;
    // 서치라이트가 천천히 스윕
    const a = -Math.PI / 2 + Math.sin(this.t * 0.5) * 1.1;
    const g = this.sweep.clear();
    g.fillStyle(C.cone, 0.08);
    g.fillTriangle(400, 177, 400 + Math.cos(a - 0.12) * 420, 177 + Math.sin(a - 0.12) * 420, 400 + Math.cos(a + 0.12) * 420, 177 + Math.sin(a + 0.12) * 420);
  }
}
