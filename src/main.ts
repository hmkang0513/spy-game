// 진입점 — 폰트 로드 후 Phaser.Game 생성 (02 §4, 03 §0)
import Phaser from 'phaser';
import { FONTS, GAME_HEIGHT, GAME_WIDTH } from './config';
import { integerZoom, layoutUiRoot } from './dom/layout';
import { notebook } from './dom/ClueNotebook';
import { SCENES } from './scenes';
import { probeAssets } from './scenes/BootScene';

/** Galmuri 를 모두 읽은 뒤 시작한다 (AC-01). 실패하면 시스템 글꼴로 계속 진행 */
async function loadFonts(): Promise<void> {
  const sizes: Record<string, number> = { [FONTS.title]: 14, [FONTS.body]: 11, [FONTS.bold]: 11, [FONTS.small]: 9, [FONTS.tag]: 7, [FONTS.mono]: 9 };
  try {
    await Promise.all(Object.entries(sizes).map(([family, px]) => document.fonts.load(`${px}px ${family}`, '가A1')));
  } catch (e) {
    console.warn('폰트 로드 실패 — 시스템 글꼴로 대체합니다', e);
  }
}

await Promise.all([loadFonts(), probeAssets()]);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0E1024',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.NONE, zoom: integerZoom() },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: SCENES,
});

function relayout(): void {
  game.scale.setZoom(integerZoom());
  requestAnimationFrame(layoutUiRoot);
}
window.addEventListener('resize', relayout);
game.events.once(Phaser.Core.Events.READY, () => requestAnimationFrame(layoutUiRoot));

notebook.attach(game);
