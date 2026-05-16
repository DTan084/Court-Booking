import { render, screen } from '@testing-library/react';
import { CourtCard } from './CourtCard';
import { CourtStatus, CourtType } from '@/types';
import type { Court } from '@/types';

describe('CourtCard', () => {
  const mockCourt: Court = {
    id: '1',
    name: 'San Cau Long A1',
    sportTypeId: 'sport-type-1',
    courtType: CourtType.INDOOR,
    address: '123 Duong ABC, Quan 1, TP.HCM',
    district: 'Quan 1',
    description: null,
    featureItems: [],
    images: [],
    pricePerHour: 150000,
    status: CourtStatus.ACTIVE,
    deletedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('should render court name', () => {
    render(<CourtCard court={mockCourt} />);
    expect(screen.getByText('San Cau Long A1')).toBeInTheDocument();
  });

  it('should render address', () => {
    render(<CourtCard court={mockCourt} />);
    expect(screen.getByText('123 Duong ABC, Quan 1, TP.HCM')).toBeInTheDocument();
  });

  it('should render price formatted', () => {
    render(<CourtCard court={mockCourt} />);
    expect(screen.getByText(/150\.000/)).toBeInTheDocument();
  });

  it('should render status badge for inactive court', () => {
    const inactiveCourt = { ...mockCourt, status: CourtStatus.INACTIVE };
    render(<CourtCard court={inactiveCourt} />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('should have link to court detail page', () => {
    render(<CourtCard court={mockCourt} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/courts/1');
  });
});
