import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import paymentsConfig from '../../../config/payments.config';
import {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProviderAdapter,
  QueryPaymentResult,
  RefundResult,
  VerifyWebhookResult,
} from './payment-provider.interface';

@Injectable()
export class PayPalProvider implements PaymentProviderAdapter {
  readonly code = 'PAYPAL' as const;

  constructor(
    @Inject(paymentsConfig.KEY)
    private readonly paymentCfg: ConfigType<typeof paymentsConfig>,
  ) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const orderId = `PAYPAL-${input.paymentId}`;
    return {
      providerOrderId: orderId,
      paymentUrl: null,
      raw: {
        apiUrl: this.paymentCfg.paypal.apiUrl || null,
        orderId,
      },
    };
  }

  async verifyWebhook(payload: Record<string, unknown>): Promise<VerifyWebhookResult> {
    const strict = this.paymentCfg.paypal.verifyStrict;
    if (strict) {
      return {
        verified: false,
        paymentStatus: 'PROCESSING',
        raw: {
          ...payload,
          note: 'Strict PayPal webhook verification requires SDK/API implementation',
        },
      };
    }
    const eventType = String(payload.event_type || payload.eventType || '');
    const isSuccess = eventType.includes('PAYMENT.CAPTURE.COMPLETED');
    const isCancelled =
      eventType.includes('PAYMENT.CAPTURE.DENIED') ||
      eventType.includes('CHECKOUT.ORDER.CANCELLED');

    return {
      verified: true,
      paymentStatus: isSuccess ? 'SUCCESS' : isCancelled ? 'CANCELLED' : 'PROCESSING',
      providerTxnId: payload.id ? String(payload.id) : undefined,
      providerOrderId:
        payload.resource && typeof payload.resource === 'object' && payload.resource !== null
          ? String((payload.resource as Record<string, unknown>).invoice_id || '')
          : undefined,
      raw: payload,
    };
  }

  async queryPayment(): Promise<QueryPaymentResult> {
    return {
      paymentStatus: 'PROCESSING',
      raw: { note: 'PayPal query API not implemented yet' },
    };
  }

  async refund(): Promise<RefundResult> {
    return {
      status: 'FAILED',
      raw: { note: 'PayPal refund API not implemented yet' },
    };
  }
}
