import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import type { Booking, Court, PaginatedResult, BookingStatus } from '@/types';

// ==================== TYPES ====================

export interface GetBookingsParams {
  page: number;
  limit: number;
  status?: BookingStatus;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  [key: string]: unknown; // Add index signature
}

export interface CreateBookingDto {
  courtId: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
}

export type BookingWithCourt = Booking & { court: Court };

type ApiErrorPayload = {
  error?: { message?: string };
  message?: string;
};

// ==================== HOOKS ====================

/**
 * Hook to fetch user's bookings with pagination and filters
 */
export function useMyBookings(params: GetBookingsParams) {
  return useQuery<PaginatedResult<BookingWithCourt>>({
    queryKey: queryKeys.bookings.myList(params),
    queryFn: async () => {
      const response = await api.get('/bookings/me', { params });
      const payload = response.data?.data ?? response.data;

      if (payload?.meta && payload?.data) {
        return payload as PaginatedResult<BookingWithCourt>;
      }

      if (payload?.totalPages !== undefined) {
        return {
          data: payload.data ?? [],
          meta: {
            total: payload.total ?? payload.data?.length ?? 0,
            page: payload.page ?? 1,
            limit: payload.limit ?? payload.data?.length ?? 0,
            totalPages: payload.totalPages ?? 1,
          },
        } as PaginatedResult<BookingWithCourt>;
      }

      return payload as PaginatedResult<BookingWithCourt>;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    placeholderData: keepPreviousData, // Keep previous data while fetching new page
  });
}

/**
 * Hook to create a new booking
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateBookingDto) => {
      const response = await api.post('/bookings', dto);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate schedule for the booked court
      const date = new Date(variables.startTime).toISOString().split('T')[0];
      queryClient.invalidateQueries({
        queryKey: queryKeys.courts.schedule(variables.courtId, date),
      });

      // Invalidate user's booking list
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.all,
      });

      toast.success('Đặt sân thành công!');
    },
    onError: (error: AxiosError<ApiErrorPayload>) => {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.response?.data?.message || '';

      if (status === 409) {
        toast.error('Khung giờ này đã được đặt, vui lòng chọn giờ khác');
      } else if (status === 400 && message.toLowerCase().includes('time slot')) {
        toast.error('Khung giờ không hợp lệ theo lịch hoạt động của sân');
      } else if (status === 400) {
        toast.error(`Lỗi: ${message || 'Dữ liệu không hợp lệ'}`);
      } else {
        toast.error('Không thể đặt sân, vui lòng thử lại');
      }
    },
  });
}

/**
 * Hook to cancel a booking
 */
export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/bookings/${id}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate user's booking list
      queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.all,
      });

      // Invalidate all court schedules (we don't know which court was affected)
      queryClient.invalidateQueries({
        queryKey: queryKeys.courts.all,
      });

      toast.success('Hủy đặt sân thành công');
    },
    onError: (error: AxiosError<ApiErrorPayload>) => {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.response?.data?.message || '';

      if (status === 400 && message.toLowerCase().includes('2 hour')) {
        toast.error('Không thể hủy đặt sân trong vòng 2 giờ trước giờ chơi');
      } else {
        toast.error('Không thể hủy đặt sân, vui lòng thử lại');
      }
    },
  });
}
