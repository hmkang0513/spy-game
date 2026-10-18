// E2E 테스트 API window.__spy (04 §7, v1.1) — 개발 서버(import.meta.env.DEV)에서만 노출. 프로덕션 빌드에서는 코드째 빠진다
import type Phaser from 'phaser';
import type { AlertState, ClueId, DialogueView, LevelId, SaveData } from '../types';
import type { LevelScene } from '../scenes/LevelScene';
import type { DialogueScene } from '../scenes/DialogueScene';
import { currentSession, setSession } from '../state/session';
import { gameState } from '../state/game';
import { notebook } from '../dom/ClueNotebook';

/** 오버레이가 아닌 "메인" 씬 (scene() 이 돌려주는 키) */
const MAIN_SCENES = ['Boot', 'Title', 'LevelSelect', 'Briefing', 'Level', 'Result', 'Credits'];

type GotoTarget = 'Title' | 'LevelSelect' | 'Briefing' | 'Level' | 'Result';

export interface SpyTestApi {
  scene(): string;
  state(): { level?: LevelId; clues: ClueId[]; flags: string[]; objective?: string; alert?: AlertState; coins?: number; phase?: string };
  goto(scene: GotoTarget, data?: object): void;
  teleport(tx: number, ty: number): void;
  giveClue(id: ClueId): void;
  interact(): void;
  dialogue(): DialogueView | null;
  choose(index: number): void;
  advance(): void;
  present(id: ClueId): void;
  save(): SaveData;
}

export function installTestApi(game: Phaser.Game): void {
  if (!import.meta.env.DEV) return;
  const sm = game.scene;
  const level = (): LevelScene | null => (sm.isActive('Level') || sm.isPaused('Level') ? (sm.getScene('Level') as LevelScene) : null);
  const dlg = (): DialogueScene | null => (sm.isActive('Dialogue') ? (sm.getScene('Dialogue') as DialogueScene) : null);

  const api: SpyTestApi = {
    scene: () => [...MAIN_SCENES].reverse().find((k) => sm.isActive(k) || sm.isPaused(k)) ?? '',
    state: () => {
      const s = currentSession();
      const lv = level();
      return {
        level: s?.level.id,
        clues: s?.clues.ids() ?? [],
        flags: s ? [...s.flags] : [],
        objective: s?.currentObjective?.id,
        alert: lv?.stealth?.state,
        coins: s?.coins,
        phase: lv?.phase,
      };
    },
    goto: (target, data = {}) => {
      notebook.close(true);
      for (const k of sm.getScenes(true)) sm.stop(k.scene.key);
      if (target === 'Level' || target === 'Briefing') setSession(null);
      const d = target === 'Level' || target === 'Briefing' ? { level: 1, ...data } : data;
      sm.start(target, d);
    },
    teleport: (tx, ty) => level()?.teleport(tx, ty),
    giveClue: (id) => {
      currentSession()?.addClue(id);
    },
    interact: () => level()?.interact(),
    dialogue: () => dlg()?.view ?? null,
    choose: (i) => dlg()?.chooseIndex(i),
    advance: () => dlg()?.advanceNow(),
    present: (id) => {
      notebook.close(true);
      dlg()?.present(id);
    },
    save: () => gameState.data,
  };
  (window as unknown as { __spy: SpyTestApi }).__spy = api;
}
