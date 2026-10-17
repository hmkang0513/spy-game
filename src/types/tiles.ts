// 타일·캐릭터 ID 계약 — 에셋 담당과 레벨 데이터 담당이 함께 쓴다 (04_상세설계서 §8)
import type { CharacterId } from './character';

/** 의미 단위 타일 이름. 에셋 담당이 레벨별 타일셋에서 각 이름의 프레임을 정한다. */
export type TileName =
  | 'void' // 맵 바깥 (검정)
  | 'wall' // 벽
  | 'wallWindow' // 창문 달린 벽
  | 'floorWood' // 나무 바닥
  | 'floorTile' // 타일·대리석 바닥
  | 'floorConcrete' // 콘크리트 (L3)
  | 'carpet' // 카펫
  | 'grass' // 잔디 (L2 정원)
  | 'dock' // 부두 나무 데크 (L1)
  | 'water' // 바다
  | 'door' // 열린 문 / 문틀 (통과 가능)
  | 'counter' // 카운터·바 (통과 불가, 시야 통과)
  | 'table' // 테이블
  | 'chair' // 의자 (통과 가능 장식)
  | 'shelf' // 책장·선반·캐비닛
  | 'plant' // 큰 화분
  | 'hedge' // 울타리·생울타리 (통과 불가, 시야 통과)
  | 'crate' // 상자 (L3)
  | 'machine' // 실험 장비 (L3)
  | 'locker' // 사물함
  | 'desk' // 책상
  | 'safe' // 금고
  | 'elevator'; // 화물 엘리베이터 바닥

export interface TileTraits {
  solid: boolean;
  opaque: boolean;
}

/** 이름별 충돌·시야 속성 (고정) */
export const TILE_TRAITS: Record<TileName, TileTraits> = {
  void: { solid: true, opaque: true },
  wall: { solid: true, opaque: true },
  wallWindow: { solid: true, opaque: true },
  floorWood: { solid: false, opaque: false },
  floorTile: { solid: false, opaque: false },
  floorConcrete: { solid: false, opaque: false },
  carpet: { solid: false, opaque: false },
  grass: { solid: false, opaque: false },
  dock: { solid: false, opaque: false },
  water: { solid: true, opaque: false },
  door: { solid: false, opaque: false },
  counter: { solid: true, opaque: false },
  table: { solid: true, opaque: false },
  chair: { solid: false, opaque: false },
  shelf: { solid: true, opaque: true },
  plant: { solid: true, opaque: true },
  hedge: { solid: true, opaque: false },
  crate: { solid: true, opaque: true },
  machine: { solid: true, opaque: true },
  locker: { solid: true, opaque: true },
  desk: { solid: true, opaque: false },
  safe: { solid: true, opaque: true },
  elevator: { solid: false, opaque: false },
};

/** ASCII 맵 문자 → 타일 이름 (모든 레벨 공통) */
export const TILE_CHARS: Record<string, TileName> = {
  ' ': 'void',
  '#': 'wall',
  W: 'wallWindow',
  '.': 'floorWood',
  ',': 'floorTile',
  ';': 'floorConcrete',
  _: 'carpet',
  '"': 'grass',
  '-': 'dock',
  '~': 'water',
  D: 'door',
  '=': 'counter',
  T: 'table',
  h: 'chair',
  B: 'shelf',
  P: 'plant',
  H: 'hedge',
  C: 'crate',
  M: 'machine',
  K: 'locker',
  d: 'desk',
  S: 'safe',
  E: 'elevator',
};

/** 레벨별 타일셋 키 → public/assets/tiles/<key>.png */
export const TILESETS = { 1: 'tiles_l1', 2: 'tiles_l2', 3: 'tiles_l3' } as const;

/** 캐릭터 ID 목록 (05_레벨설계서 NPC 표 기준) */
export const CHARACTER_IDS = [
  'moth_l1', // 주인공 L1 (트렌치코트)
  'moth_l2', // 주인공 L2 (파티 정장)
  'moth_l3', // 주인공 L3 (잠입복)
  'chief', // 체리 국장 (브리핑)
  'pepper', // L1 정보원
  'mio', // L1 바리스타
  'do_bosun', // L1 도 갑판장
  'lu', // L1 화가
  'police_l1', // L1 엔딩 순찰 경찰
  'bella', // L2 접수원
  'crane', // L2 오스왈드 크레인 대사
  'nari', // L2 비서
  'toby', // L2 웨이터
  'madame_crow', // L2 까마귀 부인
  'guard_l2_g1', // L2 정지 경비
  'guard_l2_g2', // L2 순찰 경비
  'guard_l2_g3', // L2 회전 경비
  'malsun', // L3 청소부
  'momo', // L3 연구원
  'bruno', // L3 경비대장 G6
  'guard_l3_g4', // L3 순찰 경비
  'guard_l3_g5', // L3 정지 경비
] as const satisfies readonly CharacterId[];
export type KnownCharacterId = (typeof CHARACTER_IDS)[number];
