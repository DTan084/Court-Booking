import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FacilityFeature } from '@court-booking/shared';
import { FacilityFeatureTags } from './FacilityFeatureTags';

describe('FacilityFeatureTags', () => {
  it('shows maxVisible tags and overflow badge', () => {
    render(
      <FacilityFeatureTags
        features={[
          FacilityFeature.PARKING,
          FacilityFeature.SHOWER,
          FacilityFeature.WIFI,
          FacilityFeature.FIRST_AID,
          FacilityFeature.CAFETERIA,
        ]}
        maxVisible={3}
      />,
    );
    expect(screen.getByText('+2 tiện ích khác')).toBeInTheDocument();
  });

  it('renders nothing for empty features', () => {
    const { container } = render(<FacilityFeatureTags features={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
