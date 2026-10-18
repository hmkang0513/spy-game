// S0 Boot — 에셋 preload, 대체 텍스처, 애니메이션 등록, 세이브 검증
import Phaser from 'phaser';
import { CHARACTER_IDS, SHEET_COLS, SHEET_FRAME, SHEET_ROWS, TILESETS } from '../types';
import { character } from '../state/content';
import { gameState } from '../state/game';
import { makeCharacterFallback, makeTilesetFallback } from '../ui/fallbackTextures';
import { C } from '../ui/theme';
import { installTestApi } from '../debug/testApi';

/** 실제로 있는 이미지 URL (없는 파일을 로더에 넣으면 콘솔 에러가 나므로 미리 확인한다) */
const available = new Set<string>();

/** 개발 서버는 없는 파일에 index.html(200)을 돌려주므로 content-type 까지 본다 */
export async function probeAssets(): Promise<void> {
  const urls = [
    ...CHARACTER_IDS.map((id) => characterUrl(id)),
    ...Object.values(TILESETS).map((k) => `assets/tiles/${k}.png`),
  ];
  await Promise.all(
    urls.map(async (u) => {
      try {
        const res = await fetch(u, { method: 'HEAD' });
        if (res.ok && (res.headers.get('content-type') ?? '').startsWith('image/')) available.add(u);
      } catch {
        // 없으면 대체 텍스처
      }
    }),
  );
}

function characterUrl(id: string): string {
  return `assets/characters/${character(id)?.sheet ?? id}.png`;
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const bar = this.add.graphics();
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => {
      bar.clear().fillStyle(C.accent, 1).fillRect(220, 178, Math.round(200 * p), 4);
    });
    // 없는 파일은 경고만 남기고 create 에서 대체 텍스처를 만든다
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`에셋을 읽지 못함: ${file.src} — 대체 텍스처 사용`);
    });
    for (const id of CHARACTER_IDS) {
      const url = characterUrl(id);
      if (available.has(url)) this.load.spritesheet(id, url, { frameWidth: SHEET_FRAME, frameHeight: SHEET_FRAME });
    }
    for (const key of Object.values(TILESETS)) {
      const url = `assets/tiles/${key}.png`;
      if (available.has(url)) this.load.spritesheet(key, url, { frameWidth: 32, frameHeight: 32 });
    }
  }

  create(): void {
    for (const id of CHARACTER_IDS) {
      if (!this.textures.exists(id)) makeCharacterFallback(this, id, character(id)?.signatureColor ?? '#9C97B5');
      this.registerAnims(id);
    }
    for (const key of Object.values(TILESETS)) {
      if (!this.textures.exists(key)) makeTilesetFallback(this, key);
    }
    gameState.load();
    // 테스트 API 는 에셋·세이브 준비가 끝난 뒤 노출한다
    installTestApi(this.game);
    this.scene.start('Title');
  }

  /** 걷기 애니메이션: `<id>:walk:<dir>` (열 1~8) */
  private registerAnims(id: string): void {
    SHEET_ROWS.forEach((dir, row) => {
      const key = `${id}:walk:${dir}`;
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(id, { start: row * SHEET_COLS + 1, end: row * SHEET_COLS + 8 }),
        frameRate: 10,
        repeat: -1,
      });
    });
  }
}
