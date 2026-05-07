import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { CourtSchedule } from './CourtSchedule';
import { useSchedule } from '@/hooks/useSchedule';
import type { Booking, CourtTimeSlot } from '@/types';

// Mock the useSchedule hook
vi.mock('@/hooks/useSchedule');

const mockUseSchedule = vi.mocked(useSchedule);

type UseScheduleResult = {
  data?: Booking[];
  isLoading: boolean;
};

// Helper to create mock return value - bypass strict UseQueryResult type in tests
const mockScheduleReturn = (result: UseScheduleResult) =>
  mockUseSchedule.mockReturnValue(result as any);

describe('CourtSchedule', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const mockTimeSlots: CourtTimeSlot[] = [
    {
      id: '1',
      courtId: 'court-1',
      dayOfWeek: 1, // Monday
      startHour: 8,
      endHour: 10,
      price: 150000,
    },
    {
      id: '2',
      courtId: 'court-1',
      dayOfWeek: 1,
      startHour: 10,
      endHour: 12,
      price: 200000,
    },
  ];

  const mockOnDateChange = vi.fn();

  const renderComponent = () => {
    const monday = new Date('2024-01-01'); // This is a Monday
    return render(
      <QueryClientProvider client={queryClient}>
        <CourtSchedule
          courtId="court-1"
          timeSlots={mockTimeSlots}
          selectedDate={monday}
          onDateChange={mockOnDateChange}
        />
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render date picker', () => {
    mockScheduleReturn({ data: [], isLoading: false });

    renderComponent();

    const dateInput = screen.getByDisplayValue('2024-01-01');
    expect(dateInput).toBeInTheDocument();
    expect(dateInput).toHaveAttribute('type', 'date');
  });

  it('should show loading spinner when fetching schedule', () => {
    mockScheduleReturn({ data: undefined, isLoading: true });

    const { container } = renderComponent();

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show empty state when no slots for selected day', async () => {
    mockScheduleReturn({ data: [], isLoading: false });

    const sunday = new Date('2024-01-07'); // Sunday
    render(
      <QueryClientProvider client={queryClient}>
        <CourtSchedule
          courtId="court-1"
          timeSlots={mockTimeSlots}
          selectedDate={sunday}
          onDateChange={mockOnDateChange}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Không có khung giờ nào cho ngày này')).toBeInTheDocument();
    });
  });

  it('should render TimeSlotGrid with correct slots for selected day', async () => {
    mockScheduleReturn({ data: [], isLoading: false });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('08:00 - 10:00')).toBeInTheDocument();
      expect(screen.getByText('10:00 - 12:00')).toBeInTheDocument();
    });
  });

  it('should filter slots by day of week', async () => {
    mockScheduleReturn({ data: [], isLoading: false });

    const allSlots = [
      ...mockTimeSlots,
      {
        id: '3',
        courtId: 'court-1',
        dayOfWeek: 2, // Tuesday
        startHour: 14,
        endHour: 16,
        price: 180000,
      },
    ];

    const monday = new Date('2024-01-01'); // Monday
    render(
      <QueryClientProvider client={queryClient}>
        <CourtSchedule
          courtId="court-1"
          timeSlots={allSlots}
          selectedDate={monday}
          onDateChange={mockOnDateChange}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      // Should show Monday slots
      expect(screen.getByText('08:00 - 10:00')).toBeInTheDocument();
      expect(screen.getByText('10:00 - 12:00')).toBeInTheDocument();
      // Should NOT show Tuesday slot
      expect(screen.queryByText('14:00 - 16:00')).not.toBeInTheDocument();
    });
  });
});
