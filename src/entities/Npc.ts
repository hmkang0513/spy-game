// NPC — 제자리에서 정해진 방향을 바라보고, E 로 대화를 시작한다 (AC-12)
import Phaser from 'phaser';
import type { NpcDef, Vec2 } from '../types';
import { animate, facingFromVector, makeActorSprite, tileToFeet } from './actor';

export class Npc {
  readonly pos: Vec2;
  readonly sprite: Phaser.GameObjects.Sprite;

  constructor(
    scene: Phaser.Scene,
    readonly def: NpcDef,
  ) {
    this.pos = tileToFeet(def.pos);
    this.sprite = makeActorSprite(scene, def.character, this.pos, def.facing);
  }

  /** 대화 중에는 플레이어 쪽을 본다 */
  faceToward(p: Vec2 | null): void {
    const facing = p ? facingFromVector(p.x - this.pos.x, p.y - this.pos.y, this.def.facing) : this.def.facing;
    animate(this.sprite, this.def.character, facing, false);
  }
}
