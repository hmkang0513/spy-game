// 능력 6종 (05_레벨설계서 능력 해금표, 01_요구사항정의서 §7 조작)
import type { AbilityDef, AbilityId, LevelId } from '../types';

export const ABILITIES: AbilityDef[] = [
  {
    id: 'move',
    name: '이동',
    description: '조용히, 그러나 당당하게 걷는다. 요원의 기본기.',
    keyHint: 'WASD / 방향키',
    level: 1,
  },
  {
    id: 'talk',
    name: '대화·단서 제시',
    description: '말을 걸고, 수첩의 단서를 내밀어 상대의 반응을 바꾼다.',
    keyHint: 'E 대화 · Tab 수첩',
    level: 1,
  },
  {
    id: 'crouch',
    name: '웅크리기',
    description: '몸을 낮춰 천천히 걷는다. 원뿔 끝 빗금 구역에서는 들키지 않는다.',
    keyHint: 'C 토글 / Shift 누르는 동안',
    level: 2,
  },
  {
    id: 'hide',
    name: '숨기',
    description: '커튼·화분·사물함·상자 옆에서 숨는다. 숨은 동안은 보이지 않는다.',
    keyHint: 'E (은신처 옆에서)',
    level: 2,
  },
  {
    id: 'lockpick',
    name: '자물쇠 따기',
    description: '표시기가 초록 구간에 올 때 핀을 맞춘다. 실패하면 딸깍, 소음이 난다.',
    keyHint: 'E 잠긴 문 · Space 핀 맞추기',
    level: 3,
  },
  {
    id: 'coin',
    name: '동전 던지기',
    description: '동전을 던져 소리로 경비를 유인한다. 던진 동전은 다시 줍지 못한다.',
    keyHint: 'G 조준 · 좌클릭 던지기 · 우클릭 취소',
    level: 3,
  },
];

/** 레벨 N 에서 사용 가능한 능력 (level <= N) */
export function abilitiesForLevel(level: LevelId): AbilityDef[] {
  return ABILITIES.filter((a) => a.level <= level);
}

/** 레벨 N 에서 새로 해금되는 능력 (브리핑 표시용) */
export function newAbilitiesForLevel(level: LevelId): AbilityDef[] {
  return ABILITIES.filter((a) => a.level === level);
}

export function isAbilityUnlocked(id: AbilityId, level: LevelId): boolean {
  return ABILITIES.some((a) => a.id === id && a.level <= level);
}
