import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/data/levels';
import { TILE_CHARS } from '../../src/types';
import type { LevelDef, TilePos } from '../../src/types';
import { canApproach, inBounds, isPassable, key, mapSize, neighbours4 } from '../shared/levelMap';

/** 출구는 막힌 칸(닫힌 문), 잠긴 문은 열린 것으로 보고 스폰에서 BFS */
function reachWithExitsClosed(level: LevelDef): Set<string> {
  const exits = new Set(level.interactables.filter((i) => i.kind === 'exit').map((i) => key(i.pos)));
  const doors = new Set(level.interactables.filter((i) => i.kind === 'lockedDoor').map((i) => key(i.pos)));
  const ok = (t: TilePos) => inBounds(level, t) && !exits.has(key(t)) && (isPassable(level, t) || doors.has(key(t)));
  const seen = new Set<string>([key(level.player.spawn)]);
  const queue: TilePos[] = [level.player.spawn];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of neighbours4(cur)) {
      if (!seen.has(key(n)) && ok(n)) {
        seen.add(key(n));
        queue.push(n);
      }
    }
  }
  return seen;
}

describe('출구를 거치지 않고 레벨 밖으로 나갈 수 없다 (L1 부두 우회 회귀)', () => {
  for (const level of Object.values(LEVELS)) {
    it(`L${level.id}: 출구가 닫혀 있으면 맵 가장자리에 닿지 않고, 출구에는 다가갈 수 있다`, () => {
      const reach = reachWithExitsClosed(level);
      const { width, height } = mapSize(level);
      // 맵 끝에 붙은 문 칸(들어온 정문 등)은 너머가 없는 막다른 칸이라 허용한다
      const onBorder = [...reach].filter((k) => {
        const [tx, ty] = k.split(',').map(Number) as [number, number];
        const border = tx === 0 || ty === 0 || tx === width - 1 || ty === height - 1;
        return border && TILE_CHARS[level.map.rows[ty]![tx]!] !== 'door';
      });
      expect(onBorder).toEqual([]);
      for (const exit of level.interactables.filter((i) => i.kind === 'exit')) {
        expect(canApproach(reach, exit.pos), `출구 ${exit.id}`).toBe(true);
      }
    });
  }
});
