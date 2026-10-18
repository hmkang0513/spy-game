// O3 자물쇠 미니게임 (AC-42~45) — 월드는 계속 움직이고, Space 로 핀, Esc 로 그만둔다
import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { LockpickGame } from '../core';
import { ActionKeys } from '../input/bindings';
import { C, addText, drawPanel } from '../ui/theme';

export interface LockpickLaunch {
  pins: number;
  onMiss: () => void;
  onClose: (opened: boolean) => void;
}

const W = 240;
const H = 120;
const BAR_W = 200;

export class LockpickScene extends Phaser.Scene {
  private lock!: LockpickGame;
  private launch!: LockpickLaunch;
  private g!: Phaser.GameObjects.Graphics;
  private status!: Phaser.GameObjects.Text;
  private keys!: ActionKeys;
  private finished = false;

  constructor() {
    super('Lockpick');
  }

  init(data: LockpickLaunch): void {
    this.launch = data;
    this.lock = new LockpickGame({ pins: data.pins });
    this.finished = false;
  }

  create(): void {
    // 모달 뒤 월드를 50% 어둡게
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, C.bgVoid, 0.5).setOrigin(0);
    const x = (GAME_WIDTH - W) / 2;
    const y = (GAME_HEIGHT - H) / 2;
    const panel = this.add.graphics();
    drawPanel(panel, 'glass', x, y, W, H);
    addText(this, x + 12, y + 10, '자물쇠', 'bold', COLORS.accent);
    addText(this, x + 12, y + H - 20, 'Space 맞추기   Esc 그만두기', 'tag', COLORS.textDim);
    this.status = addText(this, x + 12, y + 80, '', 'small', COLORS.text);
    this.g = this.add.graphics();
    this.keys = new ActionKeys(this, ['lockpickPress', 'pause']);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (!this.finished) this.launch.onClose(false);
    });
  }

  update(_t: number, deltaMs: number): void {
    if (this.finished) return;
    const lp = this.lock;
    lp.update(deltaMs / 1000);
    if (this.keys.pressed('pause')) return this.finish(false);
    if (this.keys.pressed('lockpickPress')) {
      const r = lp.press();
      if (r === 'done') return this.finish(true);
      if (r === 'miss') {
        this.status.setText('실패! 소리가 났다').setColor(COLORS.danger);
        this.cameras.main.shake(80, 0.004);
        this.launch.onMiss();
      } else this.status.setText('딸깍').setColor(COLORS.accent);
    }
    this.draw();
  }

  private draw(): void {
    const lp = this.lock;
    const x = (GAME_WIDTH - W) / 2;
    const y = (GAME_HEIGHT - H) / 2;
    const g = this.g.clear();
    // 핀 ● ○
    for (let i = 0; i < lp.pins; i++) {
      const px = x + 72 + i * 14;
      if (i < lp.pinsSet) g.fillStyle(C.accent, 1).fillCircle(px, y + 18, 4);
      else g.lineStyle(1, C.textDim, 1).strokeCircle(px, y + 18, 4);
    }
    // 막대 + 성공 구간 + 커서
    const bx = x + 20;
    const by = y + 48;
    g.fillStyle(C.bgVoid, 1).fillRect(bx, by, BAR_W, 12);
    g.fillStyle(C.accent2, 0.9).fillRect(bx + Math.round(lp.zoneStart * BAR_W), by, Math.max(2, Math.round(lp.zoneRatio * BAR_W)), 12);
    g.lineStyle(1, C.panelLine, 1).strokeRect(bx + 0.5, by + 0.5, BAR_W - 1, 11);
    const cx = bx + Math.round(lp.cursor * BAR_W);
    g.fillStyle(C.text, 1).fillRect(cx - 1, by - 4, 2, 20);
    g.fillTriangle(cx - 4, by - 6, cx + 4, by - 6, cx, by - 2);
  }

  private finish(opened: boolean): void {
    this.finished = true;
    this.launch.onClose(opened);
    this.scene.stop();
  }
}
