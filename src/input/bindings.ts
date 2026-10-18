// 키 바인딩 테이블 (04_상세설계서 §5, 01 §7). 키 리맵 UI는 MVP 제외 — 테이블만 분리한다.
import Phaser from 'phaser';

export type Action =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'interact'
  | 'crouchToggle'
  | 'crouchHold'
  | 'notebook'
  | 'pause'
  | 'advance'
  | 'coinAim'
  | 'lockpickPress'
  | 'log'
  | 'choice1'
  | 'choice2'
  | 'choice3'
  | 'choice4';

/** Phaser KeyCode 이름 */
export const BINDINGS: Record<Action, string[]> = {
  up: ['W', 'UP'],
  down: ['S', 'DOWN'],
  left: ['A', 'LEFT'],
  right: ['D', 'RIGHT'],
  interact: ['E'],
  crouchToggle: ['C'],
  crouchHold: ['SHIFT'],
  notebook: ['TAB'],
  pause: ['ESC'],
  advance: ['SPACE', 'ENTER'],
  coinAim: ['G'],
  lockpickPress: ['SPACE'],
  log: ['L'],
  choice1: ['ONE', 'NUMPAD_ONE'],
  choice2: ['TWO', 'NUMPAD_TWO'],
  choice3: ['THREE', 'NUMPAD_THREE'],
  choice4: ['FOUR', 'NUMPAD_FOUR'],
};

type KeyCodeName = keyof typeof Phaser.Input.Keyboard.KeyCodes;

/**
 * 씬 하나에서 동작 단위로 키를 묻는 도우미.
 * 눌림은 keydown 이벤트로 기록한다 — 한 프레임 안에 눌렀다 떼도 놓치지 않게 (JustDown 은 놓친다).
 */
export class ActionKeys {
  private readonly keys = new Map<Action, Phaser.Input.Keyboard.Key[]>();
  private readonly codes = new Map<Action, number[]>();
  private readonly downs = new Set<number>();
  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.downs.add(e.keyCode);
  };
  private readonly onPostUpdate = (): void => this.downs.clear();

  constructor(
    private readonly scene: Phaser.Scene,
    actions: Action[],
  ) {
    const kb = scene.input.keyboard;
    if (!kb) return;
    for (const action of actions) {
      const codes = BINDINGS[action].map((name) => Phaser.Input.Keyboard.KeyCodes[name as KeyCodeName]);
      this.codes.set(action, codes);
      this.keys.set(action, codes.map((c) => kb.addKey(c)));
    }
    kb.on('keydown', this.onKeyDown);
    // 프레임이 끝나면 이번 프레임 기록을 비운다
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.onPostUpdate);
    // 씬이 끝나면 리스너를 떼어 재시작·재실행 때 쌓이지 않게 한다
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  destroy(): void {
    this.scene.input.keyboard?.off('keydown', this.onKeyDown);
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.onPostUpdate);
    for (const list of this.keys.values()) for (const k of list) this.scene.input.keyboard?.removeKey(k);
    this.keys.clear();
  }

  /** 누르고 있는 중 */
  down(action: Action): boolean {
    return (this.keys.get(action) ?? []).some((k) => k.isDown);
  }

  /** 이번 프레임에 눌림 (한 번만 true) */
  pressed(action: Action): boolean {
    return this.take(this.downs, action);
  }

  private take(set: Set<number>, action: Action): boolean {
    const hit = (this.codes.get(action) ?? []).find((c) => set.has(c));
    if (hit === undefined) return false;
    set.delete(hit);
    return true;
  }

  /** 눌린 상태 기록을 지운다 (오버레이를 닫은 직후 키가 이어서 먹지 않게) */
  reset(): void {
    this.downs.clear();
    for (const list of this.keys.values()) for (const k of list) k.reset();
  }
}
