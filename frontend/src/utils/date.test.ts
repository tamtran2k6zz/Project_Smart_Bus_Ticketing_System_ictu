import { describe, expect, it } from 'vitest';
import { getVietnamDateString } from './date';

describe('getVietnamDateString', () => {
  it('uses the Vietnam calendar date rather than the UTC date', () => {
    expect(getVietnamDateString(new Date('2026-10-02T18:30:00.000Z'))).toBe('2026-10-03');
  });
});
