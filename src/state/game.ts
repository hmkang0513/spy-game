// 저장소 싱글턴 — SaveStore 와 현재 세이브·설정을 들고 있다 (04 §3.11)
import { SaveStore, defaultSave } from '../core';
import type { StorageLike } from '../core';
import type { CheckpointData, SaveData, Settings } from '../types';

/** localStorage 접근이 막힌 환경(AC-55)이면 null */
function probeStorage(): StorageLike | null {
  try {
    const s = window.localStorage;
    const probe = 'spyGame.probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

class GameState {
  readonly store = new SaveStore(probeStorage());
  data: SaveData = defaultSave();
  /** Boot 에서 load 결과로 받은 1회성 안내 (AC-54) */
  notice: 'reset' | 'restoredFromBackup' | undefined;

  /** 세이브를 읽는다. Boot 에서 한 번 호출 */
  load(): void {
    const { data, notice } = this.store.load();
    this.data = data;
    this.notice = notice;
  }

  save(next: SaveData = this.data): void {
    this.data = next;
    this.store.save(next);
  }

  get settings(): Settings {
    return this.data.settings;
  }

  updateSettings(patch: Partial<Settings>): void {
    this.save({ ...this.data, settings: { ...this.data.settings, ...patch } });
  }

  /** 진행 기록이 있는지 (이어하기 활성 여부) */
  hasProgress(): boolean {
    return this.data.unlockedLevel > 1 || Object.keys(this.data.bestGrade).length > 0 || this.checkpoint() !== null;
  }

  /** 새 게임: 설정은 남기고 진행만 지운다 */
  resetProgress(): void {
    this.store.clearCheckpoint();
    this.save({ ...defaultSave(), settings: this.data.settings });
  }

  checkpoint(): CheckpointData | null {
    return this.store.loadCheckpoint();
  }

  /** 1회성 안내를 꺼내고 비운다 */
  takeNotice(): 'reset' | 'restoredFromBackup' | undefined {
    const n = this.notice;
    this.notice = undefined;
    return n;
  }
}

export const gameState = new GameState();
