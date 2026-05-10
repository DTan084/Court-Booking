import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import type { SportType, CourtStatus, Court } from '@/types';

// ==================== TYPES ====================

export interface CreateCourtDto {
  name: string;
  sportType: SportType;
  address: string;
  pricePerHour: number;
}

export interface UpdateCourtDto {
  name?: string;
  sportType?: SportType;
  address?: string;
  pricePerHour?: number;
  status?: CourtStatus;
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
      toast.success('Tạo sân thành công');
    },
    onError: (error: AxiosError<ApiErrorPayload>) => {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.response?.data?.message || '';
      if (status === 409) {
        toast.error('Tên sân đã tồn tại');
      } else if (status === 400) {
        toast.error(message || 'Dữ liệu không hợp lệ');
      } else {
        toast.error('Không thể tạo sân, vui lòng thử lại');
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
      const response = await api.patch<{ success: boolean; data: Court }>(`/courts/${id}`, dto);
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.courts.detail(variables.id) });
      toast.success('Cập nhật sân thành công');
    },
    onError: (error: AxiosError<ApiErrorPayload>) => {
      const message = error.response?.data?.error?.message || error.response?.data?.message || '';
      toast.error(message || 'Không thể cập nhật sân, vui lòng thử lại');
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
      const response = await api.delete<{ success: boolean; data: Court }>(`/courts/${id}`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courts.all });
      toast.success('Xóa sân thành công');
    },
    onError: (error: AxiosError<ApiErrorPayload>) => {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.response?.data?.message || '';
      if (status === 400 && message.toLowerCase().includes('booking')) {
        toast.error('Không thể xóa sân có booking');
      } else if (status === 404) {
        toast.error('Sân không tồn tại hoặc đã bị xóa');
      } else {
        toast.error('Không thể xóa sân, vui lòng thử lại');
      }
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
      toast.success('Cập nhật khung giờ thành công');
    },
    onError: (error: AxiosError<ApiErrorPayload>) => {
      const message = error.response?.data?.error?.message || error.response?.data?.message || '';
      toast.error(message || 'Không thể cập nhật khung giờ, vui lòng thử lại');
    },
  });
}
