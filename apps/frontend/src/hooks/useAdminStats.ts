import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';

// ==================== TYPES ====================

export interface CourtStats {
  courtId: string;
  courtName: string;
  period: { from: string; to: string };
  totalBookings: number;
  totalHours: number;
  utilizationPercentage: number;
  totalAvailableHours: number;
}

export interface CourtStatsParams {
  fromDate: string; // ISO 8601 datetime e.g. "2026-04-01T00:00:00.000Z"
  toDate: string; // ISO 8601 datetime
  [key: string]: unknown;
}

export interface TopCourt {
  courtId: string;
  courtName: string;
  bookingCount: number;
}

// ==================== HOOK ====================

/**
 * Hook to fetch stats for a specific court (admin only)
 */
export function useCourtStats(courtId: string, params: CourtStatsParams) {
  return useQuery<CourtStats>({
    queryKey: queryKeys.courts.stats(courtId, params),
    queryFn: async () => {
      const response = await api.get(`/courts/${courtId}/stats`, { params });
      return response.data?.data ?? response.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!courtId,
  });
}
