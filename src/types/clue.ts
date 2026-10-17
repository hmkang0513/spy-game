// 단서 (04_상세설계서 §2.1)
export type ClueId = string;
export type ClueKind = 'person' | 'document' | 'item';

export interface ClueDef {
  id: ClueId;
  /** `[단서 필요: name]` 에 쓰이는 이름 */
  name: string;
  /** 수첩 탭 */
  kind: ClueKind;
  description: string;
  /** 출처 표시. 예: "미오에게서 / 블루 앵커 카운터" */
  source: string;
  /** 레벨 클리어 시 다음 레벨로 이월 (AC-24) */
  carryOver?: boolean;
  /** 클리어 필수가 아닌 단서 (수집률 계산에는 포함) */
  optional?: boolean;
}

/** 단서 연결 — a, b 순서 무관 (AC-23) */
export interface ClueCombo {
  a: ClueId;
  b: ClueId;
  result: ClueId;
}
