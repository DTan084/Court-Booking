import { render, screen } from '@testing-library/react';
import { CourtCard } from './CourtCard';
import type { Court, SportType, CourtStatus } from '@/types';

describe('CourtCard', () => {
  const mockCourt: Court = {
    id: '1',
    name: 'Sân Cầu Lông A1',
    sportType: 'badminton' as SportType,
    address: '123 Đường ABC, Quận 1, TP.HCM',
    pricePerHour: 150000,
    status: 'ACTIVE' as CourtStatus,
    deletedAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('should render court name', () => {
    render(<CourtCard court={mockCourt} />);
    expect(screen.getByText('Sân Cầu Lông A1')).toBeInTheDocument();
  });

  it('should render sport type badge', () => {
    render(<CourtCard court={mockCourt} />);
    expect(screen.getByText('Cầu lông')).toBeInTheDocument();
  });

  it('should render address', () => {
    render(<CourtCard court={mockCourt} />);
    expect(screen.getByText('123 Đường ABC, Quận 1, TP.HCM')).toBeInTheDocument();
  });

  it('should render price formatted', () => {
    render(<CourtCard court={mockCourt} />);
    expect(screen.getByText(/150\.000/)).toBeInTheDocument();
  });

  it('should render status badge for active court', () => {
    render(<CourtCard court={mockCourt} />);
    expect(screen.getByText('Hoạt động')).toBeInTheDocument();
  });

  it('should render status badge for inactive court', () => {
    const inactiveCourt = { ...mockCourt, status: 'INACTIVE' as CourtStatus };
    render(<CourtCard court={inactiveCourt} />);
    expect(screen.getByText('Tạm ngưng')).toBeInTheDocument();
  });

  it('should have link to court detail page', () => {
    render(<CourtCard court={mockCourt} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/courts/1');
  });
});
