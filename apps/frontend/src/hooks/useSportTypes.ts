import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';

export interface SportTypeItem {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  isActive: boolean;
  displayOrder: number;
}

export function useSportTypes() {
  return useQuery({
    queryKey: queryKeys.sportTypes.list(),
    queryFn: async () => {
      const response = await api.get<{ data?: SportTypeItem[] } | SportTypeItem[]>('/sport-types');
      const payload = response.data as { data?: SportTypeItem[] } | SportTypeItem[];
      return Array.isArray(payload) ? payload : (payload.data ?? []);
    },
    staleTime: 5 * 60 * 1000,
  });
}
