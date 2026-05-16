import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CourtType } from '@court-booking/shared';
import { CourtTypeBadge } from './CourtTypeBadge';

describe('CourtTypeBadge', () => {
  it('renders indoor badge with blue classes', () => {
    render(<CourtTypeBadge courtType={CourtType.INDOOR} />);
    const badge = screen.getByText(/Trong/i);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-blue-100');
    expect(badge.className).toContain('text-blue-700');
  });

  it('renders outdoor badge with green classes', () => {
    render(<CourtTypeBadge courtType={CourtType.OUTDOOR} />);
    const badge = screen.getByText(/Ngoai|Ngoài/i);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-700');
  });
});
