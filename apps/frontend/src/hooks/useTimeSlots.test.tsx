import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTimeSlots } from './useTimeSlots';
import { api } from '@/lib/api';
import type { CourtTimeSlot } from '@/types';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
  queryKeys: {
    courts: {
      timeSlots: (id: string) => ['courts', id, 'time-slots'],
    },
  },
}));

describe('useTimeSlots', () => {
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

  it('should fetch time slots for a court', async () => {
    const mockTimeSlots: CourtTimeSlot[] = [
      {
        id: '1',
        courtId: '1',
        dayOfWeek: 1, // Monday
        startHour: 8,
        endHour: 10,
        price: 100000,
      },
      {
        id: '2',
        courtId: '1',
        dayOfWeek: 1,
        startHour: 10,
        endHour: 12,
        price: 120000,
      },
    ];

    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: mockTimeSlots } });

    const { result } = renderHook(() => useTimeSlots('1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.get).toHaveBeenCalledWith('/courts/1/time-slots');
    expect(result.current.data).toEqual(mockTimeSlots);
  });

  it('should return empty array when no time slots exist', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: [] } });

    const { result } = renderHook(() => useTimeSlots('1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should handle errors when fetching time slots', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Failed to fetch time slots'));

    const { result } = renderHook(() => useTimeSlots('1'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});
