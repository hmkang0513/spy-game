// 능력 (04_상세설계서 §2.2)
export type AbilityId = 'move' | 'talk' | 'crouch' | 'hide' | 'lockpick' | 'coin';

export interface AbilityDef {
  id: AbilityId;
  name: string;
  description: string;
  keyHint: string;
  /** 이 레벨부터 사용 가능 */
  level: 1 | 2 | 3;
}
