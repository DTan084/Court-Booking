import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { toast } from 'sonner';
import { api, queryKeys } from '@/lib/api';

type ApiErrorPayload = {
  error?: { message?: string };
  message?: string;
};

type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  meta?: {
    timestamp?: string;
    requestId?: string;
    path?: string;
  };
};

export type PaymentProvider = 'VNPAY';
export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIAL_REFUND'
  | 'RECONCILING';

export interface InitiatePaymentResponse {
  paymentId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  paymentUrl: string | null;
  providerOrderId: string | null;
}

export interface PaymentStatusResponse {
  paymentId: string;
  paymentStatus: PaymentStatus;
  bookingStatus: string | null;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  completedAt: string | null;
}

export interface PaymentLookupResponse extends PaymentStatusResponse {
  bookingId: string;
  providerOrderId: string | null;
  providerTxnId: string | null;
  lastEvents: Array<{
    id: string;
    eventType: string;
    direction: 'IN' | 'OUT';
    isVerified: boolean | null;
    createdAt: string;
  }>;
}

const getErrorMessage = (error: AxiosError<ApiErrorPayload>, fallback: string) =>
  error.response?.data?.error?.message || error.response?.data?.message || fallback;

const unwrapResponse = <T>(payload: T | ApiSuccessEnvelope<T>): T => {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return (payload as ApiSuccessEnvelope<T>).data;
  }

  return payload as T;
};

export function useInitiatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { bookingId: string; provider: PaymentProvider }) => {
      const response = await api.post('/payments/initiate', params);
      return unwrapResponse<InitiatePaymentResponse>(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(variables.bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
    onError: (error: AxiosError<ApiErrorPayload>) => {
      toast.error(getErrorMessage(error, 'Failed to initiate payment'));
    },
  });
}

export function usePaymentStatus(
  paymentId: string,
  options?: { enabled?: boolean; refetchMs?: number },
) {
  return useQuery<PaymentStatusResponse>({
    queryKey: queryKeys.payments.detail(paymentId),
    queryFn: async () => {
      const response = await api.get(`/payments/${paymentId}/status`);
      return unwrapResponse<PaymentStatusResponse>(response.data);
    },
    enabled: Boolean(paymentId) && (options?.enabled ?? true),
    refetchInterval: options?.refetchMs ?? 10000,
  });
}

export function usePaymentLookup(
  params: { providerOrderId?: string; providerTxnId?: string },
  enabled = true,
) {
  return useQuery<PaymentLookupResponse>({
    queryKey: queryKeys.payments.lookup(params),
    queryFn: async () => {
      const response = await api.get('/payments/admin/lookup', { params });
      return unwrapResponse<PaymentLookupResponse>(response.data);
    },
    enabled: enabled && (Boolean(params.providerOrderId) || Boolean(params.providerTxnId)),
    retry: false,
  });
}

export function useReconcilePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await api.post(`/payments/${paymentId}/reconcile`);
      return unwrapResponse<{ paymentId: string; status: PaymentStatus }>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      toast.success('Payment reconcile requested');
    },
    onError: (error: AxiosError<ApiErrorPayload>) => {
      toast.error(getErrorMessage(error, 'Failed to request reconcile'));
    },
  });
}
