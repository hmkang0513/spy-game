// U-SAV-* 저장 (04 §3.11, AC-50~55·58·62)
import { describe, expect, it } from 'vitest';
import { applyLevelClear, BACKUP_KEY, CHECKPOINT_KEY, defaultSave, SAVE_KEY, SaveStore } from '../../src/core';
import type { SaveData } from '../../src/types';
import { MemoryStorage, sampleCheckpoint, sampleSave, ThrowingStorage } from './fixtures';

const CORRUPT_PREFIX = 'spyGame.save.corrupt.';

describe('save', () => {
  it('키 상수와 기본 세이브', () => {
    expect(SAVE_KEY).toBe('spyGame.save.v1');
    expect(BACKUP_KEY).toBe('spyGame.save.v1.bak');
    expect(CHECKPOINT_KEY).toBe('spyGame.checkpoint.v1');
    const d = defaultSave();
    expect(d.version).toBe(1);
    expect(d.unlockedLevel).toBe(1);
    expect(d.bestGrade).toEqual({});
    expect(d.carriedClues).toEqual([]);
    expect(typeof d.settings.volume).toBe('number');
    // 매번 새 객체
    expect(defaultSave()).not.toBe(d);
  });

  it('U-SAV-01 빈 저장소 → 기본값, 알림 없음', () => {
    const s = new SaveStore(new MemoryStorage());
    expect(s.available).toBe(true);
    const r = s.load();
    expect(r.data).toEqual(defaultSave());
    expect(r.notice).toBeUndefined();
  });

  it('U-SAV-01 정상 저장·로드, 백업 생성', () => {
    const mem = new MemoryStorage();
    const s = new SaveStore(mem);
    const d1 = sampleSave(defaultSave());
    s.save(d1);
    expect(JSON.parse(mem.getItem(SAVE_KEY)!)).toEqual(d1);
    expect(s.load().data).toEqual(d1);

    const d2: SaveData = { ...d1, unlockedLevel: 3, bestGrade: { 1: 'A', 2: 'B' } };
    s.save(d2);
    // 저장 전 기존 값이 백업으로
    expect(JSON.parse(mem.getItem(BACKUP_KEY)!)).toEqual(d1);
    // 새 인스턴스(새로고침)로도 읽힌다
    const r = new SaveStore(mem).load();
    expect(r.data).toEqual(d2);
    expect(r.notice).toBeUndefined();
  });

  it('U-SAV-02 손상 JSON → 백업 복구 + 손상본 보관', () => {
    const mem = new MemoryStorage();
    const good = sampleSave(defaultSave());
    mem.setItem(BACKUP_KEY, JSON.stringify(good));
    mem.setItem(SAVE_KEY, '{"version":1, "unlocked');
    const r = new SaveStore(mem).load();
    expect(r.notice).toBe('restoredFromBackup');
    expect(r.data).toEqual(good);
    const corrupt = mem.keys().filter((k) => k.startsWith(CORRUPT_PREFIX));
    expect(corrupt).toHaveLength(1);
    expect(mem.getItem(corrupt[0]!)).toBe('{"version":1, "unlocked');
  });

  it('U-SAV-02 손상 JSON + 백업 없음 → reset 알림, 기본값', () => {
    const mem = new MemoryStorage();
    mem.setItem(SAVE_KEY, 'not json at all');
    const r = new SaveStore(mem).load();
    expect(r.notice).toBe('reset');
    expect(r.data).toEqual(defaultSave());
    expect(mem.keys().some((k) => k.startsWith(CORRUPT_PREFIX))).toBe(true);
  });

  it('U-SAV-02 version 불일치 → reset', () => {
    const mem = new MemoryStorage();
    mem.setItem(SAVE_KEY, JSON.stringify({ ...sampleSave(defaultSave()), version: 2 }));
    const r = new SaveStore(mem).load();
    expect(r.notice).toBe('reset');
    expect(r.data).toEqual(defaultSave());
  });

  it('U-SAV-02 필드 타입 불일치 → reset (백업도 손상이면)', () => {
    const mem = new MemoryStorage();
    mem.setItem(SAVE_KEY, JSON.stringify({ ...defaultSave(), unlockedLevel: 'two', carriedClues: 'C1-06' }));
    mem.setItem(BACKUP_KEY, '{broken');
    const r = new SaveStore(mem).load();
    expect(r.notice).toBe('reset');
    expect(r.data).toEqual(defaultSave());
  });

  it('U-SAV-03 storage 예외 → 크래시 없이 메모리 모드, available=false', () => {
    const s = new SaveStore(new ThrowingStorage());
    let r!: ReturnType<SaveStore['load']>;
    expect(() => {
      r = s.load();
    }).not.toThrow();
    expect(r.data.version).toBe(1);
    const d = sampleSave(defaultSave());
    expect(() => s.save(d)).not.toThrow();
    expect(s.available).toBe(false);
    // 메모리 모드에서는 이번 실행 동안 저장값이 유지된다
    expect(s.load().data).toEqual(d);
    expect(() => s.saveCheckpoint(sampleCheckpoint())).not.toThrow();
    expect(() => s.loadCheckpoint()).not.toThrow();
    expect(() => s.clearCheckpoint()).not.toThrow();
  });

  it('U-SAV-03 storage null → 메모리 모드, available=false', () => {
    const s = new SaveStore(null);
    expect(s.available).toBe(false);
    expect(s.load().data).toEqual(defaultSave());
    const d = sampleSave(defaultSave());
    s.save(d);
    expect(s.load().data).toEqual(d);
    const cp = sampleCheckpoint();
    s.saveCheckpoint(cp);
    expect(s.loadCheckpoint()).toEqual(cp);
  });

  it('U-SAV-04 체크포인트 저장·로드·삭제', () => {
    const mem = new MemoryStorage();
    const s = new SaveStore(mem);
    expect(s.loadCheckpoint()).toBeNull();
    const cp = sampleCheckpoint();
    s.saveCheckpoint(cp);
    expect(mem.getItem(CHECKPOINT_KEY)).not.toBeNull();
    expect(new SaveStore(mem).loadCheckpoint()).toEqual(cp);
    s.clearCheckpoint();
    expect(s.loadCheckpoint()).toBeNull();
    expect(mem.getItem(CHECKPOINT_KEY)).toBeNull();
    // 메인 세이브와 독립
    expect(s.load().data).toEqual(defaultSave());
  });

  it('U-SAV-04 손상된 체크포인트 → null (크래시 없음)', () => {
    const mem = new MemoryStorage();
    mem.setItem(CHECKPOINT_KEY, '{oops');
    const s = new SaveStore(mem);
    expect(() => s.loadCheckpoint()).not.toThrow();
    expect(s.loadCheckpoint()).toBeNull();
  });

  it('U-SAV-05 applyLevelClear: 다음 레벨 해금·최고 등급·이월 단서', () => {
    const r1 = applyLevelClear(defaultSave(), 1, 'A', ['C1-06']);
    expect(r1.newBest).toBe(true);
    expect(r1.data.unlockedLevel).toBe(2);
    expect(r1.data.bestGrade[1]).toBe('A');
    expect(r1.data.carriedClues).toContain('C1-06');

    // 더 나쁜 등급 → 최고 등급 유지
    const r2 = applyLevelClear(r1.data, 1, 'B', ['C1-06']);
    expect(r2.newBest).toBe(false);
    expect(r2.data.bestGrade[1]).toBe('A');
    expect(r2.data.unlockedLevel).toBe(2);
    expect(r2.data.carriedClues.filter((c) => c === 'C1-06')).toHaveLength(1); // 중복 없음

    // 더 좋은 등급 → 갱신
    const r3 = applyLevelClear(r2.data, 1, 'S', []);
    expect(r3.newBest).toBe(true);
    expect(r3.data.bestGrade[1]).toBe('S');
    expect(r3.data.carriedClues).toContain('C1-06'); // 기존 이월 단서 유지
  });

  it('U-SAV-05 L2 클리어 → L3 해금, 이월 단서 누적 / L3 는 최대 3', () => {
    const afterL1 = applyLevelClear(defaultSave(), 1, 'B', ['C1-06']).data;
    const afterL2 = applyLevelClear(afterL1, 2, 'A', ['C2-03', 'C2-04', 'C2-05']).data;
    expect(afterL2.unlockedLevel).toBe(3);
    expect(new Set(afterL2.carriedClues)).toEqual(new Set(['C1-06', 'C2-03', 'C2-04', 'C2-05']));
    const afterL3 = applyLevelClear(afterL2, 3, 'C', []);
    expect(afterL3.data.unlockedLevel).toBe(3);
    expect(afterL3.data.bestGrade[3]).toBe('C');
    expect(afterL3.newBest).toBe(true);
    // 이미 L3 까지 열렸으면 L1 재클리어로 내려가지 않는다
    expect(applyLevelClear(afterL3.data, 1, 'S', []).data.unlockedLevel).toBe(3);
  });
});
