import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import type { CourtStatus, Court, CourtType, CourtImage } from '@/types';

// ==================== TYPES ====================

export interface CreateCourtDto {
  name: string;
  sportTypeId: string;
  courtType: CourtType;
  address: string;
  pricePerHour: number;
  description?: string;
  district?: string;
  maxPlayers?: number | null;
  isFeatured?: boolean;
}

export interface UpdateCourtDto {
  name?: string;
  sportTypeId?: string;
  courtType?: CourtType;
  address?: string;
  pricePerHour?: number;
  description?: string;
  district?: string;
  maxPlayers?: number | null;
  isFeatured?: boolean;
  status?: CourtStatus;
}

export interface AddCourtImageDto {
  file: File;
  altText?: string;
  displayOrder?: number;
}

export interface TimeSlotInput {
  dayOfWeek: number;
  startHour: number;
  endHour: number;
  price: number;
}

export interface UpsertTimeSlotsDto {
  slots: TimeSlotInput[];
}

export interface SyncCourtFeaturesDto {
  courtId: string;
  featureIds: string[];
}

type ApiErrorPayload = {
  error?: { message?: string };
  message?: string;
};

// ==================== HOOKS ====================

/**
 * Hook to create a new court (admin only)
 */
export function useCreateCourt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateCourtDto) => {
      const response = await api.post<{ success: boolean; data: Court }>('/courts', dto);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courts.all });
      toast.success('Court created successfully');
    },
    onError: (error: AxiosError<ApiErrorPayload>) => {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.response?.data?.message || '';
      if (status === 409) {
        toast.error('Court name already exists');
      } else if (status === 400) {
        toast.error(message || 'Invalid input data');
      } else {
        toast.error('Failed to create court, please try again');
      }
    },
  });
}

/**
 * Hook to update a court (admin only)
 */
export function useUpdateCourt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateCourtDto }) => {
      const response = await api.patch<Court & { autoCancelledBookings?: number }>(
        `/courts/${id}`,
        dto,
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.courts.detail(variables.id) });
      toast.success('Court updated successfully');
    },
    onError: (error: AxiosError<ApiErrorPayload>) => {
      const message = error.response?.data?.error?.message || error.response?.data?.message || '';
      toast.error(message || 'Failed to update court, please try again');
    },
  });
}

/**
 * Hook to delete a court (admin only)
 */
export function useDeleteCourt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{
        message: string;
        id: string;
        autoCancelledBookings?: number;
      }>(`/courts/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courts.all });
      toast.success('Court deleted successfully');
    },
    onError: (error: AxiosError<ApiErrorPayload>) => {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.response?.data?.message || '';
      if (status === 400 && message.toLowerCase().includes('booking')) {
        toast.error('Cannot delete court with active bookings');
      } else if (status === 404) {
        toast.error('Court does not exist or has already been deleted');
      } else {
        toast.error('Failed to delete court, please try again');
      }
    },
  });
}

export function useRestoreCourt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/courts/${id}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courts.all });
      toast.success('Court restored successfully');
    },
  });
}

export function useHardDeleteCourt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/courts/${id}/hard`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courts.all });
      toast.success('Permanently deleted court');
    },
  });
}

/**
 * Hook to upsert time slots for a court (admin only)
 */
export function useUpsertTimeSlots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courtId, dto }: { courtId: string; dto: UpsertTimeSlotsDto }) => {
      const response = await api.put<{ success: boolean; data: { slots: TimeSlotInput[] } }>(
        `/courts/${courtId}/time-slots`,
        dto,
      );
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.courts.timeSlots(variables.courtId),
      });
      toast.success('Time slots updated successfully');
    },
    onError: (error: AxiosError<ApiErrorPayload>) => {
      const message = error.response?.data?.error?.message || error.response?.data?.message || '';
      toast.error(message || 'Failed to update time slots, please try again');
    },
  });
}

export function useAddCourtImage(courtId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: AddCourtImageDto) => {
      const formData = new FormData();
      formData.append('file', dto.file);
      if (dto.altText) {
        formData.append('altText', dto.altText);
      }
      if (dto.displayOrder !== undefined) {
        formData.append('displayOrder', String(dto.displayOrder));
      }
      const response = await api.post<{ success: boolean; data: CourtImage }>(
        `/courts/${courtId}/images`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courts.detail(courtId) });
      toast.success('Image added successfully');
    },
  });
}

export function useDeleteCourtImage(courtId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (imageId: string) => {
      await api.delete(`/courts/${courtId}/images/${imageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courts.detail(courtId) });
      toast.success('Image deleted successfully');
    },
  });
}

export function useReorderCourtImages(courtId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (images: Array<{ imageId: string; displayOrder: number }>) => {
      const response = await api.patch<{ success: boolean; data: CourtImage[] }>(
        `/courts/${courtId}/images/reorder`,
        { images },
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courts.detail(courtId) });
    },
    onError: (error: AxiosError<ApiErrorPayload>) => {
      const message = error.response?.data?.error?.message || error.response?.data?.message || '';
      toast.error(message || 'Failed to reorder images, please try again');
      // Debug quickly in browser console when BE returns validation details.
      console.error('reorder court images failed:', error.response?.data);
    },
  });
}

export function useUpdateCourtImageAlt(courtId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ imageId, altText }: { imageId: string; altText?: string }) => {
      const response = await api.patch<{ success: boolean; data: CourtImage }>(
        `/courts/${courtId}/images/${imageId}`,
        { altText },
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courts.detail(courtId) });
      toast.success('Alt text updated successfully');
    },
  });
}

export function useSyncCourtFeatures() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ courtId, featureIds }: SyncCourtFeaturesDto) => {
      const response = await api.put<{ success: boolean; data: unknown }>(
        `/courts/${courtId}/features`,
        { featureIds },
      );
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courts.detail(variables.courtId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.courts.all });
    },
  });
}
