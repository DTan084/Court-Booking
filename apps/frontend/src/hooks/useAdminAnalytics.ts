import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AdminAnalyticsParams {
  dateFrom: string;
  dateTo: string;
  courtId?: string;
}

export interface AdminAnalyticsData {
  window: { dateFrom: string; dateTo: string; courtId: string | null };
  kpis: {
    totalRevenue: number;
    avgUtilization: number;
    totalBookings: number;
    maintenanceCost: number;
    bookedHours?: number;
    availableHours?: number;
  };
  heatmap: Array<{ day: number; hours: Array<{ hour: number; count: number }> }>;
  revenueByCourt: Array<{
    courtId: string;
    courtName: string;
    sportTypeId: string | null;
    bookings: number;
    hoursBooked: number;
    avgHourlyRate: number;
    netRevenue: number;
  }>;
  customerDemographics?: {
    totalUniqueCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    otherCustomers: number;
    ageDistribution?: {
      age18_24: number;
      age25_34: number;
      age35_44: number;
      age45Plus: number;
    };
  };
}

export function useAdminAnalytics(params: AdminAnalyticsParams) {
  return useQuery({
    queryKey: ['admin-analytics', params],
    queryFn: async () => {
      const res = await api.get('/admin/bookings/analytics', { params });
      return (res.data?.data ?? res.data) as AdminAnalyticsData;
    },
    enabled: !!params.dateFrom && !!params.dateTo,
  });
}
