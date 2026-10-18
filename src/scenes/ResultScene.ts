// S7 결과 — 통계 카운트업, 등급 도장, 능력 해금 카드, 최고 기록 (AC-56~58, 62)
import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { Grade, LevelId, LevelStats } from '../types';
import { getLevel, newAbilitiesAt } from '../state/content';
import { C, addText, drawPanel, fadeIn, fadeTo } from '../ui/theme';

export interface ResultLaunch {
  stats: LevelStats;
  grade: Grade;
  newBest: boolean;
  prevBest?: Grade;
  level: LevelId;
}

export class ResultScene extends Phaser.Scene {
  private result!: ResultLaunch;
  /** 연출이 끝났거나 건너뜀 */
  private settled = false;
  private stamped = false;

  constructor() {
    super('Result');
  }

  init(data: ResultLaunch): void {
    this.result = data;
    this.settled = false;
    this.stamped = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bgDeep);
    const d = this.result;
    const lv = getLevel(d.level);
    addText(this, 24, 16, `임무 완료: ${lv.title}`, 'title', COLORS.accent);

    const s = d.stats;
    const rows: [string, number, (n: number) => string][] = [
      ['소요 시간', s.timeSec, fmtTime],
      ['경보 횟수', s.alertCount, (n) => (lv.guardsActive ? `${n}회` : '-')],
      ['단서 수집', s.cluesFound, (n) => `${n}/${s.cluesTotal}`],
      ['사용한 동전', s.coinsUsed, (n) => `${n}개`],
      ['체크포인트 복귀', s.checkpointRestarts, (n) => `${n}회`],
    ];
    drawPanel(this.add.graphics(), 'paper', 24, 48, 180, 150);
    rows.forEach(([label, value, fmt], i) => {
      addText(this, 240, 56 + i * 24, label, 'body', COLORS.textDim);
      const t = addText(this, 420, 58 + i * 24, fmt(0), 'mono', COLORS.text);
      // 한 줄씩 카운트업 (각 250ms)
      const st = { v: 0 };
      this.tweens.add({
        targets: st,
        v: value,
        delay: i * 250,
        duration: 250,
        onUpdate: () => t.setText(fmt(Math.round(st.v))),
        onComplete: () => t.setText(fmt(value)),
      });
    });
    this.time.delayedCall(rows.length * 250 + 100, () => this.stamp());
    this.unlockCard(d.level);

    const next = d.level < 3 ? '다음 임무 Enter' : '엔딩 Enter';
    addText(this, GAME_WIDTH / 2 - 150, GAME_HEIGHT - 26, `[ ${next} ]`, 'body', COLORS.accent);
    addText(this, GAME_WIDTH / 2 + 30, GAME_HEIGHT - 26, '[ 임무 목록 Esc ]', 'body', COLORS.textDim);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    fadeIn(this);
  }

  private onKey(e: KeyboardEvent): void {
    // 연출 중이면 아무 키나 눌러 건너뛴다
    if (!this.settled) {
      this.tweens.getTweens().forEach((t) => t.complete());
      this.time.removeAllEvents();
      this.stamp();
      return;
    }
    const lvl = this.result.level;
    if (e.code === 'Escape') fadeTo(this, 'LevelSelect');
    else if (e.code === 'Enter' || e.code === 'Space') {
      if (lvl < 3) fadeTo(this, 'Briefing', { level: (lvl + 1) as LevelId });
      else fadeTo(this, 'Credits', { ending: true });
    }
  }

  /** 등급 도장: 스케일 2→1, 120ms + 흔들림 2px (03 §4.4) */
  private stamp(): void {
    if (this.stamped) return;
    this.stamped = true;
    const d = this.result;
    const c = this.add.container(114, 122);
    const g = this.add.graphics();
    drawPanel(g, 'stamp', -44, -44, 88, 88);
    c.add([g, addText(this, 0, -14, d.grade, 'title', COLORS.stamp).setOrigin(0.5, 0), addText(this, 0, 12, '등급', 'small', COLORS.stamp).setOrigin(0.5, 0)]);
    c.setRotation(-0.14).setScale(2);
    this.tweens.add({
      targets: c,
      scale: 1,
      duration: 120,
      onComplete: () => {
        this.cameras.main.shake(150, 2 / GAME_WIDTH);
        this.settled = true;
      },
    });
    if (d.newBest) addText(this, 32, 206, d.prevBest ? `최고 기록 갱신! (${d.prevBest} → ${d.grade})` : '최고 기록 갱신!', 'small', COLORS.accent);
  }

  /** 다음 레벨의 새 능력 카드 (뒤집히며 등장 400ms) */
  private unlockCard(level: LevelId): void {
    this.add.graphics().lineStyle(1, C.panelLine, 0.6).lineBetween(24, 232, GAME_WIDTH - 24, 232);
    const list = level < 3 ? newAbilitiesAt((level + 1) as LevelId) : [];
    addText(this, GAME_WIDTH / 2, 226, level < 3 ? ' 새 능력 ' : ' 임무 완수 ', 'small', COLORS.accent2, { backgroundColor: COLORS.bgDeep }).setOrigin(0.5, 0);
    if (list.length === 0) {
      if (level === 3) addText(this, GAME_WIDTH / 2, 256, '오로라 칩을 무사히 회수했다.', 'body', COLORS.text).setOrigin(0.5, 0);
      return;
    }
    const w = 200;
    list.forEach((a, i) => {
      const x = GAME_WIDTH / 2 - (list.length * (w + 12) - 12) / 2 + i * (w + 12);
      const card = this.add.container(Math.round(x + w / 2), 280);
      const cg = this.add.graphics();
      drawPanel(cg, 'glass', -w / 2, -28, w, 56);
      card.add([
        cg,
        addText(this, -w / 2 + 8, -22, `${a.name}  [${a.keyHint}]`, 'bold', COLORS.accent),
        addText(this, -w / 2 + 8, -4, a.description, 'small', COLORS.text, { wordWrap: { width: w - 16, useAdvancedWrap: true } }),
      ]);
      card.scaleX = 0;
      this.tweens.add({ targets: card, scaleX: 1, delay: 1700 + i * 150, duration: 400, ease: 'Back.Out' });
    });
  }
}

function fmtTime(sec: number): string {
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}
