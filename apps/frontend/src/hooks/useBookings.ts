import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import type { Booking, Court, PaginatedResult, BookingStatus, BookingSource } from '@/types';

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

export interface CreateAdminBookingDto {
  courtId: string;
  startTime: string;
  endTime: string;
  userId?: string | null;
  guestName?: string;
  guestPhone?: string;
  note?: string;
  paymentMethod?: string;
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
      const response = await api.post<{ success: boolean; data: BookingWithCourt }>(
        '/bookings',
        dto,
      );
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      // Build date string from UTC parts of startTime (matches backend query format)
      const startDate = new Date(variables.startTime);
      const y = startDate.getUTCFullYear();
      const m = String(startDate.getUTCMonth() + 1).padStart(2, '0');
      const d = String(startDate.getUTCDate()).padStart(2, '0');
      const date = `${y}-${m}-${d}`;

      // Force immediate refetch of the schedule (not just mark stale)
      queryClient.refetchQueries({
        queryKey: queryKeys.courts.schedule(variables.courtId, date),
      });

      // Also refetch all schedules for this court to cover any date mismatch
      queryClient.refetchQueries({
        queryKey: ['courts', variables.courtId, 'schedule'],
        type: 'active',
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
      const response = await api.patch<{ success: boolean; data: BookingWithCourt }>(
        `/bookings/${id}/cancel`,
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.courts.all });
      toast.success('Hủy đặt sân thành công');
    },
    onError: (error: AxiosError<ApiErrorPayload>) => {
      const message = error.response?.data?.message || '';

      if (message.includes('12 giờ')) {
        toast.error('Không thể hủy đặt sân trong vòng 12 giờ trước giờ chơi');
      } else if (message.includes('24 giờ')) {
        toast.error('Chỉ có thể hủy trong vòng 24 giờ kể từ khi đặt');
      } else {
        toast.error('Không thể hủy đặt sân, vui lòng thử lại');
      }
    },
  });
}

/**
 * Hook to fetch a single booking detail (REQ-18.10)
 */
export function useBooking(id: string, options?: { refetchInterval?: number }) {
  return useQuery<BookingWithCourt>({
    queryKey: queryKeys.bookings.detail(id),
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: BookingWithCourt }>(
        `/bookings/${id}`,
      );
      return response.data.data;
    },
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook to confirm payment (REQ-17)
 */
export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ success: boolean; data: BookingWithCourt }>(
        `/bookings/${id}/confirm-payment`,
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      toast.success('Thanh toán thành công!');
    },
    onError: (error: AxiosError<ApiErrorPayload>) => {
      const status = error.response?.status;
      const message = error.response?.data?.message || '';

      if (status === 400 && message.includes('hết hạn')) {
        toast.error('Booking đã hết hạn thanh toán');
      } else if (status === 409) {
        toast.error('Booking này đã được thanh toán');
      } else {
        toast.error('Không thể xác nhận thanh toán, vui lòng thử lại');
      }
    },
  });
}

export function useAdminBookings(params: {
  page: number;
  limit: number;
  status?: BookingStatus;
  bookingSource?: BookingSource;
  courtId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery<PaginatedResult<BookingWithCourt>>({
    queryKey: queryKeys.adminBookings.list(params),
    queryFn: async () => {
      const response = await api.get('/admin/bookings', { params });
      return response.data.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateAdminBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateAdminBookingDto) => {
      const response = await api.post('/admin/bookings', dto);
      return response.data.data as BookingWithCourt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      toast.success('Đã tạo booking hộ');
    },
  });
}
