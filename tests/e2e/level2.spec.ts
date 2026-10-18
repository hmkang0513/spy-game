// E-05, E-06, E-08, E-10 레벨 2 잠입 (06 §4.3)
import { expect, test } from '@playwright/test';
import {
  CHECKPOINT_KEY,
  closeDialogue,
  dialogue,
  drive,
  exitOf,
  expectScene,
  giveClue,
  guestGuardSpots,
  interact,
  levelData,
  openGame,
  provokeGuards,
  readStorage,
  recordAlert,
  scene,
  startLevel,
  state,
  staffGuardSpots,
  approachTiles,
  teleport,
  useExit,
} from './helpers';
import { isPassable } from '../shared/levelMap';

test.describe.configure({ timeout: 120_000 });

test.beforeEach(async ({ page }) => {
  await openGame(page);
  await startLevel(page, 2);
  // L1 이월 단서 (goto 로 바로 들어왔으므로 직접 지급)
  await giveClue(page, 'C1-06');
  await expect.poll(async () => (await state(page)).clues).toContain('C1-06');
});

test('E-05 직원 구역: 경비 원뿔 near 로 이동 → 경보 상태 전이', async ({ page }) => {
  expect((await state(page)).alert).toBe('calm');
  const seen = await provokeGuards(page, staffGuardSpots(2), { stopOn: ['alert'] });
  expect(seen[0]).toBe('calm');
  expect(seen, `상태 변화: ${seen.join(' → ')}`).toContain('alert');
  expect(seen).not.toContain('dialogue');
});

test('E-05 손님 구역: 발각 → 검문 대화, 초대장 제시 → 주의 상태', async ({ page }) => {
  const seen = await provokeGuards(page, guestGuardSpots(2), { stopOn: ['dialogue', 'alert'] });
  expect(seen, `상태 변화: ${seen.join(' → ')}`).toContain('dialogue');
  expect(seen).not.toContain('alert');

  // "여긴 손님 구역이 아닌데요?" → 제시 요청: 초대장
  let presented = false;
  await drive(page, (v) => {
    if (v.mode === 'present') {
      presented = true;
      return { kind: 'present', clue: 'C1-06' };
    }
    if (v.mode === 'choice') {
      const open = v.choices.filter((c) => !c.locked);
      const pick = open[0];
      return pick ? { kind: 'choose', index: pick.index } : { kind: 'stop' };
    }
    return { kind: 'advance' };
  });
  expect(presented, '검문 대화에 제시 요청이 있다').toBe(true);
  if (await dialogue(page)) await closeDialogue(page, ['C1-06']);
  await expect.poll(async () => (await state(page)).alert, { timeout: 5_000 }).toBe('caution');
});

test('E-06 필수 단서 없이 뒷문 → 차단, 단서를 얻으면 탈출', async ({ page }) => {
  const s0 = await state(page);
  expect(s0.clues).not.toContain('C2-03');
  expect(s0.clues).not.toContain('C2-04');

  const exit = exitOf(2, (e) => (e.requires ?? []).includes('C2-03'));
  expect(exit.requires).toEqual(expect.arrayContaining(['C2-03', 'C2-04']));
  expect(exit.blockedText ?? '').toContain('아직 할 일이 남았다');

  const tile = approachTiles(2, exit.pos)[0] ?? exit.pos;
  await teleport(page, tile);
  await interact(page);
  // 부정 확인: 잠시 기다려도 Result 로 가지 않는다
  await page.waitForTimeout(1_500);
  expect(await scene(page)).toBe('Level');
  const d = await dialogue(page);
  if (d) {
    expect(d.text).toContain('아직 할 일이 남았다');
    await closeDialogue(page);
  }

  // 하나만 있어도 막힌다
  await giveClue(page, 'C2-03');
  await teleport(page, tile);
  await interact(page);
  await page.waitForTimeout(1_500);
  expect(await scene(page)).toBe('Level');
  if (await dialogue(page)) await closeDialogue(page);

  await giveClue(page, 'C2-04');
  await useExit(page, 2, exit, /Result/);
  await expectScene(page, 'Result');
});

test('E-08 체크포인트 도달 후 붙잡힘 → 재개, 단서 유지', async ({ page }) => {
  await giveClue(page, 'C2-01');
  const L = levelData(2);
  const cp = L.checkpoints[0]!;
  // area 안 이동 가능 타일 (spawn 우선)
  const inArea = [cp.spawn];
  for (let y = cp.area.ty; y < cp.area.ty + cp.area.h; y++)
    for (let x = cp.area.tx; x < cp.area.tx + cp.area.w; x++) if (isPassable(L, { tx: x, ty: y })) inArea.push({ tx: x, ty: y });
  await teleport(page, inArea.find((t) => isPassable(L, t))!);

  await expect
    .poll(async () => JSON.parse((await readStorage(page, CHECKPOINT_KEY)) ?? 'null')?.checkpointId ?? null, {
      timeout: 5_000,
    })
    .toBe(cp.id);
  const saved = JSON.parse((await readStorage(page, CHECKPOINT_KEY))!);
  expect(saved.level).toBe(2);
  expect(saved.clues).toEqual(expect.arrayContaining(['C1-06', 'C2-01']));

  // 경비에게 들켜 경보 → 그 자리에 있으면 경비가 다가와 붙잡는다
  const seen = await provokeGuards(page, staffGuardSpots(2), { stopOn: ['alert'] });
  expect(seen).toContain('alert');
  const rec = await recordAlert(page, 20_000, 'calm');
  expect(rec.map((r) => r.state), '붙잡힘 → 체크포인트 재시작으로 평시 복귀').toContain('calm');

  // 재개 직후 레벨·단서 유지 (AC-52). 붙잡힌 순간을 API 로 알 수 없어 1초 제한은 수동 체크리스트로 확인한다
  await expect.poll(async () => (await state(page)).level, { timeout: 1_000 }).toBe(2);
  const s = await state(page);
  expect(s.clues).toEqual(expect.arrayContaining(['C1-06', 'C2-01']));
  expect(await scene(page)).toBe('Level');
});

test('E-10 Esc 일시정지 중 경보 타이머 정지', async ({ page }) => {
  const L = levelData(2);
  // 경보를 일으킨 뒤 곧바로 스폰(로비)으로 피한다
  const seen = await provokeGuards(page, staffGuardSpots(2), { stopOn: ['alert'], afterStop: L.player.spawn });
  expect(seen).toContain('alert');

  await page.keyboard.press('Escape');
  // 일시정지 중에는 lostSight(3s)가 지나도 경보 유지 — 일정 시간 관찰이 필요하다
  const paused = await recordAlert(page, 5_000);
  expect(paused.map((r) => r.state)).toEqual(['alert']);

  await page.keyboard.press('Escape');
  const resumed = await recordAlert(page, 10_000, 'search');
  expect(resumed.map((r) => r.state)).toContain('search');
});
