// 잠입 HUD (03 §3) — 경보 띠, 목표, 노출도, 능력 바, 수첩 버튼, 토스트, 붙잡힘 도장
import Phaser from 'phaser';
import { COLORS, DEFAULT_ALERT_TIMINGS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { AlertState, Exposure, GameEvents, LevelId } from '../types';
import { Subscriptions } from '../state/events';
import { abilitiesFor, getLevel } from '../state/content';
import { currentSession } from '../state/session';
import { gameState } from '../state/game';
import { C, addText, drawPanel } from '../ui/theme';
import type { LevelScene } from './LevelScene';

const ALERT_LOOK: Record<AlertState, { label: string; color: number; text: string; icon: string }> = {
  calm: { label: '평시', color: C.panelGlass, text: COLORS.text, icon: '○' },
  suspicious: { label: '의심', color: C.cone, text: COLORS.ink, icon: '◇?' },
  alert: { label: '경보', color: C.danger, text: '#FFFFFF', icon: '△!' },
  search: { label: '수색', color: C.suspicion, text: COLORS.ink, icon: '⌕' },
  caution: { label: '주의', color: 0xf5e6a0, text: COLORS.ink, icon: '⧗' },
};
/** 능력 바 슬롯의 짧은 키 라벨 (03 리드 정리) */
const SLOT_KEY: Record<string, string> = { talk: 'E', crouch: 'C', hide: 'E', lockpick: 'E', coin: 'G' };
const EXPOSURE_LABEL: Record<Exposure, string> = { hidden: '숨음', safe: '안전', exposed: '노출' };
const TOAST_COLOR: Record<GameEvents['toast']['kind'], number> = { clue: C.accent, objective: C.accent2, info: C.panelLine, warn: C.danger };

interface Toast {
  box: Phaser.GameObjects.Container;
  ttl: number;
}

export class HUDScene extends Phaser.Scene {
  private level!: LevelId;
  private subs = new Subscriptions();
  private band!: Phaser.GameObjects.Graphics;
  private bandText!: Phaser.GameObjects.Text;
  private alertState: AlertState = 'calm';
  private objective!: Phaser.GameObjects.Text;
  private exposureG!: Phaser.GameObjects.Graphics;
  private exposureText!: Phaser.GameObjects.Text;
  private exposure: Exposure = 'safe';
  private vignette!: Phaser.GameObjects.Graphics;
  private abilityG!: Phaser.GameObjects.Graphics;
  private abilityTexts: Phaser.GameObjects.Text[] = [];
  private badge!: Phaser.GameObjects.Text;
  private toasts: Toast[] = [];
  private t = 0;
  private stealthHud = false;
  private badgeCount = -1;

  constructor() {
    super('HUD');
  }

  init(data: { level: LevelId }): void {
    this.level = data.level;
    this.toasts = [];
    this.abilityTexts = [];
    this.badgeCount = -1;
    this.alertState = 'calm';
    this.exposure = 'safe';
  }

  create(): void {
    // 잠입 HUD(경보 띠·노출도)는 경비가 활성인 레벨에서만 (03 §2 S4)
    this.stealthHud = getLevel(this.level).guardsActive;
    this.vignette = this.add.graphics().setVisible(false);
    this.drawVignette();
    this.band = this.add.graphics();
    this.bandText = addText(this, 8, 2, '', 'small');
    this.objective = addText(this, 8, this.stealthHud ? 20 : 6, '', 'small', COLORS.text, {
      backgroundColor: 'rgba(14,16,36,0.7)',
      padding: { x: 4, y: 2 },
      wordWrap: { width: 280, useAdvancedWrap: true },
    });
    this.exposureG = this.add.graphics();
    this.exposureText = addText(this, 36, GAME_HEIGHT - 22, '', 'small');
    this.abilityG = this.add.graphics();
    this.buildNotebookButton();
    this.buildAbilityBar();

    this.subs.on('objective:changed', ({ current, completed }) => {
      if (completed) this.toast('objective', `목표 달성: ${completed.text}`);
      this.setObjective(current?.text ?? '');
    });
    this.subs.on('clue:added', ({ clue }) => this.toast('clue', `단서 획득: ${clue.name}`));
    this.subs.on('toast', ({ kind, text }) => this.toast(kind, text));
    this.subs.on('checkpoint:saved', () => this.toast('info', '체크포인트'));
    this.subs.on('alert:changed', ({ state }) => this.setAlert(state));
    this.subs.on('exposure:changed', ({ exposure }) => this.setExposure(exposure));
    this.subs.on('coins:changed', () => this.buildAbilityBar());
    this.subs.on('player:caught', ({ by }) => this.caughtStamp(by));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.subs.clear());

    this.setObjective(currentSession()?.currentObjective?.text ?? '');
    this.bandText.setVisible(this.stealthHud);
    this.exposureText.setVisible(this.stealthHud);
    this.setAlert('calm');
    this.setExposure('safe');
    if (!gameState.store.available) this.toast('warn', '저장할 수 없는 환경입니다. 진행이 저장되지 않습니다.');
  }

  update(_t: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.t += dt;
    this.drawBand();
    this.drawExposure();
    const unseen = currentSession()?.unseen.size ?? 0;
    if (unseen !== this.badgeCount) {
      this.badgeCount = unseen;
      this.badge.setText(unseen > 0 ? String(unseen) : '').setVisible(unseen > 0);
    }
    this.updateToasts(dt);
  }

  // ── 경보 띠 (AC-32) ──
  private setAlert(state: AlertState): void {
    this.alertState = state;
    const look = ALERT_LOOK[state];
    this.bandText.setText(`${look.icon} ${look.label}`).setColor(look.text);
  }

  private drawBand(): void {
    const g = this.band.clear();
    if (!this.stealthHud) return;
    const look = ALERT_LOOK[this.alertState];
    const flashOff = this.alertState === 'alert' && !gameState.settings.reduceFlash && Math.floor(this.t / 0.2) % 2 === 1;
    g.fillStyle(look.color, this.alertState === 'calm' ? 0.75 : flashOff ? 0.6 : 0.95).fillRect(0, 0, GAME_WIDTH, 16);
    // 수색·주의는 남은 시간 막대
    const level = this.scene.get('Level') as LevelScene | null;
    const tis = level?.stealth?.alert.timeInState ?? 0;
    const total = this.alertState === 'search' ? DEFAULT_ALERT_TIMINGS.searchSec : this.alertState === 'caution' ? DEFAULT_ALERT_TIMINGS.cautionSec : 0;
    if (total > 0) {
      const w = Math.round(120 * Math.max(0, 1 - tis / total));
      g.fillStyle(C.bgVoid, 0.6).fillRect(80, 6, 120, 4);
      g.fillStyle(C.bgVoid, 1).fillRect(80, 6, w, 4);
    }
  }

  // ── 목표 (AC-07) ──
  private setObjective(text: string): void {
    this.objective.setText(text ? `목표 ▸ ${text}` : '').setVisible(Boolean(text));
    this.tweens.add({ targets: this.objective, alpha: 0.3, duration: 150, yoyo: true, repeat: 1 });
  }

  // ── 노출도 (S2) ──
  private setExposure(e: Exposure): void {
    this.exposure = e;
    this.vignette.setVisible(e === 'hidden');
    this.exposureText.setText(EXPOSURE_LABEL[e]).setColor(e === 'exposed' ? COLORS.danger : COLORS.text);
  }

  private drawExposure(): void {
    const g = this.exposureG.clear();
    if (!this.stealthHud) return;
    const x = 8;
    const y = GAME_HEIGHT - 32;
    const e = this.exposure;
    const color = e === 'exposed' ? C.danger : e === 'safe' ? C.safe : C.textDim;
    const blink = e === 'exposed' && Math.floor(this.t * 4) % 2 === 0;
    g.fillStyle(C.panelGlass, 0.92).fillRect(x, y, 24, 24);
    g.lineStyle(1, blink ? C.danger : C.panelLine, 1).strokeRect(x + 0.5, y + 0.5, 23, 23);
    // 눈 모양: 감은 눈 / 반쯤 / 뜬 눈
    g.lineStyle(1, color, 1);
    if (e === 'hidden') g.lineBetween(x + 5, y + 12, x + 19, y + 12);
    else {
      const open = e === 'exposed' ? 6 : 3;
      g.strokeEllipse(x + 12, y + 12, 16, open * 2);
      g.fillStyle(color, 1).fillCircle(x + 12, y + 12, e === 'exposed' ? 3 : 2);
    }
  }

  private drawVignette(): void {
    const g = this.vignette;
    for (let i = 0; i < 12; i++) {
      g.lineStyle(4, C.bgVoid, 0.2 * (1 - i / 12));
      g.strokeRect(i * 4 + 2, i * 4 + 2, GAME_WIDTH - i * 8 - 4, GAME_HEIGHT - i * 8 - 4);
    }
  }

  // ── 능력 바 (해금된 것만) ──
  private buildAbilityBar(): void {
    this.abilityTexts.forEach((t) => t.destroy());
    this.abilityTexts = [];
    const g = this.abilityG.clear();
    const list = abilitiesFor(this.level).filter((a) => a.id !== 'move');
    const coins = currentSession()?.coins ?? 0;
    const size = 28;
    let x = GAME_WIDTH - 8 - list.length * (size + 4) + 4;
    const y = GAME_HEIGHT - 8 - size;
    for (const a of list) {
      const usable = a.id !== 'coin' || coins > 0;
      drawPanel(g, 'glass', x, y, size, size);
      const name = addText(this, x + size / 2, y + 6, a.name.slice(0, 2), 'small', usable ? COLORS.text : COLORS.textLocked).setOrigin(0.5, 0);
      const key = addText(this, x + 2, y - 11, SLOT_KEY[a.id] ?? '', 'tag', COLORS.accent);
      this.abilityTexts.push(name, key);
      if (a.id === 'coin') this.abilityTexts.push(addText(this, x + size - 3, y + size - 11, `×${coins}`, 'tag', COLORS.text).setOrigin(1, 0));
      x += size + 4;
    }
  }

  // ── 수첩 버튼 + 배지 (AC-20) ──
  private buildNotebookButton(): void {
    const x = GAME_WIDTH - 72;
    const y = this.stealthHud ? 20 : 4;
    const g = this.add.graphics();
    drawPanel(g, 'paper', x, y, 64, 16);
    const label = addText(this, x + 6, y + 2, '수첩 Tab', 'small', COLORS.ink);
    label.setInteractive({ useHandCursor: true }).on('pointerdown', () => (this.scene.get('Level') as LevelScene).openNotebook());
    this.badge = addText(this, x + 60, y - 4, '', 'tag', '#FFFFFF', { backgroundColor: COLORS.stamp, padding: { x: 2, y: 0 } }).setVisible(false);
  }

  // ── 토스트 (최대 3개) ──
  private toast(kind: GameEvents['toast']['kind'], text: string): void {
    const t = addText(this, 8, 4, text, 'small', COLORS.text);
    const w = Math.ceil(t.width) + 16;
    const g = this.add.graphics();
    drawPanel(g, 'glass', 0, 0, w, 20);
    g.fillStyle(TOAST_COLOR[kind], 1).fillRect(2, 2, 2, 16);
    const box = this.add.container(GAME_WIDTH - 8 - w, 0, [g, t]).setAlpha(0);
    this.tweens.add({ targets: box, alpha: 1, duration: 150 });
    this.toasts.push({ box, ttl: 2.65 });
    while (this.toasts.length > 3) this.toasts.shift()?.box.destroy();
    this.layoutToasts();
  }

  private layoutToasts(): void {
    const y0 = this.stealthHud ? 40 : 24;
    this.toasts.forEach((t, i) => t.box.setY(y0 + i * 24));
  }

  private updateToasts(dt: number): void {
    let changed = false;
    for (const t of this.toasts) {
      t.ttl -= dt;
      if (t.ttl < 0.2) t.box.setAlpha(Math.max(0, t.ttl / 0.2));
    }
    while (this.toasts[0] && this.toasts[0].ttl <= 0) {
      this.toasts.shift()?.box.destroy();
      changed = true;
    }
    if (changed) this.layoutToasts();
  }

  /** 붙잡힘 도장 (03 §6) */
  private caughtStamp(by: string): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const g = this.add.graphics();
    drawPanel(g, 'stamp', cx - 50, cy - 22, 100, 44);
    const t = addText(this, cx, cy - 10, '발각', 'title', COLORS.stamp).setOrigin(0.5, 0);
    const level = this.scene.get('Level') as LevelScene;
    const catchLine = level.stealth.guards.find((g) => g.id === by)?.def.catchLine ?? '';
    const line = addText(this, cx, cy + 30, catchLine, 'small', COLORS.text).setOrigin(0.5, 0);
    const box = this.add.container(0, 0, [g, t, line]).setAlpha(0);
    this.time.delayedCall(450, () => box.setAlpha(1));
  }
}
