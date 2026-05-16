import { describe, expect, it } from 'vitest';
import { CourtType } from '@court-booking/shared';
import { COURT_TYPE_LABELS } from './court-features';

describe('COURT_TYPE_LABELS', () => {
  it('covers all court types', () => {
    const values = Object.values(CourtType);
    expect(Object.keys(COURT_TYPE_LABELS)).toHaveLength(values.length);
    values.forEach((type) => {
      expect(COURT_TYPE_LABELS[type]).toBeDefined();
    });
  });
});
