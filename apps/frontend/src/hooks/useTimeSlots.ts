import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { CourtTimeSlot } from '@/types';

export function useTimeSlots(courtId: string) {
  return useQuery({
    queryKey: queryKeys.courts.timeSlots(courtId),
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: CourtTimeSlot[] }>(
        `/courts/${courtId}/time-slots`,
      );
      // Backend wraps response: { success, data: CourtTimeSlot[] }
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!courtId,
  });
}
