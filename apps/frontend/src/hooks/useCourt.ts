import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { Court } from '@/types';

export function useCourt(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.courts.detail(id),
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Court }>(`/courts/${id}`);
      // Backend wraps response: { success, data: Court }
      return response.data.data;
    },
    enabled: enabled && Boolean(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
