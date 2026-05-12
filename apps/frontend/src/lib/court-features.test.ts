import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { FacilityFeature } from '@court-booking/shared';
import { FACILITY_FEATURE_LABELS } from './court-features';

describe('FACILITY_FEATURE_LABELS', () => {
  it('covers all FacilityFeature enum values', () => {
    const values = Object.values(FacilityFeature);
    expect(Object.keys(FACILITY_FEATURE_LABELS)).toHaveLength(values.length);
    for (const feature of values) {
      expect(FACILITY_FEATURE_LABELS[feature]).toBeDefined();
    }
  });

  it('has non-empty label and icon for every feature (property)', () => {
    const features = Object.values(FacilityFeature);
    fc.assert(
      fc.property(fc.constantFrom(...features), (feature) => {
        const entry = FACILITY_FEATURE_LABELS[feature];
        return (
          typeof entry.label === 'string' &&
          entry.label.trim().length > 0 &&
          typeof entry.icon === 'string' &&
          entry.icon.trim().length > 0
        );
      }),
    );
  });
});
