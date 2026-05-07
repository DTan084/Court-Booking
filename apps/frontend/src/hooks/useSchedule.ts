import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { Booking } from '@/types';

export function useSchedule(courtId: string, date: string) {
  return useQuery({
    queryKey: queryKeys.courts.schedule(courtId, date),
    queryFn: async () => {
      const response = await api.get(`/courts/${courtId}/schedule`, { params: { date } });
      // TransformInterceptor wraps: { success, data: Booking[], meta }
      // Handle both wrapped and unwrapped responses
      const payload = response.data;
      if (payload?.success !== undefined && Array.isArray(payload?.data)) {
        return payload.data as Booking[];
      }
      if (Array.isArray(payload)) {
        return payload as Booking[];
      }
      return [] as Booking[];
    },
    staleTime: 0, // Always refetch schedule — bookings change frequently
    refetchOnWindowFocus: true,
  });
}
