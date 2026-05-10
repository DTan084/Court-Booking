import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCourt } from './useCourt';
import { api } from '@/lib/api';
import type { Court } from '@/types';
import { SportType, CourtStatus } from '@/types';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
  queryKeys: {
    courts: {
      detail: (id: string) => ['courts', id],
    },
  },
}));

describe('useCourt', () => {
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

  it('should fetch a single court by id', async () => {
    const mockCourt: Court = {
      id: '1',
      name: 'Court 1',
      sportType: SportType.BADMINTON,
      address: '123 Main St',
      district: 'District 1',
      pricePerHour: 100000,
      status: CourtStatus.ACTIVE,
      deletedAt: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: mockCourt } });

    const { result } = renderHook(() => useCourt('1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.get).toHaveBeenCalledWith('/courts/1');
    expect(result.current.data).toEqual(mockCourt);
  });

  it('should handle errors when court is not found', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Court not found'));

    const { result } = renderHook(() => useCourt('999'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(api.get).toHaveBeenCalledWith('/courts/999');
    expect(result.current.error).toBeDefined();
  });
});
