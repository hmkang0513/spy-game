// 대화 진행 엔진과 대화 데이터 검증 (04_상세설계서 §3.5, AC-14~19)
import type {
  ChoiceView,
  ClueId,
  Condition,
  Dialogue,
  DialogueContext,
  DialogueMode,
  DialogueNode,
  DialogueView,
  Effect,
} from '../types';

export type { ChoiceView, DialogueContext, DialogueMode, DialogueView } from '../types';

/** 조건 평가 — 모든 항목 AND. 조건이 없으면 true */
export function checkCondition(c: Condition | undefined, ctx: DialogueContext): boolean {
  if (!c) return true;
  return (
    (c.clues ?? []).every((id) => ctx.hasClue(id)) &&
    (c.notClues ?? []).every((id) => !ctx.hasClue(id)) &&
    (c.flags ?? []).every((f) => ctx.hasFlag(f)) &&
    (c.notFlags ?? []).every((f) => !ctx.hasFlag(f))
  );
}

export class DialogueRunner {
  private node: DialogueNode | null = null;
  private text = '';
  private effects: Effect[] = [];
  private visited: string[] = [];
  /** codeInput 노드별 오답 횟수 (이 대화 안에서만) */
  private wrongCounts = new Map<string, number>();
  /** codeInput 노드별 이전 대화까지의 누적 오답 (처음 읽은 값으로 고정) */
  private wrongBase = new Map<string, number>();

  constructor(
    private readonly dialogue: Dialogue,
    private readonly ctx: DialogueContext,
  ) {}

  /** entries 중 조건을 만족하는 첫 노드로 시작한다. 매칭이 없으면 Error. */
  start(): DialogueView {
    const entry = this.dialogue.entries.find((e) => checkCondition(e.when, this.ctx));
    if (!entry) throw new Error(`대화 ${this.dialogue.id}: 조건을 만족하는 시작 노드가 없다`);
    this.node = null;
    this.effects = [];
    this.visited = [];
    this.wrongCounts.clear();
    this.wrongBase.clear();
    return this.enter(entry.node);
  }

  /** 선형 진행. mode 'line' 이 아니면 현재 view 를 그대로 반환한다. */
  advance(): DialogueView {
    if (this.node?.next && this.mode() === 'line') return this.enter(this.node.next);
    return this.view();
  }

  /** 원본 choices 인덱스로 선택한다. 잠김·숨김·잘못된 인덱스면 현재 view 를 반환한다. */
  choose(index: number): DialogueView {
    if (!this.node || this.mode() !== 'choice') return this.view();
    const cv = this.choiceViews().find((c) => c.index === index);
    const choice = this.node.choices?.[index];
    if (!cv || cv.locked || !choice) return this.view();
    if (choice.effects) this.effects.push(...choice.effects);
    return this.enter(choice.next);
  }

  /** 단서 제시 (mode 'present'). 정답이면 success, 아니면 wrong 노드로 간다. */
  present(clue: ClueId): DialogueView {
    const req = this.node?.present;
    if (!req || this.mode() !== 'present') return this.view();
    return this.enter(req.accept.includes(clue) ? req.success : req.wrong);
  }

  /** 제시 취소 (계약 외 보조 API). present.cancel 이 있으면 그 노드로, 없으면 대화를 끝낸다. */
  cancelPresent(): DialogueView {
    const req = this.node?.present;
    if (!req || this.mode() !== 'present') return this.view();
    if (req.cancel) return this.enter(req.cancel);
    this.node = null;
    return this.view();
  }

  /** 번호 입력 (mode 'code'). 오답이 maxWrong 회에 이르면 onMaxWrong 노드로 간다. */
  submitCode(code: string): DialogueView {
    const node = this.node;
    const req = node?.codeInput;
    if (!node || !req || this.mode() !== 'code') return this.view();
    if (code.trim() === req.answer.trim()) return this.enter(req.success);
    // 오답 횟수 = 대화 시작 시점의 누적(ctx) + 이번 대화 (대화를 다시 열어도 한도 유지).
    // 세션은 codeWrong 효과를 대화 도중에 바로 누적하므로, ctx 값은 처음 한 번만 읽어 고정한다.
    if (!this.wrongBase.has(node.id)) this.wrongBase.set(node.id, this.ctx.codeWrongCount?.(node.id) ?? 0);
    const local = (this.wrongCounts.get(node.id) ?? 0) + 1;
    this.wrongCounts.set(node.id, local);
    this.effects.push({ type: 'codeWrong', node: node.id });
    const total = (this.wrongBase.get(node.id) ?? 0) + local;
    return this.enter(total >= req.maxWrong ? req.onMaxWrong : req.wrong);
  }

  /** 누적된 효과(선택지 → 노드 진입 순)를 꺼내고 비운다. */
  drainEffects(): Effect[] {
    const out = this.effects;
    this.effects = [];
    return out;
  }

  /** 이번 대화에서 방문한 노드 id (첫 방문 순서) */
  visitedNodes(): string[] {
    return [...this.visited];
  }

  private isVisited(id: string): boolean {
    return this.ctx.isVisited(id) || this.visited.includes(id);
  }

  private enter(id: string): DialogueView {
    const node = this.dialogue.nodes[id];
    if (!node) throw new Error(`대화 ${this.dialogue.id}: 없는 노드 '${id}'`);
    this.text = this.isVisited(id) && node.summaryText ? node.summaryText : node.text;
    if (!this.visited.includes(id)) this.visited.push(id);
    if (node.effects) this.effects.push(...node.effects);
    this.node = node;
    return this.view();
  }

  private choiceViews(): ChoiceView[] {
    const views: ChoiceView[] = [];
    (this.node?.choices ?? []).forEach((c, index) => {
      if (!checkCondition(c.showIf, this.ctx)) return;
      const missing = (c.requires ?? []).filter((id) => !this.ctx.hasClue(id));
      views.push({ index, text: c.text, locked: missing.length > 0, missing, visited: this.isVisited(c.next) });
    });
    return views;
  }

  private mode(): DialogueMode {
    const n = this.node;
    if (!n) return 'end';
    if (n.codeInput) return 'code';
    if (n.present) return 'present';
    if (this.choiceViews().length > 0) return 'choice';
    if (n.next) return 'line';
    return 'end';
  }

  private view(): DialogueView {
    const n = this.node;
    if (!n) return { nodeId: '', speaker: '', text: '', mode: 'end', choices: [] };
    const mode = this.mode();
    return {
      nodeId: n.id,
      speaker: n.speaker,
      text: this.text,
      mode,
      choices: mode === 'choice' ? this.choiceViews() : [],
    };
  }
}

/**
 * 대화 데이터를 검증해 오류 메시지 목록을 반환한다 (빈 배열 = 정상, AC-18).
 * 검사: 없는 노드 참조, 시작 노드에서 도달 불가한 노드, 미정의 단서, 빈 choices·accept, 키/id 불일치.
 */
export function validateDialogue(d: Dialogue, knownClues: ClueId[]): string[] {
  const errors: string[] = [];
  const known = new Set(knownClues);
  const p = `[${d.id}]`;
  const exists = (id: string): boolean => Object.prototype.hasOwnProperty.call(d.nodes, id);

  const checkTarget = (where: string, target: string | undefined): void => {
    if (target !== undefined && !exists(target)) errors.push(`${p} ${where}: 없는 노드 '${target}'`);
  };
  const checkClues = (where: string, ids: ClueId[] | undefined): void => {
    for (const id of ids ?? []) if (!known.has(id)) errors.push(`${p} ${where}: 미정의 단서 '${id}'`);
  };
  const checkCond = (where: string, c: Condition | undefined): void => {
    checkClues(where, c?.clues);
    checkClues(where, c?.notClues);
  };
  const checkEffects = (where: string, effects: Effect[] | undefined): void => {
    for (const e of effects ?? []) if (e.type === 'giveClue') checkClues(where, [e.clue]);
  };

  if (d.entries.length === 0) errors.push(`${p} entries 가 비어 있다`);
  d.entries.forEach((e, i) => {
    checkTarget(`entries[${i}]`, e.node);
    checkCond(`entries[${i}].when`, e.when);
  });

  for (const [key, n] of Object.entries(d.nodes)) {
    const w = `노드 '${key}'`;
    if (n.id !== key) errors.push(`${p} ${w}: 키와 id 가 다르다 ('${n.id}')`);
    checkTarget(`${w}.next`, n.next);
    checkEffects(`${w}.effects`, n.effects);
    if (n.choices) {
      if (n.choices.length === 0) errors.push(`${p} ${w}: choices 가 비어 있다`);
      n.choices.forEach((c, i) => {
        const cw = `${w}.choices[${i}]`;
        checkTarget(cw, c.next);
        checkClues(`${cw}.requires`, c.requires);
        checkCond(`${cw}.showIf`, c.showIf);
        checkEffects(`${cw}.effects`, c.effects);
      });
    }
    if (n.present) {
      if (n.present.accept.length === 0) errors.push(`${p} ${w}.present: accept 가 비어 있다`);
      checkClues(`${w}.present.accept`, n.present.accept);
      checkTarget(`${w}.present.success`, n.present.success);
      checkTarget(`${w}.present.wrong`, n.present.wrong);
      checkTarget(`${w}.present.cancel`, n.present.cancel);
    }
    if (n.codeInput) {
      checkTarget(`${w}.codeInput.success`, n.codeInput.success);
      checkTarget(`${w}.codeInput.wrong`, n.codeInput.wrong);
      checkTarget(`${w}.codeInput.onMaxWrong`, n.codeInput.onMaxWrong);
    }
  }

  // 도달 가능성: 모든 entries 에서 BFS
  const reached = new Set<string>();
  const queue = d.entries.map((e) => e.node).filter(exists);
  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (reached.has(id)) continue;
    reached.add(id);
    const n = d.nodes[id];
    if (!n) continue;
    const targets = [
      n.next,
      ...(n.choices ?? []).map((c) => c.next),
      n.present?.success,
      n.present?.wrong,
      n.present?.cancel,
      n.codeInput?.success,
      n.codeInput?.wrong,
      n.codeInput?.onMaxWrong,
    ];
    for (const t of targets) if (t !== undefined && exists(t) && !reached.has(t)) queue.push(t);
  }
  for (const key of Object.keys(d.nodes)) {
    if (!reached.has(key)) errors.push(`${p} 노드 '${key}': 시작 노드에서 도달할 수 없다`);
  }
  return errors;
}
