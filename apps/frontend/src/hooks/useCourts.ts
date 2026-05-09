import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { PaginatedResult, Court, SportType } from '@/types';

export interface GetCourtsParams {
  page: number;
  limit: number;
  name?: string;
  sportType?: SportType;
  district?: string;
  location?: string;
  [key: string]: unknown;
}

export function useCourts(params: GetCourtsParams) {
  return useQuery({
    queryKey: queryKeys.courts.list(params),
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: PaginatedResult<Court> }>(
        '/courts',
        { params },
      );
      // Backend wraps response: { success, data: { data, total, page, ... } }
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to fetch distinct districts for filtering (REQ-21.4)
 */
export function useDistricts() {
  return useQuery<string[]>({
    queryKey: ['courts', 'districts'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: string[] }>('/courts/districts');
      return response.data.data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour (districts don't change often)
  });
}
