// 주인공 — 4방향 이동, 웅크리기, 숨기 (AC-08~11, 37~39)
import Phaser from 'phaser';
import { TUNING } from '../config';
import type { Facing, TilePos, Vec2 } from '../types';
import type { ActionKeys } from '../input/bindings';
import { C } from '../ui/theme';
import { animate, facingFromVector, makeActorSprite, placeActor, tileToFeet } from './actor';

export type HideState = 'none' | 'entering' | 'hidden' | 'leaving';

export class Player {
  /** 발밑 충돌 박스 20×12 (AC-11) */
  readonly body: Phaser.GameObjects.Zone;
  readonly sprite: Phaser.GameObjects.Sprite;
  facing: Facing;
  crouchToggled = false;
  crouched = false;
  hide: HideState = 'none';
  /** 대화·자물쇠·조준 중에는 이동 막음 */
  frozen = false;
  private hideTimer = 0;
  private returnPos: Vec2 | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly charId: string,
    spawn: TilePos,
    facing: Facing,
  ) {
    this.facing = facing;
    const feet = tileToFeet(spawn);
    this.body = scene.add.zone(feet.x, feet.y, 20, 12);
    scene.physics.add.existing(this.body);
    this.arcade.setCollideWorldBounds(true);
    this.sprite = makeActorSprite(scene, charId, feet, facing);
  }

  get arcade(): Phaser.Physics.Arcade.Body {
    return this.body.body as Phaser.Physics.Arcade.Body;
  }

  get feet(): Vec2 {
    return { x: this.body.x, y: this.body.y };
  }

  get hidden(): boolean {
    return this.hide === 'hidden' || this.hide === 'entering';
  }

  setFeet(p: Vec2): void {
    this.arcade.reset(p.x, p.y);
    placeActor(this.sprite, p);
  }

  update(keys: ActionKeys | null, canCrouch: boolean, dt: number): void {
    this.updateHide(dt);
    let vx = 0;
    let vy = 0;
    if (keys && !this.frozen && this.hide === 'none') {
      vx = (keys.down('right') ? 1 : 0) - (keys.down('left') ? 1 : 0);
      vy = (keys.down('down') ? 1 : 0) - (keys.down('up') ? 1 : 0);
      if (canCrouch && keys.pressed('crouchToggle')) this.crouchToggled = !this.crouchToggled;
      this.crouched = canCrouch && (this.crouchToggled || keys.down('crouchHold'));
    }
    const speed = this.crouched ? TUNING.crouchSpeed : TUNING.walkSpeed;
    const len = Math.hypot(vx, vy);
    // 대각선 정규화 (AC-08)
    this.arcade.setVelocity(len ? (vx / len) * speed : 0, len ? (vy / len) * speed : 0);
    this.facing = facingFromVector(vx, vy, this.facing);
    animate(this.sprite, this.charId, this.facing, len > 0);
    if (this.sprite.anims.isPlaying) this.sprite.anims.timeScale = this.crouched ? 0.6 : 1;
    this.sprite.setScale(1, this.crouched ? 0.85 : 1);
  }

  /** 물리 갱신 뒤 스프라이트를 따라 붙인다 */
  syncSprite(): void {
    placeActor(this.sprite, this.feet);
  }

  stop(): void {
    this.arcade.setVelocity(0, 0);
    animate(this.sprite, this.charId, this.facing, false);
  }

  /** 은신처로 들어간다 (0.3초, AC-39) */
  enterHide(spot: Vec2): void {
    if (this.hide !== 'none') return;
    this.returnPos = this.feet;
    this.hide = 'entering';
    this.hideTimer = TUNING.hideTransitionSec;
    this.stop();
    this.scene.tweens.add({ targets: this.sprite, alpha: 0.7, duration: TUNING.hideTransitionSec * 1000 });
    this.setFeet(spot);
    // 은신처 타일이 막힌 타일일 수 있으므로 숨은 동안 충돌을 끈다
    this.arcade.enable = false;
    this.sprite.setTint(C.ink).setTintMode(Phaser.TintModes.FILL);
  }

  leaveHide(): void {
    if (this.hide !== 'hidden') return;
    this.hide = 'leaving';
    this.hideTimer = TUNING.hideTransitionSec;
  }

  /** 붙잡힘 등으로 강제 해제 */
  resetHide(): void {
    this.hide = 'none';
    this.arcade.enable = true;
    this.sprite.clearTint().setAlpha(1);
  }

  private updateHide(dt: number): void {
    if (this.hide === 'none' || this.hide === 'hidden') return;
    this.hideTimer -= dt;
    if (this.hideTimer > 0) return;
    if (this.hide === 'entering') this.hide = 'hidden';
    else {
      if (this.returnPos) this.setFeet(this.returnPos);
      this.resetHide();
    }
  }
}
