import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, queryKeys } from '@/lib/api';

type ApiErrorPayload = {
  error?: { message?: string };
  message?: string;
};

type ApiEnvelope<T> = {
  data?: T;
};

type FeatureAdminItem = {
  id: string;
  name: string;
  icon?: string | null;
  category?: string | null;
  isActive: boolean;
  courtCount?: number;
};

type SportTypeAdminItem = {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  isActive: boolean;
  displayOrder: number;
  courtCount?: number;
};

const unwrap = <T>(payload: unknown): T => {
  const maybe = payload as ApiEnvelope<T> | T;
  if (maybe && typeof maybe === 'object' && 'data' in (maybe as ApiEnvelope<T>)) {
    return (maybe as ApiEnvelope<T>).data as T;
  }
  return maybe as T;
};

const readErrorMessage = (error: unknown, fallback: string) => {
  const data = (error as { response?: { data?: ApiErrorPayload } })?.response?.data;
  return data?.error?.message || data?.message || fallback;
};

export function useAdminFeatures() {
  return useQuery({
    queryKey: ['admin', ...queryKeys.features.list()],
    queryFn: async () => {
      const res = await api.get('/admin/features');
      return unwrap<FeatureAdminItem[]>(res.data);
    },
  });
}

export function useCreateFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { name: string; icon?: string; category?: string }) => {
      const res = await api.post('/admin/features', dto);
      return unwrap<FeatureAdminItem>(res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', ...queryKeys.features.list()] });
      queryClient.invalidateQueries({ queryKey: queryKeys.features.list() });
      toast.success('Feature created');
    },
    onError: (error: unknown) => {
      toast.error(readErrorMessage(error, 'Cannot create feature'));
    },
  });
}

export function useUpdateFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      dto,
    }: {
      id: string;
      dto: { name?: string; icon?: string | null; category?: string | null; isActive?: boolean };
    }) => {
      const res = await api.patch(`/admin/features/${id}`, dto);
      return unwrap<FeatureAdminItem>(res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', ...queryKeys.features.list()] });
      queryClient.invalidateQueries({ queryKey: queryKeys.features.list() });
      toast.success('Feature updated');
    },
    onError: (error: unknown) => {
      toast.error(readErrorMessage(error, 'Cannot update feature'));
    },
  });
}

export function useDeleteFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/features/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', ...queryKeys.features.list()] });
      queryClient.invalidateQueries({ queryKey: queryKeys.features.list() });
      toast.success('Feature deleted');
    },
    onError: (error: unknown) => {
      toast.error(readErrorMessage(error, 'Cannot delete feature'));
    },
  });
}

export function useHardDeleteFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/features/${id}/hard`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', ...queryKeys.features.list()] });
      queryClient.invalidateQueries({ queryKey: queryKeys.features.list() });
      toast.success('Feature permanently deleted');
    },
    onError: (error: unknown) => {
      toast.error(readErrorMessage(error, 'Cannot permanently delete feature'));
    },
  });
}

export function useAdminSportTypes() {
  return useQuery({
    queryKey: ['admin', ...queryKeys.sportTypes.list()],
    queryFn: async () => {
      const res = await api.get('/admin/sport-types');
      return unwrap<SportTypeAdminItem[]>(res.data);
    },
  });
}

export function useCreateSportType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: {
      name: string;
      icon?: string;
      color?: string;
      displayOrder?: number;
    }) => {
      const res = await api.post('/admin/sport-types', dto);
      return unwrap<SportTypeAdminItem>(res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', ...queryKeys.sportTypes.list()] });
      queryClient.invalidateQueries({ queryKey: queryKeys.sportTypes.list() });
      toast.success('Sport type created');
    },
    onError: (error: unknown) => {
      toast.error(readErrorMessage(error, 'Cannot create sport type'));
    },
  });
}

export function useUpdateSportType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      dto,
    }: {
      id: string;
      dto: {
        name?: string;
        icon?: string | null;
        color?: string | null;
        displayOrder?: number;
        isActive?: boolean;
      };
    }) => {
      const res = await api.patch(`/admin/sport-types/${id}`, dto);
      return unwrap<SportTypeAdminItem>(res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', ...queryKeys.sportTypes.list()] });
      queryClient.invalidateQueries({ queryKey: queryKeys.sportTypes.list() });
      toast.success('Sport type updated');
    },
    onError: (error: unknown) => {
      toast.error(readErrorMessage(error, 'Cannot update sport type'));
    },
  });
}

export function useDeleteSportType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/sport-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', ...queryKeys.sportTypes.list()] });
      queryClient.invalidateQueries({ queryKey: queryKeys.sportTypes.list() });
      toast.success('Sport type deleted');
    },
    onError: (error: unknown) => {
      toast.error(readErrorMessage(error, 'Cannot delete sport type'));
    },
  });
}

export function useHardDeleteSportType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/sport-types/${id}/hard`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', ...queryKeys.sportTypes.list()] });
      queryClient.invalidateQueries({ queryKey: queryKeys.sportTypes.list() });
      toast.success('Sport type permanently deleted');
    },
    onError: (error: unknown) => {
      toast.error(readErrorMessage(error, 'Cannot permanently delete sport type'));
    },
  });
}

export type { FeatureAdminItem, SportTypeAdminItem };
