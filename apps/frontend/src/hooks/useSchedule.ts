import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { Booking } from '@/types';

export function useSchedule(courtId: string, date: string) {
  return useQuery({
    queryKey: queryKeys.courts.schedule(courtId, date),
    queryFn: async () => {
      const response = await api.get<Booking[]>(`/courts/${courtId}/schedule`, {
        params: { date },
      });
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute - schedule changes more frequently
  });
}
