import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { TimeSlotGrid } from './TimeSlotGrid';
import type { CourtTimeSlot, BookedRange } from '@/types';

describe('TimeSlotGrid', () => {
  const mockTimeSlots: CourtTimeSlot[] = [
    {
      id: '1',
      courtId: 'court-1',
      dayOfWeek: 1,
      startHour: 8,
      endHour: 10,
      price: 150000,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      courtId: 'court-1',
      dayOfWeek: 1,
      startHour: 10,
      endHour: 12,
      price: 200000,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '3',
      courtId: 'court-1',
      dayOfWeek: 1,
      startHour: 14,
      endHour: 16,
      price: 180000,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const mockBookedRanges: BookedRange[] = [{ startHour: 10, endHour: 12 }];

  it('should render all time slots', () => {
    render(<TimeSlotGrid timeSlots={mockTimeSlots} bookedRanges={[]} />);

    expect(screen.getByText('08:00 - 10:00')).toBeInTheDocument();
    expect(screen.getByText('10:00 - 12:00')).toBeInTheDocument();
    expect(screen.getByText('14:00 - 16:00')).toBeInTheDocument();
  });

  it('should display prices formatted', () => {
    render(<TimeSlotGrid timeSlots={mockTimeSlots} bookedRanges={[]} />);

    expect(screen.getByText(/150\.000/)).toBeInTheDocument();
    expect(screen.getByText(/200\.000/)).toBeInTheDocument();
    expect(screen.getByText(/180\.000/)).toBeInTheDocument();
  });

  it('should show "Available" badge for available slots', () => {
    render(<TimeSlotGrid timeSlots={mockTimeSlots} bookedRanges={[]} />);

    const availableBadges = screen.getAllByText('Available');
    expect(availableBadges).toHaveLength(3);
  });

  it('should show "Booked" badge for booked slots', () => {
    render(<TimeSlotGrid timeSlots={mockTimeSlots} bookedRanges={mockBookedRanges} />);

    expect(screen.getByText('Booked')).toBeInTheDocument();
    const availableBadges = screen.getAllByText('Available');
    expect(availableBadges).toHaveLength(2);
  });

  it('should disable booked slots', () => {
    const mockOnSlotClick = vi.fn();
    render(
      <TimeSlotGrid
        timeSlots={mockTimeSlots}
        bookedRanges={mockBookedRanges}
        onSlotClick={mockOnSlotClick}
      />,
    );

    const buttons = screen.getAllByRole('button');
    // Second slot (10:00-12:00) should be disabled
    expect(buttons[1]).toBeDisabled();
    // Other slots should not be disabled
    expect(buttons[0]).not.toBeDisabled();
    expect(buttons[2]).not.toBeDisabled();
  });

  it('should sort slots by start hour', () => {
    const unsortedSlots = [mockTimeSlots[2], mockTimeSlots[0], mockTimeSlots[1]];
    render(<TimeSlotGrid timeSlots={unsortedSlots} bookedRanges={[]} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('08:00 - 10:00');
    expect(buttons[1]).toHaveTextContent('10:00 - 12:00');
    expect(buttons[2]).toHaveTextContent('14:00 - 16:00');
  });
});
