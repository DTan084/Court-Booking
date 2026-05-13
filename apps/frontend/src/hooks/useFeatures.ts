import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { Feature } from '@/types';

export function useFeatures() {
  return useQuery({
    queryKey: queryKeys.features.list(),
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Feature[] }>('/features');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
