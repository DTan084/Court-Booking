import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';

// ==================== TYPES ====================

export interface TopCourt {
  courtId: string;
  courtName: string;
  bookingCount: number;
}

export interface AdminStats {
  totalBookings: number;
  totalRevenue: number;
  utilizationRate: number;
  topCourts: TopCourt[];
}

export interface AdminStatsParams {
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  [key: string]: unknown;
}

// ==================== HOOK ====================

/**
 * Hook to fetch admin statistics
 */
export function useAdminStats(params: AdminStatsParams) {
  return useQuery<AdminStats>({
    queryKey: queryKeys.admin.stats(params),
    queryFn: async () => {
      const response = await api.get('/admin/stats', { params });
      // Handle both wrapped and unwrapped responses
      return response.data?.data ?? response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
