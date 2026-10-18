// 디자인 토큰 도우미 (03_화면설계서 §4) — 색 숫자 변환, 글꼴 스타일, 패널 그리기
import Phaser from 'phaser';
import { COLORS, FONTS } from '../config';

/** '#RRGGBB' → 0xRRGGBB */
export function hex(c: string): number {
  return parseInt(c.replace('#', ''), 16);
}

export const C = {
  bgVoid: hex(COLORS.bgVoid),
  bgDeep: hex(COLORS.bgDeep),
  panelGlass: hex(COLORS.panelGlass),
  panelLine: hex(COLORS.panelLine),
  paper: hex(COLORS.paper),
  paperShade: hex(COLORS.paperShade),
  ink: hex(COLORS.ink),
  text: hex(COLORS.text),
  textDim: hex(COLORS.textDim),
  textLocked: hex(COLORS.textLocked),
  accent: hex(COLORS.accent),
  accent2: hex(COLORS.accent2),
  stamp: hex(COLORS.stamp),
  safe: hex(COLORS.safe),
  suspicion: hex(COLORS.suspicion),
  danger: hex(COLORS.danger),
  cone: hex(COLORS.cone),
} as const;

export type FontToken = 'title' | 'body' | 'bold' | 'small' | 'tag' | 'mono';

const SIZE: Record<FontToken, number> = { title: 14, body: 11, bold: 11, small: 9, tag: 7, mono: 9 };
const LINE: Record<FontToken, number> = { title: 20, body: 16, bold: 16, small: 12, tag: 10, mono: 12 };

export function lineHeight(token: FontToken): number {
  return LINE[token];
}

/** Galmuri 설계 크기 그대로의 텍스트 스타일 */
export function textStyle(token: FontToken, color: string = COLORS.text, extra: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: `${FONTS[token]}, sans-serif`,
    fontSize: `${SIZE[token]}px`,
    color,
    lineSpacing: LINE[token] - SIZE[token] - 2,
    ...extra,
  };
}

/** 정수 좌표 텍스트 (03 §4.2: 글자는 항상 정수 좌표) */
export function addText(scene: Phaser.Scene, x: number, y: number, str: string, token: FontToken, color?: string, extra?: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
  return scene.add.text(Math.round(x), Math.round(y), str, textStyle(token, color, extra));
}

export type PanelStyle = 'glass' | 'paper' | 'stamp';

/** 9-slice 대신 Graphics 로 패널을 그린다 (03 §4.3) */
export function drawPanel(g: Phaser.GameObjects.Graphics, style: PanelStyle, x: number, y: number, w: number, h: number): void {
  x = Math.round(x);
  y = Math.round(y);
  if (style === 'glass') {
    g.fillStyle(C.bgVoid, 1).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(C.panelGlass, 0.92).fillRect(x, y, w, h);
    g.lineStyle(1, C.panelLine, 1).strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  } else if (style === 'paper') {
    g.fillStyle(C.bgVoid, 0.6).fillRect(x + 2, y + 2, w, h);
    g.fillStyle(C.paper, 1).fillRect(x, y, w, h);
    g.lineStyle(1, C.ink, 1).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  } else {
    g.lineStyle(2, C.stamp, 1).strokeRect(x + 1, y + 1, w - 2, h - 2);
    g.lineStyle(1, C.stamp, 1).strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
  }
}

/** 화면 전환: 페이드 아웃 후 씬 시작 (AC-02, 0.5초 이하) */
export function fadeTo(scene: Phaser.Scene, key: string, data?: object): void {
  const cam = scene.cameras.main;
  if (cam.fadeEffect.isRunning) return;
  cam.fadeOut(200, 14, 16, 36);
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
}

export function fadeIn(scene: Phaser.Scene): void {
  scene.cameras.main.fadeIn(200, 14, 16, 36);
}
