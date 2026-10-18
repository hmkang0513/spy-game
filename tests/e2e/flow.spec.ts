// E-01, E-02, E-09 씬 흐름·저장 손상 (06 §4.3)
import { expect, test } from '@playwright/test';
import { advance, collectErrors, dialogue, expectScene, openGame, SAVE_KEY, scene } from './helpers';

test('E-01 로드 → Title 표시, Galmuri 폰트 적용, 콘솔 에러 없음', async ({ page }) => {
  const errors = collectErrors(page);
  await openGame(page);
  await expectScene(page, 'Title', 15_000);
  await expect(page.locator('canvas').first()).toBeVisible();
  // AC-01: document.fonts.load('11px Galmuri11') 완료 후 타이틀
  const fontReady = await page.evaluate(() => document.fonts.check('11px Galmuri11'));
  expect(fontReady).toBe(true);
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '')),
  );
  expect(loaded.some((f) => f.startsWith('Galmuri'))).toBe(true);
  expect(errors).toEqual([]);
});

test('E-02 Title → LevelSelect → L2·L3 잠김, L1 선택 → Briefing → Level', async ({ page }) => {
  const errors = collectErrors(page);
  await openGame(page);
  await expectScene(page, 'Title', 15_000);

  // 새 세이브: L1 만 열림
  const save = await page.evaluate(() => window.__spy.save());
  expect(save.unlockedLevel).toBe(1);

  await page.evaluate(() => window.__spy.goto('LevelSelect'));
  await expectScene(page, 'LevelSelect');

  // ←→ 선택, Enter 브리핑 (03 S2). 잠긴 L2·L3 는 Enter 해도 그대로
  for (const rights of [1, 2]) {
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
    for (let i = 0; i < rights; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    // 부정 확인이라 일정 시간(페이드 0.5s 의 3배) 동안 씬이 바뀌지 않는지 본다
    await page.waitForTimeout(1_500);
    expect(await scene(page), `L${rights + 1} 은 잠겨 있어 선택되지 않는다`).toBe('LevelSelect');
  }

  // L1 선택
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await expectScene(page, 'Briefing');

  // 브리핑 대사를 끝까지 넘기고 "임무 시작"(Enter)
  await expect
    .poll(
      async () => {
        const s = await scene(page);
        if (s !== 'Briefing') return s;
        if (await dialogue(page)) await advance(page);
        else await page.keyboard.press('Enter');
        return scene(page);
      },
      { timeout: 30_000, intervals: [300] },
    )
    .toBe('Level');
  await expect.poll(async () => (await page.evaluate(() => window.__spy.state())).level).toBe(1);
  expect(errors).toEqual([]);
});

for (const [name, raw] of [
  ['손상 JSON', '{"version":1,"unlockedLevel":'],
  ['version 불일치', JSON.stringify({ version: 99, unlockedLevel: 3, bestGrade: {}, carriedClues: [], settings: {} })],
] as const) {
  test(`E-09 ${name} 세이브 주입 후 로드 → 크래시 없음, 초기화`, async ({ page }) => {
    await openGame(page);
    await page.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: SAVE_KEY, v: raw });
    const errors = collectErrors(page);
    await page.reload();
    await page.waitForFunction(() => typeof window.__spy !== 'undefined', null, { timeout: 30_000 });
    await expectScene(page, 'Title', 15_000);
    expect(errors.filter((e) => e.startsWith('pageerror'))).toEqual([]);

    // AC-54: 기본값으로 초기화
    const save = await page.evaluate(() => window.__spy.save());
    expect(save.version).toBe(1);
    expect(save.unlockedLevel).toBe(1);
    // 04 §3.11: 손상본은 spyGame.save.corrupt.<epoch> 로 옮긴다
    const corruptKeys = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith('spyGame.save.corrupt.')),
    );
    expect(corruptKeys.length).toBeGreaterThanOrEqual(1);
    // 게임은 계속 진행 가능
    await page.evaluate(() => window.__spy.goto('LevelSelect'));
    await expectScene(page, 'LevelSelect');
  });
}
