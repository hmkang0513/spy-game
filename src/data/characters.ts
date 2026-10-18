// 캐릭터 정의 (05_레벨설계서 NPC 표 기준). 시트는 tools/build-characters.mjs 가 만든다.
// signatureColor 는 tools/characters.recipes.json 과 같은 값을 유지한다.
import type { CharacterDef, KnownCharacterId } from '../types';

const CHARACTER_TABLE = {
  moth_l1: { id: 'moth_l1', name: '모스', sheet: 'moth_l1', signatureColor: '#C8323C' },
  moth_l2: { id: 'moth_l2', name: '모스', sheet: 'moth_l2', signatureColor: '#C8323C' },
  moth_l3: { id: 'moth_l3', name: '모스', sheet: 'moth_l3', signatureColor: '#C8323C' },
  chief: { id: 'chief', name: '체리 국장', sheet: 'chief', signatureColor: '#7A4FA0' },
  pepper: { id: 'pepper', name: '페퍼', sheet: 'pepper', signatureColor: '#C9B48A' },
  mio: { id: 'mio', name: '미오', sheet: 'mio', signatureColor: '#E58FB4' },
  do_bosun: { id: 'do_bosun', name: '도 갑판장', sheet: 'do_bosun', signatureColor: '#E3B341' },
  lu: { id: 'lu', name: '루', sheet: 'lu', signatureColor: '#3E7CC9' },
  police_l1: { id: 'police_l1', name: '순찰 경찰', sheet: 'police_l1', signatureColor: '#2B3A67' },
  bella: { id: 'bella', name: '벨라', sheet: 'bella', signatureColor: '#2E6B4A' },
  crane: { id: 'crane', name: '오스왈드 크레인', sheet: 'crane', signatureColor: '#8C1C3C' },
  nari: { id: 'nari', name: '나리', sheet: 'nari', signatureColor: '#8A8D99' },
  toby: { id: 'toby', name: '토비', sheet: 'toby', signatureColor: '#D9C9A3' },
  madame_crow: { id: 'madame_crow', name: '까마귀 부인', sheet: 'madame_crow', signatureColor: '#4B3A5E' },
  guard_l2_g1: { id: 'guard_l2_g1', name: '경비 G1', sheet: 'guard_l2_g1', signatureColor: '#3A4466' },
  guard_l2_g2: { id: 'guard_l2_g2', name: '경비 G2', sheet: 'guard_l2_g2', signatureColor: '#2F2F38' },
  guard_l2_g3: { id: 'guard_l2_g3', name: '경비 G3', sheet: 'guard_l2_g3', signatureColor: '#4A5568' },
  malsun: { id: 'malsun', name: '말순 여사', sheet: 'malsun', signatureColor: '#A6CF5B' },
  momo: { id: 'momo', name: '모모', sheet: 'momo', signatureColor: '#E07A2E' },
  bruno: { id: 'bruno', name: '브루노', sheet: 'bruno', signatureColor: '#B3282D' },
  guard_l3_g4: { id: 'guard_l3_g4', name: '경비 G4', sheet: 'guard_l3_g4', signatureColor: '#7B8088' },
  guard_l3_g5: { id: 'guard_l3_g5', name: '경비 G5', sheet: 'guard_l3_g5', signatureColor: '#5F6B5A' },
} satisfies Record<KnownCharacterId, CharacterDef>;

/** 22종 캐릭터 정의 (키 = CHARACTER_IDS) */
export const CHARACTERS: Record<string, CharacterDef> = CHARACTER_TABLE;

/** ID 로 캐릭터 정의를 찾는다. 모르는 ID 면 예외. */
export function getCharacter(id: string): CharacterDef {
  const def = CHARACTERS[id];
  if (!def) throw new Error(`알 수 없는 캐릭터 ID: ${id}`);
  return def;
}
