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
      const response = await api.get<{ success: boolean; data: SportTypeItem[] }>('/sport-types');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
