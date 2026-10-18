// E-07 레벨 3: 단서 연결 → 금고 번호 → 칩 → 무음 경보 → 탈출 → Credits (06 §4.3)
import { expect, test } from '@playwright/test';
import type { Dialogue } from '../../src/types';
import {
  CHECKPOINT_KEY,
  closeDialogue,
  dialogue,
  drive,
  exitOf,
  expectScene,
  giveClue,
  levelData,
  openGame,
  readStorage,
  scene,
  startLevel,
  state,
  talkAt,
  useExit,
} from './helpers';
import { cluesGivenBy } from '../shared/levelMap';

test.describe.configure({ timeout: 180_000 });

/** 대화 안에서 requires 에 clue 가 들어간 선택지 문구 */
function choiceTextRequiring(d: Dialogue, clue: string): string | undefined {
  for (const n of Object.values(d.nodes)) for (const c of n.choices ?? []) if (c.requires?.includes(clue)) return c.text;
  return undefined;
}

test('E-07 L3: 단서 연결 → 금고 번호 → 칩 → 무음 경보 → 탈출 → Credits', async ({ page }) => {
  const L = levelData(3);
  await openGame(page);
  await startLevel(page, 3);

  // 이월 단서(L2) + 연구실 A 실험일지
  for (const c of ['C1-06', 'C2-03', 'C2-04', 'C2-05', 'C3-01']) await giveClue(page, c);
  await expect.poll(async () => (await state(page)).clues).toEqual(expect.arrayContaining(['C2-04', 'C3-01']));

  // 단서 연결(AC-23): 데이터상 C2-04 + C3-01 → C3-02.
  // 테스트 API(§7)에 연결 동작이 없어 연결 결과 단서를 지급한다 (연결 로직은 U-CLU-02·D-06 에서 검증)
  const combo = L.combos.find((cb) => cb.result === 'C3-02');
  expect(combo && [combo.a, combo.b].sort()).toEqual(['C2-04', 'C3-01']);
  await giveClue(page, 'C3-02');

  // 금고: 오로라 칩(C3-06)을 주는 대화가 붙은 인터랙트
  const safeDlg = L.dialogues.find((d) => cluesGivenBy(d).includes('C3-06'));
  expect(safeDlg, 'C3-06 을 주는 대화').toBeDefined();
  const safe = L.interactables.find((i) => i.dialogue === safeDlg!.id);
  expect(safe, '금고 인터랙트').toBeDefined();
  const codeChoice = choiceTextRequiring(safeDlg!, 'C3-02');
  expect(codeChoice, '[단서 필요: 금고 번호] 선택지').toBeDefined();

  expect(await talkAt(page, 3, safe!.pos), '금고 대화 시작').toBe(true);
  expect((await state(page)).alert).not.toBe('alert');
  await drive(page, (v, s) => {
    if (s.clues.includes('C3-06') && v.mode !== 'line' && v.mode !== 'end') return { kind: 'stop' };
    if (v.mode === 'choice') {
      const c = v.choices.find((x) => x.text === codeChoice && !x.locked);
      return c ? { kind: 'choose', index: c.index } : { kind: 'stop' };
    }
    if (v.mode === 'code' || v.mode === 'present') return { kind: 'stop' };
    return { kind: 'advance' };
  });
  if (await dialogue(page)) await closeDialogue(page);
  expect((await state(page)).clues, '오로라 칩 획득').toContain('C3-06');

  // AC-61: 칩을 꺼내는 순간 무음 경보, 직전 체크포인트 저장
  await expect.poll(async () => (await state(page)).alert, { timeout: 5_000 }).toBe('alert');
  const cp = JSON.parse((await readStorage(page, CHECKPOINT_KEY)) ?? 'null');
  expect(cp, '칩 직전 체크포인트').not.toBeNull();
  expect(cp.level).toBe(3);

  // 탈출: 화물 엘리베이터(숨김 아닌 출구)
  const exit = exitOf(3, (e) => !e.revealedBy);
  await useExit(page, 3, exit, /Result|Credits/);

  // Result → (엔딩) → Credits
  await expect
    .poll(
      async () => {
        const s = await scene(page);
        if (s !== 'Credits') await page.keyboard.press('Enter');
        return scene(page);
      },
      { timeout: 30_000, intervals: [700] },
    )
    .toBe('Credits');
  await expectScene(page, 'Credits');

  const save = await page.evaluate(() => window.__spy.save());
  expect(save.unlockedLevel).toBe(3);
  expect(save.bestGrade[3]).toMatch(/^[SABC]$/);
  // AC-53: 클리어하면 체크포인트를 지운다
  expect(await readStorage(page, CHECKPOINT_KEY)).toBeNull();
});
