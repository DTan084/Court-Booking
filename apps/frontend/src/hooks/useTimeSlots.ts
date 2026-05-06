import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { CourtTimeSlot } from '@/types';

export function useTimeSlots(courtId: string) {
  return useQuery({
    queryKey: queryKeys.courts.timeSlots(courtId),
    queryFn: async () => {
      const response = await api.get<CourtTimeSlot[]>(`/courts/${courtId}/time-slots`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
