import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSchedule } from './useSchedule';
import { api } from '@/lib/api';
import type { Booking } from '@/types';
import { BookingStatus } from '@/types';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
  queryKeys: {
    courts: {
      schedule: (id: string, date: string) => ['courts', id, 'schedule', date],
    },
  },
}));

describe('useSchedule', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should fetch court schedule for a specific date', async () => {
    const mockBookings: Booking[] = [
      {
        id: '1',
        courtId: '1',
        userId: 'user1',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T12:00:00Z',
        status: BookingStatus.CONFIRMED,
        totalPrice: 200000,
        cancelledAt: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: mockBookings } });

    const { result } = renderHook(() => useSchedule('1', '2024-01-01'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.get).toHaveBeenCalledWith('/courts/1/schedule', {
      params: { date: '2024-01-01' },
    });
    expect(result.current.data).toEqual(mockBookings);
  });

  it('should return empty array when no bookings exist', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: [] } });

    const { result } = renderHook(() => useSchedule('1', '2024-01-01'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should use correct query parameters', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: [] } });

    const courtId = '123';
    const date = '2024-12-25';

    renderHook(() => useSchedule(courtId, date), { wrapper });

    await waitFor(() => expect(api.get).toHaveBeenCalled());

    expect(api.get).toHaveBeenCalledWith(`/courts/${courtId}/schedule`, {
      params: { date },
    });
  });
});
