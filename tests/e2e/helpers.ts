// E2E 공용 도우미 — window.__spy(04 §7)와 레벨 데이터(05)만으로 흐름을 몬다.
import { expect, type Page } from '@playwright/test';
import type { ClueId, DialogueView, InteractableDef, LevelDef, LevelId, TilePos } from '../../src/types';
import { getLevel } from '../../src/data/levels';
import { inRect, isPassable, neighbours4 } from '../shared/levelMap';
import type { SpyState } from './spy';

export const SAVE_KEY = 'spyGame.save.v1';
export const CHECKPOINT_KEY = 'spyGame.checkpoint.v1';

/** 콘솔 에러·페이지 에러 수집 */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon/i.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/** ?test=1 로 열고 __spy 가 생길 때까지 기다린다 */
export async function openGame(page: Page): Promise<void> {
  await page.goto('/?test=1');
  await page.waitForFunction(() => typeof window.__spy !== 'undefined', null, { timeout: 30_000 });
}

export const scene = (page: Page): Promise<string> => page.evaluate(() => window.__spy.scene());
export const state = (page: Page): Promise<SpyState> => page.evaluate(() => window.__spy.state());
export const dialogue = (page: Page): Promise<DialogueView | null> => page.evaluate(() => window.__spy.dialogue());
export const advance = (page: Page): Promise<void> => page.evaluate(() => window.__spy.advance());
export const choose = (page: Page, i: number): Promise<void> => page.evaluate((idx) => window.__spy.choose(idx), i);
export const present = (page: Page, c: ClueId): Promise<void> => page.evaluate((id) => window.__spy.present(id), c);
export const teleport = (page: Page, t: TilePos): Promise<void> =>
  page.evaluate(({ tx, ty }) => window.__spy.teleport(tx, ty), t);
export const interact = (page: Page): Promise<void> => page.evaluate(() => window.__spy.interact());
export const giveClue = (page: Page, c: ClueId): Promise<void> => page.evaluate((id) => window.__spy.giveClue(id), c);
export const readStorage = (page: Page, k: string): Promise<string | null> =>
  page.evaluate((kk) => localStorage.getItem(kk), k);

export async function expectScene(page: Page, key: string, timeout = 10_000): Promise<void> {
  await expect.poll(() => scene(page), { timeout, message: `씬 ${key} 대기` }).toBe(key);
}

export async function hasClue(page: Page, c: ClueId): Promise<boolean> {
  return (await state(page)).clues.includes(c);
}

/** 레벨 씬으로 바로 이동하고 준비될 때까지 기다린다 (data 형식 {level} 은 §7 에 미정 — 가정) */
export async function startLevel(page: Page, level: LevelId): Promise<void> {
  await page.evaluate((lv) => window.__spy.goto('Level', { level: lv }), level);
  await expectScene(page, 'Level', 15_000);
  await expect.poll(async () => (await state(page)).level, { timeout: 10_000 }).toBe(level);
  // 시작 연출 대화가 열려 있으면 닫는다
  await closeDialogue(page);
}

// ───────────────────────── 대화 구동 ─────────────────────────

export type Step = { kind: 'advance' } | { kind: 'choose'; index: number } | { kind: 'present'; clue: ClueId } | { kind: 'stop' };

/**
 * 대화를 decide 규칙대로 진행한다. 대화가 닫히면 null, stop 이면 그때의 view 를 돌려준다.
 */
export async function drive(
  page: Page,
  decide: (v: DialogueView, s: SpyState) => Step,
  maxSteps = 80,
): Promise<DialogueView | null> {
  for (let i = 0; i < maxSteps; i++) {
    const v = await dialogue(page);
    if (!v) return null;
    const step = decide(v, await state(page));
    if (step.kind === 'stop') return v;
    if (step.kind === 'advance') await advance(page);
    else if (step.kind === 'choose') await choose(page, step.index);
    else await present(page, step.clue);
  }
  return dialogue(page);
}

/** 선택지/제시/코드 모드가 될 때까지 대사를 넘긴다. present 모드면 presentClues 중 보유한 것을 낸다 */
export async function driveToChoice(page: Page, presentClues: ClueId[] = []): Promise<DialogueView | null> {
  return drive(page, (v, s) => {
    if (v.mode === 'choice' || v.mode === 'code') return { kind: 'stop' };
    if (v.mode === 'present') {
      const c = presentClues.find((x) => s.clues.includes(x));
      return c ? { kind: 'present', clue: c } : { kind: 'stop' };
    }
    return { kind: 'advance' };
  });
}

/** 대화를 끝까지 닫는다 — 선택지는 마지막 열린 것(보통 "떠난다")을 고른다 */
export async function closeDialogue(page: Page, presentClues: ClueId[] = []): Promise<void> {
  const left = await drive(page, (v, s) => {
    if (v.mode === 'choice') {
      const open = v.choices.filter((c) => !c.locked);
      const pick = open[open.length - 1];
      return pick ? { kind: 'choose', index: pick.index } : { kind: 'stop' };
    }
    if (v.mode === 'present') {
      const c = presentClues.find((x) => s.clues.includes(x)) ?? s.clues[0];
      return c ? { kind: 'present', clue: c } : { kind: 'stop' };
    }
    if (v.mode === 'code') return { kind: 'stop' };
    return { kind: 'advance' };
  });
  expect(left, '대화를 닫지 못함').toBeNull();
}

// ───────────────────────── 위치 ─────────────────────────

export function levelData(level: LevelId): LevelDef {
  return getLevel(level);
}

/** 대상 옆의 이동 가능 타일들 — 다른 NPC·인터랙트에서 먼 순서 (E 대상이 헷갈리지 않게) */
export function approachTiles(level: LevelId, target: TilePos): TilePos[] {
  const L = getLevel(level);
  const others = [...L.npcs.map((n) => n.pos), ...L.interactables.map((i) => i.pos)].filter(
    (p) => !(p.tx === target.tx && p.ty === target.ty),
  );
  const minDist = (t: TilePos) => Math.min(99, ...others.map((o) => Math.hypot(o.tx - t.tx, o.ty - t.ty)));
  return neighbours4(target)
    .filter((t) => isPassable(L, t))
    .sort((a, b) => minDist(b) - minDist(a));
}

/** 대상 옆으로 순간이동 후 E. 대화가 열리면 true */
export async function talkAt(page: Page, level: LevelId, target: TilePos): Promise<boolean> {
  for (const t of approachTiles(level, target)) {
    await teleport(page, t);
    await interact(page);
    try {
      await expect.poll(() => dialogue(page), { timeout: 2_000 }).not.toBeNull();
      return true;
    } catch {
      // 다음 이웃 타일에서 다시 시도
    }
  }
  return false;
}

export function npcByCharacter(level: LevelId, character: string): { id: string; pos: TilePos; dialogue: string } {
  const n = getLevel(level).npcs.find((x) => x.character === character);
  if (!n) throw new Error(`L${level} 에 캐릭터 ${character} NPC 가 없음`);
  return n;
}

export async function talkToNpc(page: Page, level: LevelId, character: string): Promise<void> {
  const n = npcByCharacter(level, character);
  expect(await talkAt(page, level, n.pos), `${character} 와 대화 시작`).toBe(true);
}

/**
 * NPC 와 여러 번 대화하며 clue 를 얻을 때까지 선택지를 탐색한다.
 * prefer 에 맞는 선택지를 먼저, 그다음 안 가 본 선택지를 고른다.
 */
export async function talkUntilClue(
  page: Page,
  level: LevelId,
  character: string,
  clue: ClueId,
  opts: { prefer?: RegExp; present?: ClueId[] } = {},
): Promise<void> {
  for (let round = 0; round < 6 && !(await hasClue(page, clue)); round++) {
    await talkToNpc(page, level, character);
    const tried = new Set<number>();
    await drive(page, (v, s) => {
      if (v.mode === 'choice') {
        const open = v.choices.filter((c) => !c.locked);
        const pick =
          (s.clues.includes(clue) ? open[open.length - 1] : undefined) ??
          open.find((c) => opts.prefer?.test(c.text) && !tried.has(c.index) && !c.visited) ??
          open.find((c) => opts.prefer?.test(c.text) && !tried.has(c.index)) ??
          open.find((c) => !c.visited && !tried.has(c.index)) ??
          open[open.length - 1];
        if (!pick) return { kind: 'stop' };
        tried.add(pick.index);
        return { kind: 'choose', index: pick.index };
      }
      if (v.mode === 'present') {
        const c = (opts.present ?? []).find((x) => s.clues.includes(x)) ?? s.clues[0];
        return c ? { kind: 'present', clue: c } : { kind: 'stop' };
      }
      if (v.mode === 'code') return { kind: 'stop' };
      return { kind: 'advance' };
    });
    if (await dialogue(page)) await closeDialogue(page, opts.present);
  }
  expect(await hasClue(page, clue), `${character} 에게서 ${clue} 획득`).toBe(true);
}

export function exitOf(level: LevelId, pred: (i: InteractableDef) => boolean = () => true): InteractableDef {
  const e = getLevel(level).interactables.find((i) => i.kind === 'exit' && pred(i));
  if (!e) throw new Error(`L${level} 출구 없음`);
  return e;
}

/** 출구 옆에서 E 를 눌러 Result(또는 expected) 씬이 될 때까지 시도 */
export async function useExit(page: Page, level: LevelId, exit: InteractableDef, expected = /Result|Credits/): Promise<void> {
  const tiles = [...approachTiles(level, exit.pos), ...(isPassable(getLevel(level), exit.pos) ? [exit.pos] : [])];
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const t of tiles) {
      await teleport(page, t);
      await interact(page);
      try {
        await expect.poll(() => scene(page), { timeout: 3_000 }).toMatch(expected);
        return;
      } catch {
        if (await dialogue(page)) await closeDialogue(page);
      }
    }
  }
  const diag = JSON.stringify({ state: await state(page), dialogue: await dialogue(page) });
  await expect.poll(() => scene(page), { timeout: 3_000, message: `출구 사용 실패: ${diag}` }).toMatch(expected);
}

// ───────────────────────── 경비 유인 ─────────────────────────

export function zoneKindAt(level: LevelId, t: TilePos): 'guest' | 'staff' | undefined {
  return getLevel(level).zones.find((z) => inRect(z.area, t))?.kind;
}

/** 경비 주변 반경 r(맨해튼) 안의 이동 가능 타일 */
export function tilesAround(level: LevelId, c: TilePos, r: number): TilePos[] {
  const L = getLevel(level);
  const out: TilePos[] = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (d === 0 || d > r) continue;
      const t = { tx: c.tx + dx, ty: c.ty + dy };
      if (isPassable(L, t)) out.push(t);
    }
  }
  return out.sort((a, b) => Math.abs(a.tx - c.tx) + Math.abs(a.ty - c.ty) - (Math.abs(b.tx - c.tx) + Math.abs(b.ty - c.ty)));
}

/** 직원 구역(손님 구역 아님)에 있는 경비 근처 타일 — 정지·회전 경비 우선 */
export function staffGuardSpots(level: LevelId): TilePos[] {
  const L = getLevel(level);
  const guards = [...L.guards].sort((a, b) => (a.kind === 'patrol' ? 1 : 0) - (b.kind === 'patrol' ? 1 : 0));
  for (const g of guards) {
    const spots = tilesAround(level, g.pos, 2).filter((t) => zoneKindAt(level, t) !== 'guest');
    if (spots.length >= 2) return spots;
  }
  throw new Error(`L${level}: 직원 구역 경비 근처 타일을 찾지 못함`);
}

/** 손님 구역 안에서 경비가 볼 수 있는 근처 타일 (AC-40 검문) */
export function guestGuardSpots(level: LevelId): TilePos[] {
  const L = getLevel(level);
  for (const g of L.guards) {
    const centers = [g.pos, ...(g.patrol?.waypoints ?? [])];
    for (const c of centers) {
      const spots = tilesAround(level, c, 2).filter((t) => zoneKindAt(level, t) === 'guest');
      if (spots.length >= 1) return spots;
    }
  }
  throw new Error(`L${level}: 손님 구역 안에서 경비와 마주칠 타일이 없음 (AC-40 검증 불가)`);
}

/**
 * 브라우저 안에서 spots 를 돌아가며 순간이동하면서 경보 상태 변화를 기록한다.
 * stopOn 에 해당하는 상태(또는 'dialogue')가 나오면 즉시 멈춘다. afterStop 타일이 있으면 멈춘 직후 그리로 이동.
 */
export async function provokeGuards(
  page: Page,
  spots: TilePos[],
  opts: { stopOn: string[]; timeoutMs?: number; holdMs?: number; afterStop?: TilePos },
): Promise<string[]> {
  return page.evaluate(
    async ({ spots, stopOn, timeoutMs, holdMs, afterStop }) => {
      const seen: string[] = [];
      const t0 = performance.now();
      let i = 0;
      let lastTp = -Infinity;
      while (performance.now() - t0 < timeoutMs) {
        const now = performance.now();
        if (now - lastTp > holdMs) {
          const p = spots[i++ % spots.length]!;
          window.__spy.teleport(p.tx, p.ty);
          lastTp = now;
        }
        const a = window.__spy.state().alert ?? 'none';
        if (seen[seen.length - 1] !== a) seen.push(a);
        const hit = stopOn.includes(a) || (stopOn.includes('dialogue') && window.__spy.dialogue() !== null);
        if (hit) {
          if (window.__spy.dialogue() !== null) seen.push('dialogue');
          if (afterStop) window.__spy.teleport(afterStop.tx, afterStop.ty);
          break;
        }
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      return seen;
    },
    { spots, stopOn: opts.stopOn, timeoutMs: opts.timeoutMs ?? 25_000, holdMs: opts.holdMs ?? 900, afterStop: opts.afterStop ?? null },
  );
}

/** 브라우저 안에서 ms 동안 경보 상태 변화를 기록한다(움직이지 않음). until 이 나오면 멈춤 */
export async function recordAlert(page: Page, ms: number, until?: string): Promise<{ state: string; t: number }[]> {
  return page.evaluate(
    async ({ ms, until }) => {
      const out: { state: string; t: number }[] = [];
      const t0 = performance.now();
      while (performance.now() - t0 < ms) {
        const a = window.__spy.state().alert ?? 'none';
        if (out[out.length - 1]?.state !== a) out.push({ state: a, t: performance.now() - t0 });
        if (until && a === until && out.length > 1) break;
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      return out;
    },
    { ms, until: until ?? null },
  );
}

// ───────────────────────── 레벨 1 클리어 ─────────────────────────

/** E-03 흐름: 페퍼(잠김 확인) → 미오(C1-03) → 페퍼(암호, C1-06) → 출구 → Result */
export async function playLevel1(page: Page): Promise<{ lockedIndex: number }> {
  await startLevel(page, 1);
  expect(await hasClue(page, 'C1-01'), '시작 단서 C1-01(배지)').toBe(true);

  // 1) 페퍼: 암호 선택지가 잠겨 있다
  await talkToNpc(page, 1, 'pepper');
  const v1 = await driveToChoice(page, ['C1-01']);
  expect(v1?.mode).toBe('choice');
  const lockedChoice = v1!.choices.find((c) => c.missing.includes('C1-03'));
  expect(lockedChoice, '[단서 필요: 단골 주문 쪽지] 선택지가 보인다(숨기지 않음)').toBeDefined();
  expect(lockedChoice!.locked).toBe(true);
  // 잠긴 선택지를 골라도 반응 없음
  await choose(page, lockedChoice!.index);
  const still = await dialogue(page);
  expect(still?.nodeId).toBe(v1!.nodeId);
  await closeDialogue(page, ['C1-01']);

  // 2) 미오: "창가 손님이 마시는 걸로" → C1-03
  await talkUntilClue(page, 1, 'mio', 'C1-03', { prefer: /창가|손님|같은/ });

  // 3) 페퍼: 같은 선택지가 열린다 → 초대장 C1-06
  await talkToNpc(page, 1, 'pepper');
  const v2 = await driveToChoice(page, ['C1-01']);
  expect(v2?.mode).toBe('choice');
  const unlocked = v2!.choices.find((c) => c.index === lockedChoice!.index && c.text === lockedChoice!.text);
  expect(unlocked, '같은 선택지').toBeDefined();
  expect(unlocked!.locked).toBe(false);
  await choose(page, unlocked!.index);
  await drive(page, (v, s) => {
    if (s.clues.includes('C1-06') && v.mode !== 'line' && v.mode !== 'end') return { kind: 'stop' };
    if (v.mode === 'choice') {
      const open = v.choices.filter((c) => !c.locked && !c.visited);
      const pick = open[0] ?? v.choices.filter((c) => !c.locked).slice(-1)[0];
      return pick ? { kind: 'choose', index: pick.index } : { kind: 'stop' };
    }
    if (v.mode === 'present') return { kind: 'present', clue: 'C1-01' };
    return { kind: 'advance' };
  });
  expect(await hasClue(page, 'C1-06'), '초대장 획득').toBe(true);
  if (await dialogue(page)) await closeDialogue(page, ['C1-01']);

  // 4) 출구 → Result (접선 성공 시 바로 Result 로 갈 수도 있다)
  if ((await scene(page)) !== 'Result') await useExit(page, 1, exitOf(1), /Result/);
  await expectScene(page, 'Result');
  return { lockedIndex: lockedChoice!.index };
}
