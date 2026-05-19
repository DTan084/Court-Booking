import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import { toast } from 'sonner';
import type { SlotTemplate } from '@/types';

export type SlotTemplateSummary = SlotTemplate & { itemCount?: number; courtCount?: number };
export type SlotTemplateDetail = SlotTemplate & {
  items: Array<{
    id: string;
    templateId: string;
    dayOfWeek: number;
    startHour: string;
    endHour: string;
    price: number;
  }>;
};

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

export function useSlotTemplateDetail(id: string) {
  return useQuery<SlotTemplateDetail>({
    queryKey: queryKeys.slotTemplates.detail(id || 'empty'),
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: SlotTemplateDetail }>(
        `/admin/slot-templates/${id}`,
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
      toast.success('Slot template created');
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
      toast.success('Slot template deleted');
    },
  });
}

export function useUpdateSlotTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      id: string;
      name?: string;
      description?: string | null;
      isActive?: boolean;
    }) => {
      const response = await api.patch(`/admin/slot-templates/${dto.id}`, dto);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.slotTemplates.list() });
      toast.success('Template updated');
    },
  });
}

export function useReplaceSlotTemplateItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { id: string; items: SlotTemplateItemInput[] }) => {
      const response = await api.put(`/admin/slot-templates/${dto.id}/items`, { items: dto.items });
      return response.data.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.slotTemplates.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.slotTemplates.detail(vars.id) });
      toast.success('Template items updated');
    },
  });
}

export function useApplySlotTemplate() {
  return useMutation({
    mutationFn: async (dto: {
      templateId: string;
      courtId: string;
      confirmed?: boolean;
      option?: 'SKIP_CONFLICTS' | 'OVERWRITE_CONFLICTS';
    }) => {
      const response = await api.post(
        `/admin/courts/${dto.courtId}/apply-template/${dto.templateId}`,
        {
          confirmed: dto.confirmed,
          option: dto.option,
        },
      );
      return response.data.data as
        | {
            toInsert: number;
            toSkip: number;
            conflicts: Array<{
              dayOfWeek: number;
              startHour: string;
              endHour: string;
              existingPrice: number;
              templatePrice: number;
            }>;
          }
        | { inserted: number; skipped: number; overwritten: number };
    },
  });
}
