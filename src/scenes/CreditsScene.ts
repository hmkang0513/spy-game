// S8 크레딧 — public/assets/CREDITS.md 를 스크롤 평문으로 보여 준다 (S6, NFR-06). L3 클리어면 엔딩 문구 먼저
import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { addText, fadeIn, fadeTo } from '../ui/theme';

const ENDING = [
  '오로라 칩은 등대의 금고로 돌아왔다.',
  '까마귀 상회의 거래는 없던 일이 되었고,',
  '주노아 박사는 어딘가에서 새 실험 일지를 쓰기 시작했다.',
  '',
  '신입 요원 모스의 첫 사건, 종결.',
  '',
  '',
];
const FALLBACK = '크레딧 파일을 불러오지 못했습니다.\n\n폰트: Galmuri (OFL-1.1)\n엔진: Phaser 4';

/** 마크다운 기호를 걷어낸 평문 */
function plain(md: string): string {
  return md
    .replace(/^#+\s*/gm, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/[*_`>]/g, '')
    .replace(/^\s*[-|: ]+\s*$/gm, '')
    .replace(/\|/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

export class CreditsScene extends Phaser.Scene {
  private text: Phaser.GameObjects.Text | null = null;
  private ending = false;
  private y = GAME_HEIGHT;

  constructor() {
    super('Credits');
  }

  init(data: { ending?: boolean }): void {
    this.ending = Boolean(data.ending);
    this.text = null;
    this.y = GAME_HEIGHT;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bgVoid);
    addText(this, GAME_WIDTH - 8, GAME_HEIGHT - 14, 'Esc / Enter 타이틀', 'tag', COLORS.textDim).setOrigin(1, 0).setDepth(2);
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (['Escape', 'Enter', 'Space'].includes(e.code)) fadeTo(this, 'Title');
    });
    void this.loadCredits();
    fadeIn(this);
  }

  private async loadCredits(): Promise<void> {
    let body = FALLBACK;
    try {
      const res = await fetch('assets/CREDITS.md');
      const type = res.headers.get('content-type') ?? '';
      // 개발 서버는 없는 파일에 index.html 을 돌려줄 수 있다
      if (res.ok && !type.includes('html')) body = plain(await res.text());
    } catch {
      // 파일이 없으면 기본 문구
    }
    if (!this.sys.isActive()) return;
    const head = this.ending ? `${ENDING.join('\n')}\n` : '';
    this.text = addText(this, 40, this.y, `${head}코드네임 모스 — 크레딧\n\n${body}`, 'small', COLORS.text, {
      wordWrap: { width: GAME_WIDTH - 80, useAdvancedWrap: true },
    });
  }

  update(_t: number, deltaMs: number): void {
    if (!this.text) return;
    this.y -= (deltaMs / 1000) * 24;
    // 다 올라가면 처음부터 다시
    if (this.y < -this.text.height) this.y = GAME_HEIGHT;
    this.text.setY(Math.round(this.y));
  }
}
