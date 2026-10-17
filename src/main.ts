// 토대용 임시 진입점 — 프론트엔드 담당이 씬 구성으로 교체한다
import Phaser from 'phaser';
import { COLORS, FONTS, GAME_HEIGHT, GAME_WIDTH } from './config';

class PlaceholderScene extends Phaser.Scene {
  constructor() {
    super('Placeholder');
  }

  create(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '코드네임 모스', { fontFamily: FONTS.title, fontSize: '14px', color: COLORS.accent })
      .setOrigin(0.5);
  }
}

await document.fonts.load(`11px ${FONTS.body}`);
await document.fonts.load(`14px ${FONTS.title}`);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.bgDeep,
  pixelArt: true,
  roundPixels: true,
  scene: [PlaceholderScene],
});
