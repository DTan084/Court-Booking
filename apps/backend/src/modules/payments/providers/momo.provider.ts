import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { createHmac } from 'crypto';
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
export class MoMoProvider implements PaymentProviderAdapter {
  readonly code = 'MOMO' as const;

  constructor(
    @Inject(paymentsConfig.KEY)
    private readonly paymentCfg: ConfigType<typeof paymentsConfig>,
  ) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const orderId = `MOMO-${input.paymentId}`;
    return {
      providerOrderId: orderId,
      paymentUrl: null,
      raw: {
        partnerCode: this.paymentCfg.momo.partnerCode || null,
        orderId,
      },
    };
  }

  async verifyWebhook(payload: Record<string, unknown>): Promise<VerifyWebhookResult> {
    const signature = String(payload.signature || '');
    const secret = this.paymentCfg.momo.secretKey;
    if (!signature || !secret) {
      return {
        verified: false,
        paymentStatus: 'PROCESSING',
        raw: payload,
      };
    }

    const normalized: Record<string, string> = {};
    Object.entries(payload).forEach(([k, v]) => {
      if (k === 'signature') return;
      if (v === null || v === undefined) return;
      normalized[k] = String(v);
    });
    const rawSignature = Object.keys(normalized)
      .sort()
      .map((k) => `${k}=${normalized[k]}`)
      .join('&');
    const expected = createHmac('sha256', secret).update(rawSignature).digest('hex');
    const resultCode = String(payload.resultCode ?? '');
    const isSuccess = resultCode === '0';

    return {
      verified: expected.toLowerCase() === signature.toLowerCase(),
      paymentStatus: isSuccess ? 'SUCCESS' : 'FAILED',
      providerTxnId: payload.transId ? String(payload.transId) : undefined,
      providerOrderId: payload.orderId ? String(payload.orderId) : undefined,
      raw: payload,
    };
  }

  async queryPayment(): Promise<QueryPaymentResult> {
    return {
      paymentStatus: 'PROCESSING',
      raw: { note: 'MoMo query API not implemented yet' },
    };
  }

  async refund(): Promise<RefundResult> {
    return {
      status: 'FAILED',
      raw: { note: 'MoMo refund API not implemented yet' },
    };
  }
}
