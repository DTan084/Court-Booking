export type PaymentProviderCode = 'VNPAY' | 'MOMO' | 'PAYPAL';

export interface CreatePaymentInput {
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: string;
  returnUrl?: string;
}

export interface CreatePaymentResult {
  providerOrderId: string;
  paymentUrl: string | null;
  raw: Record<string, unknown>;
}

export interface VerifyWebhookResult {
  verified: boolean;
  paymentStatus: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'PROCESSING';
  providerTxnId?: string;
  providerOrderId?: string;
  raw: Record<string, unknown>;
}

export interface RefundResult {
  status: 'REFUNDED' | 'PARTIAL_REFUND' | 'FAILED';
  raw: Record<string, unknown>;
}

export interface QueryPaymentResult {
  paymentStatus: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'PROCESSING';
  providerTxnId?: string;
  raw: Record<string, unknown>;
}

export interface PaymentProviderAdapter {
  readonly code: PaymentProviderCode;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyWebhook(
    payload: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<VerifyWebhookResult>;
  queryPayment(paymentRef: {
    providerOrderId?: string | null;
    providerTxnId?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<QueryPaymentResult>;
  refund(
    paymentRef: {
      providerOrderId?: string | null;
      providerTxnId?: string | null;
      metadata?: Record<string, unknown> | null;
    },
    amount?: number,
  ): Promise<RefundResult>;
}
