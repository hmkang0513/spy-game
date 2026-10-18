// O1 대화 오버레이 — 초상·이름·타자기·선택지·단서 제시·번호 입력 (AC-12~19, 03 §2 O1)
import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { DialogueRunner } from '../core';
import type { ChoiceView, ClueId, Dialogue, DialogueView } from '../types';
import { ActionKeys } from '../input/bindings';
import type { LevelSession } from '../state/session';
import { character, clueName } from '../state/content';
import { gameState } from '../state/game';
import { notebook } from '../dom/ClueNotebook';
import { makePortrait } from '../ui/portrait';
import { C, addText, drawPanel } from '../ui/theme';

export interface DialogueLaunch {
  dialogue: Dialogue;
  session: LevelSession;
  /** 경비 캐릭터(guard_*) 화자를 이 캐릭터로 바꿔 보여 준다 (검문 대화) */
  guardSpeaker?: string;
  onEnd?: () => void;
}

const BOX_X = 8;
const BOX_W = 624;
const BOX_BOTTOM = 352;
const TEXT_W = 580;
const LINE = 16;
const MAX_LINES = 3;
const SPEED: Record<string, number> = { slow: 25, normal: 40, fast: 80, instant: Infinity };

export class DialogueScene extends Phaser.Scene {
  private runner!: DialogueRunner;
  private session!: LevelSession;
  private onEnd?: () => void;
  private guardSpeaker?: string;
  view: DialogueView | null = null;

  private panel!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private footer!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private portrait: Phaser.GameObjects.Container | null = null;
  private logText: Phaser.GameObjects.Text | null = null;
  private keys!: ActionKeys;

  private pages: string[][] = [];
  private page = 0;
  private shown = 0;
  private typeTimer = 0;
  private selected = 0;
  private code = '';
  private closing = false;

  constructor() {
    super('Dialogue');
  }

  init(data: DialogueLaunch): void {
    this.session = data.session;
    this.onEnd = data.onEnd;
    this.guardSpeaker = data.guardSpeaker;
    this.runner = new DialogueRunner(data.dialogue, data.session.dialogueContext());
    this.closing = false;
    this.choiceTexts = [];
    this.portrait = null;
    this.logText = null;
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, C.bgVoid, 0.3).setOrigin(0);
    this.panel = this.add.graphics();
    this.nameText = addText(this, BOX_X + 16, 0, '', 'bold', COLORS.accent2);
    this.bodyText = addText(this, BOX_X + 16, 0, '', 'body', COLORS.text, { wordWrap: { width: TEXT_W, useAdvancedWrap: true } });
    this.footer = addText(this, BOX_X + BOX_W - 12, BOX_BOTTOM - 14, '', 'tag', COLORS.textDim).setOrigin(1, 0);
    this.hintText = addText(this, BOX_X + 16, 0, '', 'tag', COLORS.accent).setVisible(false);
    this.keys = new ActionKeys(this, ['advance', 'choice1', 'choice2', 'choice3', 'choice4', 'notebook', 'log', 'pause', 'up', 'down']);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (p.leftButtonDown() && !this.hitChoice(p)) this.onAdvance();
    });
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onCodeKey(e));
    // 바깥에서 멈춰도(붙잡힘 등) 수첩을 함께 닫는다
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.closing = true;
      notebook.close();
    });
    this.show(this.runner.start());
  }

  // ── 진행 ──
  private show(raw: DialogueView): void {
    const v = this.guardSpeaker && raw.speaker.startsWith('guard') ? { ...raw, speaker: this.guardSpeaker } : raw;
    this.session.applyEffects(this.runner.drainEffects());
    this.runner.visitedNodes().forEach((n) => this.session.visited.add(n));
    this.view = v;
    if (v.mode === 'end' && !v.text) {
      this.close();
      return;
    }
    if (v.text) this.session.log.push(`${this.speakerName(v.speaker) || '·'}: ${v.text}`);
    this.selected = Math.max(0, v.choices.findIndex((c) => !c.locked));
    this.code = '';
    this.hintText.setVisible(false);
    this.layout(v);
  }

  private layout(v: DialogueView): void {
    this.bodyText.setText('');
    const lines = this.bodyText.getWrappedText(v.text);
    this.pages = [];
    for (let i = 0; i < lines.length; i += MAX_LINES) this.pages.push(lines.slice(i, i + MAX_LINES));
    if (this.pages.length === 0) this.pages.push(['']);
    this.page = 0;
    this.startPage();
  }

  private startPage(): void {
    this.shown = SPEED[gameState.settings.textSpeed] === Infinity ? Number.MAX_SAFE_INTEGER : 0;
    this.typeTimer = 0;
    this.redraw();
  }

  private get pageText(): string {
    return (this.pages[this.page] ?? []).join('\n');
  }

  private get typing(): boolean {
    return this.shown < this.pageText.length;
  }

  private get lastPage(): boolean {
    return this.page >= this.pages.length - 1;
  }

  /** 상자·초상·선택지 다시 그리기 */
  private redraw(): void {
    const v = this.view;
    if (!v) return;
    const showChoices = !this.typing && this.lastPage && v.mode === 'choice';
    const showCode = !this.typing && this.lastPage && v.mode === 'code';
    const textLines = Math.max(1, this.pages[this.page]?.length ?? 1);
    const extra = showChoices ? v.choices.length * LINE + 4 : showCode ? 28 : 0;
    const h = 12 + LINE + textLines * LINE + extra + 22;
    const top = BOX_BOTTOM - h;
    this.panel.clear();
    drawPanel(this.panel, 'glass', BOX_X, top, BOX_W, h);

    const name = this.speakerName(v.speaker);
    this.nameText.setText(name).setY(top + 8);
    this.bodyText.setY(top + 8 + LINE).setText(this.pageText.slice(0, this.shown));
    this.setPortrait(v.speaker, top);

    this.choiceTexts.forEach((t) => t.destroy());
    this.choiceTexts = [];
    const y0 = top + 8 + LINE + textLines * LINE + 4;
    if (showChoices) v.choices.forEach((c, i) => this.choiceTexts.push(this.makeChoice(c, i, y0 + i * LINE)));
    if (showCode) this.drawCode(y0);
    this.hintText.setY(top - 14);

    let footer: string;
    if (this.typing) footer = '';
    else if (showChoices) footer = '1~4 선택   L 로그';
    else if (v.mode === 'present' && this.lastPage) footer = '[단서 제시 Tab]  ▼ Space';
    else if (showCode) footer = '숫자 4자리 · Enter 입력 · Esc 취소';
    else footer = '▼ Space';
    this.footer.setText(footer).setY(BOX_BOTTOM - 14);
  }

  private makeChoice(c: ChoiceView, i: number, y: number): Phaser.GameObjects.Text {
    const sel = i === this.selected;
    let label = `${i + 1}. ${c.text}`;
    let color: string = sel ? COLORS.accent : COLORS.text;
    if (c.locked) {
      // 잠긴 선택지: 회색 + [단서 필요: X] (AC-15)
      label = `${i + 1}. ${c.text}  [단서 필요: ${c.missing.map(clueName).join(', ')}]`;
      color = COLORS.textLocked;
    } else if (c.visited) {
      label += ' ✓';
      if (!sel) color = COLORS.textDim;
    }
    const t = addText(this, BOX_X + 24, y, label, 'body', color);
    if (sel && !c.locked) addMarker(this, t);
    t.setInteractive({ useHandCursor: !c.locked });
    t.setData('choice', i);
    return t;
  }

  private drawCode(y: number): void {
    for (let i = 0; i < 4; i++) {
      const x = BOX_X + 24 + i * 22;
      this.panel.fillStyle(C.bgVoid, 1).fillRect(x, y, 18, 22);
      this.panel.lineStyle(1, i === this.code.length ? C.accent : C.panelLine, 1).strokeRect(x + 0.5, y + 0.5, 17, 21);
      const ch = this.code[i];
      if (ch) this.choiceTexts.push(addText(this, x + 5, y + 4, ch, 'title', COLORS.accent));
    }
  }

  private setPortrait(speaker: string, top: number): void {
    this.portrait?.destroy();
    this.portrait = null;
    if (speaker === 'narrator') return;
    const id = speaker === 'player' ? this.session.level.player.character : speaker;
    this.portrait = makePortrait(this, id, BOX_X + 8, top - 66);
  }

  private speakerName(speaker: string): string {
    if (speaker === 'narrator') return '';
    if (speaker === 'player') return character(this.session.level.player.character)?.name ?? '모스';
    return character(speaker)?.name ?? speaker;
  }

  update(_t: number, deltaMs: number): void {
    if (this.closing) return;
    if (this.typing) {
      const speed = SPEED[gameState.settings.textSpeed] ?? 40;
      this.typeTimer += deltaMs / 1000;
      const prev = this.shown;
      while (this.typing && this.typeTimer >= 1 / speed) {
        this.typeTimer -= 1 / speed;
        this.shown += 1;
        // 문장부호 뒤 120ms 쉼
        if ('.?!'.includes(this.pageText[this.shown - 1] ?? '')) {
          this.typeTimer -= 0.12;
          break;
        }
      }
      if (this.shown !== prev) {
        if (this.typing) this.bodyText.setText(this.pageText.slice(0, this.shown));
        else this.redraw();
      }
    }
    this.handleKeys();
  }

  private handleKeys(): void {
    const k = this.keys;
    if (k.pressed('pause')) {
      if (this.view?.mode === 'code' && !this.typing) this.close();
      else this.openPause();
      return;
    }
    if (k.pressed('log')) this.toggleLog();
    if (this.view?.mode === 'code' && !this.typing) return; // 숫자는 onCodeKey 에서
    if (k.pressed('notebook') && this.view?.mode === 'present' && this.lastPage) this.openPresent();
    const choices = this.view?.mode === 'choice' && !this.typing && this.lastPage ? this.view.choices : null;
    if (choices) {
      (['choice1', 'choice2', 'choice3', 'choice4'] as const).forEach((a, i) => k.pressed(a) && this.pick(i));
      if (k.pressed('up')) this.moveSel(-1);
      if (k.pressed('down')) this.moveSel(1);
    }
    if (k.pressed('advance')) this.onAdvance();
  }

  private moveSel(d: number): void {
    const n = this.view?.choices.length ?? 0;
    if (n === 0) return;
    this.selected = (this.selected + d + n) % n;
    this.redraw();
  }

  private hitChoice(p: Phaser.Input.Pointer): boolean {
    const t = this.choiceTexts.find((c) => c.getData('choice') !== undefined && c.getBounds().contains(p.x, p.y));
    if (!t) return false;
    this.pick(t.getData('choice') as number);
    return true;
  }

  /** 화면에 보이는 i 번째 선택지 */
  private pick(i: number): void {
    const c = this.view?.choices[i];
    if (!c) return;
    this.selected = i;
    if (c.locked) {
      this.shakeLocked(i);
      return;
    }
    this.show(this.runner.choose(c.index));
  }

  private shakeLocked(i: number): void {
    const t = this.choiceTexts[i];
    if (t) this.tweens.add({ targets: t, x: t.x + 3, duration: 20, yoyo: true, repeat: 1 });
    this.hintText.setText('수첩에서 단서를 찾아보세요').setVisible(true);
  }

  onAdvance(): void {
    const v = this.view;
    if (!v || this.closing) return;
    if (this.typing) {
      this.shown = this.pageText.length;
      this.redraw();
      return;
    }
    if (!this.lastPage) {
      this.page += 1;
      this.startPage();
      return;
    }
    if (v.mode === 'line') this.show(this.runner.advance());
    else if (v.mode === 'end') this.close();
    else if (v.mode === 'present') this.openPresent();
    else if (v.mode === 'choice') this.pick(this.selected);
  }

  // ── 제시 (AC-17) ──
  private openPresent(): void {
    if (notebook.isOpen) return;
    const target = this.speakerName(this.view?.speaker ?? '');
    notebook.open({
      session: this.session,
      mode: 'present',
      target,
      onPresent: (id) => this.present(id),
      onClose: (presented) => {
        this.keys.reset();
        if (!presented && !this.closing) this.show(this.runner.cancelPresent());
      },
    });
  }

  present(id: ClueId): void {
    this.show(this.runner.present(id));
  }

  // ── 번호 입력 ──
  private onCodeKey(e: KeyboardEvent): void {
    if (this.view?.mode !== 'code' || this.typing || this.closing) return;
    if (/^\d$/.test(e.key) && this.code.length < 4) this.code += e.key;
    else if (e.key === 'Backspace') this.code = this.code.slice(0, -1);
    else if (e.key === 'Enter' && this.code.length === 4) {
      this.show(this.runner.submitCode(this.code));
      return;
    } else return;
    this.redraw();
  }

  submitCode(code: string): void {
    this.show(this.runner.submitCode(code));
  }

  /** 테스트 API 용: 표시 순서가 아니라 원본 인덱스로 선택 */
  chooseIndex(index: number): void {
    const i = this.view?.choices.findIndex((c) => c.index === index) ?? -1;
    if (i >= 0) this.pick(i);
  }

  /** 테스트 API 용: 타자기·페이지를 건너뛰고 다음으로 */
  advanceNow(): void {
    this.shown = this.pageText.length;
    this.page = this.pages.length - 1;
    this.shown = this.pageText.length;
    this.onAdvance();
  }

  // ── 로그 (L) ──
  private toggleLog(): void {
    if (this.logText) {
      this.logText.destroy();
      this.logText = null;
      return;
    }
    const lines = this.session.log.slice(-12).join('\n');
    this.logText = addText(this, 16, 16, lines || '(로그 없음)', 'small', COLORS.text, {
      backgroundColor: COLORS.panelGlass,
      padding: { x: 8, y: 6 },
      wordWrap: { width: 590, useAdvancedWrap: true },
      fixedWidth: 608,
    }).setDepth(10);
  }

  private openPause(): void {
    if (!this.scene.isActive('Level') || this.scene.isActive('Pause')) return;
    const lvl = this.session.level.id;
    this.scene.launch('Pause', { level: lvl });
    this.scene.bringToTop('Pause');
  }

  close(): void {
    if (this.closing) return;
    this.closing = true;
    notebook.close();
    this.view = null;
    this.scene.stop();
    this.onEnd?.();
  }
}

/** 선택된 선택지 앞 > */
function addMarker(scene: Phaser.Scene, t: Phaser.GameObjects.Text): void {
  const m = addText(scene, t.x - 10, t.y, '>', 'body', COLORS.accent);
  t.once(Phaser.GameObjects.Events.DESTROY, () => m.destroy());
}
