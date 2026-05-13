import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import { toast } from 'sonner';
import type { SlotTemplate } from '@/types';

export type SlotTemplateSummary = SlotTemplate & { itemCount?: number; courtCount?: number };

type SlotTemplateItemInput = {
  dayOfWeek: number;
  startHour: string;
  endHour: string;
  price: number;
};

export function useSlotTemplates() {
  return useQuery<SlotTemplateSummary[]>({
    queryKey: queryKeys.slotTemplates.list(),
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: SlotTemplateSummary[] }>(
        '/admin/slot-templates',
      );
      return response.data.data;
    },
  });
}

export function useCreateSlotTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      name: string;
      description?: string;
      items?: SlotTemplateItemInput[];
    }) => {
      const response = await api.post('/admin/slot-templates', dto);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.slotTemplates.list() });
      toast.success('Đã tạo mẫu slot');
    },
  });
}

export function useDeleteSlotTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/slot-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.slotTemplates.list() });
      toast.success('Đã xóa mẫu slot');
    },
  });
}

export function useApplySlotTemplate() {
  return useMutation({
    mutationFn: async (dto: {
      templateId: string;
      courtId: string;
      fromDate?: string;
      toDate?: string;
    }) => {
      const response = await api.post(
        `/admin/slot-templates/apply/${dto.templateId}/courts/${dto.courtId}`,
        {
          fromDate: dto.fromDate,
          toDate: dto.toDate,
        },
      );
      return response.data.data as { inserted: number; skipped: number };
    },
  });
}
