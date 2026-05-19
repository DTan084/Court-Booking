import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FacilityFeatureTags } from './FacilityFeatureTags';

describe('FacilityFeatureTags', () => {
  it('shows maxVisible tags and overflow badge', () => {
    render(
      <FacilityFeatureTags
        features={[
          { id: '1', name: 'Parking', icon: 'P' },
          { id: '2', name: 'Shower', icon: 'S' },
          { id: '3', name: 'Wifi', icon: 'W' },
          { id: '4', name: 'First Aid', icon: 'F' },
          { id: '5', name: 'Cafe', icon: 'C' },
        ]}
        maxVisible={3}
      />,
    );
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('renders nothing for empty features', () => {
    const { container } = render(<FacilityFeatureTags features={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
