import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { Feature } from '@/types';

export function useFeatures() {
  return useQuery({
    queryKey: queryKeys.features.list(),
    queryFn: async () => {
      const response = await api.get<{ data?: Feature[] } | Feature[]>('/features');
      const payload = response.data as { data?: Feature[] } | Feature[];
      return Array.isArray(payload) ? payload : (payload.data ?? []);
    },
    staleTime: 5 * 60 * 1000,
  });
}
