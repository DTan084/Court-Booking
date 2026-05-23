import { Injectable } from '@nestjs/common';
import {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProviderAdapter,
  RefundResult,
  VerifyWebhookResult,
} from './payment-provider.interface';

@Injectable()
export class PayPalProvider implements PaymentProviderAdapter {
  readonly code = 'PAYPAL' as const;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return {
      providerOrderId: `PAYPAL-${input.paymentId}`,
      paymentUrl: null,
      raw: { placeholder: true },
    };
  }

  async verifyWebhook(payload: Record<string, unknown>): Promise<VerifyWebhookResult> {
    return {
      verified: false,
      paymentStatus: 'PROCESSING',
      raw: payload,
    };
  }

  async refund(): Promise<RefundResult> {
    return {
      status: 'FAILED',
      raw: { placeholder: true },
    };
  }
}
