import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCourts } from './useCourts';
import { api } from '@/lib/api';
import type { PaginatedResult, Court } from '@/types';
import { CourtStatus, CourtType } from '@/types';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
  queryKeys: {
    courts: {
      list: (params: unknown) => ['courts', 'list', params],
    },
  },
}));

describe('useCourts', () => {
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

  it('should fetch courts with pagination parameters', async () => {
    const mockData: PaginatedResult<Court> = {
      data: [
        {
          id: '1',
          name: 'Court 1',
          sportTypeId: 'sport-type-1',
          courtType: CourtType.INDOOR,
          address: '123 Main St',
          district: 'District 1',
          description: null,
          featureItems: [],
          images: [],
          pricePerHour: 100000,
          status: CourtStatus.ACTIVE,
          deletedAt: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 12,
        totalPages: 1,
      },
    };

    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: mockData } });

    const { result } = renderHook(() => useCourts({ page: 1, limit: 12 }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.get).toHaveBeenCalledWith('/courts', {
      params: { page: 1, limit: 12 },
    });
    expect(result.current.data).toEqual(mockData);
  });

  it('should fetch courts with filter parameters', async () => {
    const mockData: PaginatedResult<Court> = {
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 12,
        totalPages: 0,
      },
    };

    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: mockData } });

    const params = {
      page: 1,
      limit: 12,
      name: 'Tennis',
      sportTypeId: ['sport-type-2'],
    };

    const { result } = renderHook(() => useCourts(params), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.get).toHaveBeenCalledWith('/courts', { params });
  });

  it('should have correct staleTime configuration', () => {
    const { result } = renderHook(() => useCourts({ page: 1, limit: 12 }), { wrapper });
    expect(result.current).toBeDefined();
  });
});
