import { expect, test } from '@playwright/test';

test('게임 캔버스가 뜨고 콘솔 에러가 없다', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/');
  await expect(page.locator('#game canvas')).toBeVisible();
  expect(errors).toEqual([]);
});
