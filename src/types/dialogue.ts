// 대화 (04_상세설계서 §2.3)
import type { ClueId } from './clue';

/** 모든 항목 AND */
export interface Condition {
  clues?: ClueId[];
  notClues?: ClueId[];
  flags?: string[];
  notFlags?: string[];
}

export type Effect =
  | { type: 'giveClue'; clue: ClueId }
  | { type: 'setFlag'; flag: string }
  | { type: 'giveCoins'; amount: number }
  | { type: 'completeObjective'; objective: string }
  /** L2 검문 무마 (AC-40) */
  | { type: 'excuseAccepted' }
  /** 금고 3회 오답 등 */
  | { type: 'triggerAlarm' }
  /** L1 접선 성공 등 */
  | { type: 'endLevel' }
  /** codeInput 오답 1회 — 세션이 누적해 대화를 다시 열어도 유지한다 (DialogueRunner 가 발생시킴) */
  | { type: 'codeWrong'; node: string };

export interface Choice {
  text: string;
  /** 다음 노드 id */
  next: string;
  /** 미충족 → 회색 + [단서 필요: X] (AC-15) */
  requires?: ClueId[];
  /** 미충족 → 아예 숨김 (스포일러 방지) */
  showIf?: Condition;
  effects?: Effect[];
}

export interface PresentRequest {
  /** 정답으로 인정하는 단서 */
  accept: ClueId[];
  success: string;
  /** 오답 반응 노드. 보통 다시 present 노드로 돌아온다 */
  wrong: string;
  cancel?: string;
}

export interface CodeInputRequest {
  answer: string;
  success: string;
  wrong: string;
  maxWrong: number;
  onMaxWrong: string;
}

export interface DialogueNode {
  id: string;
  /** CharacterId | 'player' | 'narrator' */
  speaker: string;
  text: string;
  /** 재방문 시 짧은 대사 (AC-19) */
  summaryText?: string;
  /** 노드 진입 시 적용 */
  effects?: Effect[];
  next?: string;
  choices?: Choice[];
  present?: PresentRequest;
  codeInput?: CodeInputRequest;
  // next / choices / present / codeInput 이 모두 없으면 대화 종료
}

export interface Dialogue {
  id: string;
  /** 위에서부터 첫 매칭 노드로 시작 */
  entries: { when?: Condition; node: string }[];
  nodes: Record<string, DialogueNode>;
}
