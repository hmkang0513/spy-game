// S3 브리핑 — 임무 서류 + 국장 대화 + 목표·새 능력·시작 단서 (AC-04)
import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';
import type { LevelDef, LevelId } from '../types';
import { findDialogue, getLevel, newAbilitiesAt } from '../state/content';
import { gameState } from '../state/game';
import { LevelSession, setSession } from '../state/session';
import { C, addText, drawPanel, fadeIn, fadeTo } from '../ui/theme';
import type { DialogueLaunch } from './DialogueScene';

export class BriefingScene extends Phaser.Scene {
  private level!: LevelDef;
  private ready = false;
  private buttons: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Briefing');
  }

  init(data: { level: LevelId }): void {
    this.level = getLevel(data.level ?? 1);
    this.ready = false;
    this.buttons = [];
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bgDeep);
    const lv = this.level;
    const session = new LevelSession(lv, gameState.data.carriedClues);
    setSession(session);
    this.drawFolder(session);

    const accept = addText(this, GAME_WIDTH / 2 - 150, 330, '[ 임무 수락 Enter ]', 'body', COLORS.accent);
    const back = addText(this, GAME_WIDTH / 2 + 30, 330, '[ 목록으로 Esc ]', 'body', COLORS.textDim);
    accept.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.accept());
    back.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.back());
    this.buttons = [accept, back];
    this.buttons.forEach((b) => b.setVisible(false));

    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Escape') this.back();
      else if (this.ready && (e.code === 'Enter' || e.code === 'Space')) this.accept();
    });

    const dialogue = findDialogue(lv, lv.briefing.dialogue);
    if (dialogue) {
      const data: DialogueLaunch = { dialogue, session, onEnd: () => this.time.delayedCall(150, () => this.setReady()) };
      this.scene.launch('Dialogue', data);
      this.scene.bringToTop('Dialogue');
    } else this.setReady();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop('Dialogue'));
    fadeIn(this);
  }

  /** 브리핑 대사가 끝나야 수락 버튼이 활성화된다 (03 §2 S3) */
  private setReady(): void {
    this.ready = true;
    this.buttons.forEach((b) => b.setVisible(true));
  }

  private drawFolder(session: LevelSession): void {
    const lv = this.level;
    const g = this.add.graphics();
    drawPanel(g, 'paper', 16, 12, 608, 196);
    // 클립 장식 + TOP SECRET 도장
    g.fillStyle(C.textDim, 1).fillRect(28, 8, 18, 8);
    const stamp = this.add.container(560, 40);
    const sg = this.add.graphics();
    drawPanel(sg, 'stamp', -46, -12, 92, 24);
    stamp.add([sg, addText(this, 0, -6, 'TOP SECRET', 'small', COLORS.stamp).setOrigin(0.5, 0)]).setRotation(-0.1);

    addText(this, 32, 22, `임무 ${String(lv.id).padStart(2, '0')}: ${lv.title}`, 'title', COLORS.ink);
    addText(this, 32, 44, lv.subtitle, 'small', COLORS.textLocked);
    addText(this, 32, 64, '목표', 'bold', COLORS.ink);
    lv.briefing.objectivesPreview.forEach((o, i) => addText(this, 40, 82 + i * 12, `${i + 1}. ${o}`, 'small', COLORS.ink));

    const right = 330;
    addText(this, right, 64, '새 능력', 'bold', COLORS.ink);
    const abil = newAbilitiesAt(lv.id);
    let y = 82;
    for (const a of abil) {
      const t = addText(this, right + 8, y, `${a.name} [${a.keyHint}]
${a.description}`, 'small', COLORS.ink, { wordWrap: { width: 270, useAdvancedWrap: true }, lineSpacing: 2 });
      y += Math.ceil(t.height) + 4;
    }
    y += 6;
    addText(this, right, y, '시작 단서', 'bold', COLORS.ink);
    const clues = session.clues.list();
    addText(this, right + 8, y + 18, clues.length ? clues.map((c) => `· ${c.name}`).join('\n') : '없음', 'small', COLORS.ink, { lineSpacing: 2 });
  }

  private accept(): void {
    if (!this.ready) return;
    fadeTo(this, 'Level', { level: this.level.id });
  }

  private back(): void {
    this.scene.stop('Dialogue');
    setSession(null);
    fadeTo(this, 'LevelSelect');
  }
}
