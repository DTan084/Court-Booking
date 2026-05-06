import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { Booking } from '@/types';

export function useSchedule(courtId: string, date: string) {
  return useQuery({
    queryKey: queryKeys.courts.schedule(courtId, date),
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Booking[] }>(
        `/courts/${courtId}/schedule`,
        {
          params: { date },
        },
      );
      // Backend wraps response: { success, data: Booking[] }
      return response.data.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute - schedule changes more frequently
  });
}
