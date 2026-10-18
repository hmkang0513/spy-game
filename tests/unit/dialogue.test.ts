// U-DLG-* 대화 진행 (04 §3.5, AC-15~20)
import { describe, expect, it } from 'vitest';
import { DialogueRunner, validateDialogue } from '../../src/core';
import type { Dialogue, DialogueView } from '../../src/types';
import { KNOWN_CLUES, makeContext, makeDialogue } from './fixtures';

/** 시작 → menu(선택지) 까지 진행 */
function toMenu(r: DialogueRunner): DialogueView {
  let v = r.start();
  expect(v.mode).toBe('line');
  v = r.advance();
  expect(v.nodeId).toBe('menu');
  expect(v.mode).toBe('choice');
  return v;
}

describe('dialogue', () => {
  it('U-DLG-01 entries 조건별 시작 노드 (위에서부터 첫 매칭)', () => {
    expect(new DialogueRunner(makeDialogue(), makeContext()).start().nodeId).toBe('start');
    expect(new DialogueRunner(makeDialogue(), makeContext({ clues: ['C-KEY'] })).start().nodeId).toBe('withKey');
    // flag 'met' 이 더 위에 있으므로 우선
    expect(new DialogueRunner(makeDialogue(), makeContext({ clues: ['C-KEY'], flags: ['met'] })).start().nodeId).toBe('again');
  });

  it('U-DLG-01 매칭되는 entry 가 없으면 Error', () => {
    const d: Dialogue = { ...makeDialogue(), entries: [{ when: { flags: ['never'] }, node: 'start' }] };
    expect(() => new DialogueRunner(d, makeContext()).start()).toThrow();
  });

  it('U-DLG-01 view 모드: next=line, choices=choice, 끝=end', () => {
    const r = new DialogueRunner(makeDialogue(), makeContext());
    const v = r.start();
    expect(v).toMatchObject({ nodeId: 'start', speaker: 'npc', text: '처음 보는 얼굴이군.', mode: 'line' });
    const m = r.advance();
    expect(m.text).toBe('무엇을 원하지?');
    const end = r.choose(0);
    expect(end.nodeId).toBe('plain');
    expect(end.mode).toBe('end');
  });

  it('U-DLG-02 requires 미충족 → locked + missing, choose 무시', () => {
    const r = new DialogueRunner(makeDialogue(), makeContext());
    const v = toMenu(r);
    const secret = v.choices.find((c) => c.index === 1);
    expect(secret).toBeDefined();
    expect(secret!.locked).toBe(true);
    expect(secret!.missing).toEqual(['C-KEY']);
    expect(secret!.text).toBe('암호를 말한다');
    const free = v.choices.find((c) => c.index === 0)!;
    expect(free.locked).toBe(false);
    expect(free.missing).toEqual([]);
    // 잠긴 선택지를 고르면 현재 view 그대로
    const after = r.choose(1);
    expect(after.nodeId).toBe('menu');
    expect(after.mode).toBe('choice');
    expect(r.drainEffects()).toEqual([]);
  });

  it('U-DLG-02 showIf 미충족 선택지는 숨기되 index 는 원본 인덱스 유지', () => {
    const v = toMenu(new DialogueRunner(makeDialogue(), makeContext()));
    expect(v.choices.map((c) => c.index)).toEqual([0, 1, 3, 4]);
    const v2 = toMenu(new DialogueRunner(makeDialogue(), makeContext({ clues: ['C-HIDDEN'] })));
    expect(v2.choices.map((c) => c.index)).toEqual([0, 1, 2, 3, 4]);
  });

  it('U-DLG-03 단서 보유 시 같은 선택지 선택 가능', () => {
    const ctx = makeContext();
    const r = new DialogueRunner(makeDialogue(), ctx);
    toMenu(r);
    // 대화 도중 단서를 얻으면(예: 수첩 조합) 같은 선택지가 열린다
    ctx.clues.add('C-KEY');
    const r2 = new DialogueRunner(makeDialogue(), ctx);
    let v = r2.start();
    expect(v.nodeId).toBe('withKey');
    v = r2.advance();
    const secret = v.choices.find((c) => c.index === 1)!;
    expect(secret.locked).toBe(false);
    expect(secret.missing).toEqual([]);
    const s = r2.choose(1);
    expect(s.nodeId).toBe('secret');
    expect(r2.drainEffects()).toContainEqual({ type: 'giveClue', clue: 'C-B' });
  });

  it('U-DLG-04 present 정답 → success, 오답 → wrong 후 재시도', () => {
    const r = new DialogueRunner(makeDialogue(), makeContext({ clues: ['C-BADGE', 'C-X'] }));
    toMenu(r);
    let v = r.choose(3);
    expect(v.nodeId).toBe('ask');
    expect(v.mode).toBe('present');
    v = r.present('C-X');
    expect(v.nodeId).toBe('askWrong');
    v = r.advance();
    expect(v.nodeId).toBe('ask');
    expect(v.mode).toBe('present');
    v = r.present('C-BADGE');
    expect(v.nodeId).toBe('askOk');
    expect(r.drainEffects()).toContainEqual({ type: 'setFlag', flag: 'trusted' });
  });

  it('U-DLG-05 방문한 노드는 summaryText 사용', () => {
    const fresh = new DialogueRunner(makeDialogue(), makeContext()).start();
    expect(fresh.text).toBe('처음 보는 얼굴이군.');
    const again = new DialogueRunner(makeDialogue(), makeContext({ visited: ['start'] })).start();
    expect(again.nodeId).toBe('start');
    expect(again.text).toBe('또 왔군.');
    // summaryText 가 없는 노드는 방문해도 원문
    const r = new DialogueRunner(makeDialogue(), makeContext({ visited: ['start', 'menu'] }));
    r.start();
    expect(r.advance().text).toBe('무엇을 원하지?');
  });

  it('U-DLG-05 visitedNodes() 는 이번 대화에서 방문한 노드', () => {
    const r = new DialogueRunner(makeDialogue(), makeContext());
    toMenu(r);
    r.choose(0);
    expect(new Set(r.visitedNodes())).toEqual(new Set(['start', 'menu', 'plain']));
  });

  it('U-DLG-06 effects drain: 순서 유지(선택지 → 노드), 꺼낸 뒤 비움', () => {
    const r = new DialogueRunner(makeDialogue(), makeContext());
    toMenu(r);
    r.choose(0);
    expect(r.drainEffects()).toEqual([
      { type: 'setFlag', flag: 'asked' },
      { type: 'giveClue', clue: 'C-A' },
      { type: 'giveCoins', amount: 3 },
      { type: 'completeObjective', objective: 'obj1' },
    ]);
    expect(r.drainEffects()).toEqual([]);
  });

  it('U-DLG-07 codeInput 정답 → success', () => {
    const r = new DialogueRunner(makeDialogue(), makeContext());
    toMenu(r);
    const v = r.choose(4);
    expect(v.mode).toBe('code');
    const ok = r.submitCode('0321');
    expect(ok.nodeId).toBe('safeOpen');
    expect(r.drainEffects()).toContainEqual({ type: 'giveClue', clue: 'C-X' });
  });

  it('U-DLG-07 codeInput 오답 → wrong, 최대 오답(3) → onMaxWrong', () => {
    const r = new DialogueRunner(makeDialogue(), makeContext());
    toMenu(r);
    r.choose(4);
    for (let i = 0; i < 2; i++) {
      const w = r.submitCode('1111');
      expect(w.nodeId).toBe('safeWrong');
      const back = r.advance();
      expect(back.nodeId).toBe('safe');
      expect(back.mode).toBe('code');
    }
    const alarm = r.submitCode('0202');
    expect(alarm.nodeId).toBe('safeAlarm');
    expect(r.drainEffects()).toContainEqual({ type: 'triggerAlarm' });
  });

  it('U-DLG-07 오답 2회 후 정답이면 success', () => {
    const r = new DialogueRunner(makeDialogue(), makeContext());
    toMenu(r);
    r.choose(4);
    r.submitCode('1111');
    r.advance();
    r.submitCode('2222');
    r.advance();
    expect(r.submitCode('0321').nodeId).toBe('safeOpen');
  });

  it('U-DLG-07 오답마다 codeWrong 효과 (v1.1)', () => {
    const r = new DialogueRunner(makeDialogue(), makeContext());
    toMenu(r);
    r.choose(4);
    r.drainEffects();
    r.submitCode('9999');
    expect(r.drainEffects()).toContainEqual({ type: 'codeWrong', node: 'safe' });
    r.advance();
    r.submitCode('0321');
    expect(r.drainEffects()).not.toContainEqual({ type: 'codeWrong', node: 'safe' });
  });

  it('U-DLG-07 대화를 다시 열어도 3회 제한 유지 (codeWrongCount, v1.1)', () => {
    const ctx = makeContext();
    // 1번째 대화: 2회 오답 후 닫음. 세션 역할로 대화가 끝난 뒤 codeWrong 효과를 누적한다
    const r1 = new DialogueRunner(makeDialogue(), ctx);
    toMenu(r1);
    r1.choose(4);
    for (let i = 0; i < 2; i++) {
      expect(r1.submitCode('1111').nodeId).toBe('safeWrong');
      r1.advance();
    }
    for (const ef of r1.drainEffects()) {
      if (ef.type === 'codeWrong') ctx.codeWrong.set(ef.node, (ctx.codeWrong.get(ef.node) ?? 0) + 1);
    }
    expect(ctx.codeWrong.get('safe')).toBe(2);

    // 2번째 대화: 1회 더 틀리면 누적 3회 → onMaxWrong
    const r2 = new DialogueRunner(makeDialogue(), ctx);
    toMenu(r2);
    r2.choose(4);
    expect(r2.submitCode('2222').nodeId).toBe('safeAlarm');
    expect(r2.drainEffects()).toContainEqual({ type: 'triggerAlarm' });
  });

  it('U-DLG-07 codeWrongCount 가 없는 컨텍스트는 0 으로 본다', () => {
    const ctx = makeContext();
    const { codeWrongCount: _omit, ...noCount } = ctx;
    const r = new DialogueRunner(makeDialogue(), noCount);
    toMenu(r);
    r.choose(4);
    expect(r.submitCode('1111').nodeId).toBe('safeWrong');
  });

  it('U-DLG-08 validateDialogue: 올바른 대화는 오류 0', () => {
    expect(validateDialogue(makeDialogue(), KNOWN_CLUES)).toEqual([]);
  });

  it('U-DLG-08 끊긴 next 검출', () => {
    const d = makeDialogue();
    d.nodes.again = { ...d.nodes.again!, next: 'nowhere' };
    expect(validateDialogue(d, KNOWN_CLUES).length).toBeGreaterThan(0);
    const d2 = makeDialogue();
    d2.nodes.menu!.choices![0] = { text: 'x', next: 'missingNode' };
    expect(validateDialogue(d2, KNOWN_CLUES).length).toBeGreaterThan(0);
    const d3 = makeDialogue();
    d3.nodes.ask!.present = { accept: ['C-BADGE'], success: 'gone', wrong: 'askWrong' };
    expect(validateDialogue(d3, KNOWN_CLUES).length).toBeGreaterThan(0);
    const d4 = makeDialogue();
    d4.entries = [{ node: 'ghost' }];
    expect(validateDialogue(d4, KNOWN_CLUES).length).toBeGreaterThan(0);
  });

  it('U-DLG-08 도달 불가 노드 검출', () => {
    const d = makeDialogue();
    d.nodes.orphan = { id: 'orphan', speaker: 'npc', text: '아무도 안 오는 곳' };
    expect(validateDialogue(d, KNOWN_CLUES).length).toBeGreaterThan(0);
  });

  it('U-DLG-08 미정의 단서 검출 (requires / giveClue / present.accept)', () => {
    const known = KNOWN_CLUES.filter((c) => c !== 'C-KEY');
    expect(validateDialogue(makeDialogue(), known).length).toBeGreaterThan(0);
    const known2 = KNOWN_CLUES.filter((c) => c !== 'C-A');
    expect(validateDialogue(makeDialogue(), known2).length).toBeGreaterThan(0);
    const known3 = KNOWN_CLUES.filter((c) => c !== 'C-BADGE');
    expect(validateDialogue(makeDialogue(), known3).length).toBeGreaterThan(0);
  });
});
