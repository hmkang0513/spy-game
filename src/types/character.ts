// 캐릭터 (04_상세설계서 §2.5)
export type CharacterId = string;

export interface CharacterDef {
  id: CharacterId;
  name: string;
  /** public/assets/characters/<sheet>.png 의 <sheet> */
  sheet: string;
  /** 초상 배경색 '#RRGGBB' */
  signatureColor: string;
}

/**
 * 스프라이트 시트 규격: 프레임 64×64, 4행 × 9열.
 * 행 순서 up, left, down, right / 열 0 = 정지, 1~8 = 걷기.
 */
export const SHEET_FRAME = 64;
export const SHEET_COLS = 9;
export const SHEET_ROWS = ['up', 'left', 'down', 'right'] as const;
