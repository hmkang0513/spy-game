// E-03, E-04 레벨 1 클리어 경로·저장 (06 §4.3)
import { expect, test } from '@playwright/test';
import { collectErrors, openGame, playLevel1, readStorage, SAVE_KEY } from './helpers';

test.describe.configure({ timeout: 120_000 });

test('E-03 L1: 페퍼 암호 잠김 → 미오 단서 → 잠금 해제 → 초대장 → 출구 → Result', async ({ page }) => {
  const errors = collectErrors(page);
  await openGame(page);
  await playLevel1(page);
  expect(errors.filter((e) => e.startsWith('pageerror'))).toEqual([]);
});

test('E-04 L1 클리어 후 새로고침 → L2 해금 유지, 이월 단서 저장', async ({ page }) => {
  await openGame(page);
  await playLevel1(page);

  await expect.poll(async () => (await page.evaluate(() => window.__spy.save())).unlockedLevel).toBe(2);
  const before = await page.evaluate(() => window.__spy.save());
  expect(before.carriedClues).toContain('C1-06');
  expect(before.bestGrade[1]).toMatch(/^[SABC]$/);

  await page.reload();
  await page.waitForFunction(() => typeof window.__spy !== 'undefined', null, { timeout: 30_000 });
  const after = await page.evaluate(() => window.__spy.save());
  expect(after.unlockedLevel).toBe(2);
  expect(after.carriedClues).toContain('C1-06');
  expect(after.bestGrade[1]).toBe(before.bestGrade[1]);

  // localStorage 원문도 확인 (AC-50)
  const raw = JSON.parse((await readStorage(page, SAVE_KEY)) ?? 'null');
  expect(raw).toMatchObject({ version: 1, unlockedLevel: 2 });
  expect(raw.carriedClues).toContain('C1-06');
});
