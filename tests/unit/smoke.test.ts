import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/config';

describe('토대', () => {
  it('조정값을 불러온다', () => {
    expect(TUNING.cone.fovDeg).toBe(70);
  });
});
