// O4 일시정지 (AC-06) — 계속 / 체크포인트에서 재시작 / 레벨 선택으로. 월드·타이머·게이지가 멈춘다
import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Menu } from '../ui/menu';
import { C, addText, drawPanel } from '../ui/theme';
import { setSession } from '../state/session';
import type { LevelScene } from './LevelScene';

/** 일시정지 동안 함께 멈출 씬 */
const GAME_SCENES = ['Level', 'Dialogue', 'Lockpick'];

export class PauseScene extends Phaser.Scene {
  private paused: string[] = [];

  constructor() {
    super('Pause');
  }

  create(): void {
    this.paused = GAME_SCENES.filter((k) => this.scene.isActive(k));
    this.paused.forEach((k) => this.scene.pause(k));
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, C.bgVoid, 0.6).setOrigin(0);
    const w = 200;
    const h = 120;
    const x = (GAME_WIDTH - w) / 2;
    const y = (GAME_HEIGHT - h) / 2;
    drawPanel(this.add.graphics(), 'glass', x, y, w, h);
    addText(this, x + 16, y + 10, '일시정지', 'title', COLORS.accent);
    new Menu(this, x + 28, y + 40, [
      { label: '계속', onSelect: () => this.resume() },
      { label: '체크포인트에서 재시작', onSelect: () => this.restart() },
      { label: '레벨 선택으로', onSelect: () => this.quit() },
    ]);
    // Esc 로 닫기 (열린 직후 같은 키 입력은 무시)
    this.time.delayedCall(100, () => this.input.keyboard?.on('keydown-ESC', () => this.resume()));
  }

  private resume(): void {
    this.paused.forEach((k) => this.scene.resume(k));
    this.scene.stop();
  }

  private restart(): void {
    this.scene.stop();
    const level = this.scene.get('Level') as LevelScene;
    this.scene.resume('Level');
    level.restartFromCheckpoint();
  }

  private quit(): void {
    setSession(null);
    for (const k of [...GAME_SCENES, 'HUD']) this.scene.stop(k);
    this.scene.start('LevelSelect');
  }
}
