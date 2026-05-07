import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { PaginatedResult, Court, SportType } from '@/types';

export interface GetCourtsParams {
  page: number;
  limit: number;
  name?: string;
  sportType?: SportType;
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
