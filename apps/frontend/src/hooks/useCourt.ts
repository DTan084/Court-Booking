import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type { Court } from '@/types';

export function useCourt(id: string) {
  return useQuery({
    queryKey: queryKeys.courts.detail(id),
    queryFn: async () => {
      const response = await api.get<Court>(`/courts/${id}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
