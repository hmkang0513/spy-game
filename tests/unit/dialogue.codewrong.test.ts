import { describe, expect, it } from 'vitest';
import { DialogueRunner } from '../../src/core';
import type { Dialogue, DialogueContext } from '../../src/types';

// 금고 대화: 3회 오답이면 경보 노드
const safe: Dialogue = {
  id: 'safe',
  entries: [{ node: 'code' }],
  nodes: {
    code: {
      id: 'code',
      speaker: 'narrator',
      text: '번호를 입력한다.',
      codeInput: { answer: '0321', success: 'ok', wrong: 'code', maxWrong: 3, onMaxWrong: 'alarm' },
    },
    ok: { id: 'ok', speaker: 'narrator', text: '열렸다.' },
    alarm: { id: 'alarm', speaker: 'narrator', text: '경보!', effects: [{ type: 'triggerAlarm' }] },
  },
};

/** 실제 세션처럼 codeWrong 효과를 받는 즉시 누적하는 문맥 */
function sessionLike(): { ctx: DialogueContext; apply: (r: DialogueRunner) => void } {
  const counts = new Map<string, number>();
  const ctx: DialogueContext = {
    hasClue: () => false,
    hasFlag: () => false,
    isVisited: () => false,
    codeWrongCount: (n) => counts.get(n) ?? 0,
  };
  const apply = (r: DialogueRunner): void => {
    for (const e of r.drainEffects()) if (e.type === 'codeWrong') counts.set(e.node, (counts.get(e.node) ?? 0) + 1);
  };
  return { ctx, apply };
}

describe('codeInput 오답 집계 (리뷰 M4 회귀)', () => {
  it('효과를 매번 즉시 누적해도 오답을 이중으로 세지 않는다', () => {
    const { ctx, apply } = sessionLike();
    const r = new DialogueRunner(safe, ctx);
    r.start();
    apply(r);
    expect(r.submitCode('1111').nodeId).toBe('code');
    apply(r);
    expect(r.submitCode('2222').nodeId).toBe('code'); // 2회째에 경보가 울리면 안 된다
    apply(r);
    expect(r.submitCode('3333').nodeId).toBe('alarm');
  });

  it('대화를 닫았다 다시 열어도 누적 오답이 유지된다', () => {
    const { ctx, apply } = sessionLike();
    const first = new DialogueRunner(safe, ctx);
    first.start();
    first.submitCode('1111');
    apply(first);
    first.submitCode('2222');
    apply(first);

    const second = new DialogueRunner(safe, ctx);
    second.start();
    expect(second.submitCode('3333').nodeId).toBe('alarm');
  });
});
