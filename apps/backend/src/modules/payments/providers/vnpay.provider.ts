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
export class VNPayProvider implements PaymentProviderAdapter {
  readonly code = 'VNPAY' as const;

  constructor(
    @Inject(paymentsConfig.KEY)
    private readonly paymentCfg: ConfigType<typeof paymentsConfig>,
  ) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const orderId = `VNPAY-${input.paymentId}`;
    return {
      providerOrderId: orderId,
      paymentUrl: null,
      raw: {
        tmnCode: this.paymentCfg.vnpay.tmnCode || null,
        orderId,
      },
    };
  }

  async verifyWebhook(payload: Record<string, unknown>): Promise<VerifyWebhookResult> {
    const secureHash = String(payload.vnp_SecureHash || '');
    const secret = this.paymentCfg.vnpay.hashSecret;
    if (!secureHash || !secret) {
      return {
        verified: false,
        paymentStatus: 'PROCESSING',
        raw: payload,
      };
    }

    const clone: Record<string, string> = {};
    Object.entries(payload).forEach(([k, v]) => {
      if (k === 'vnp_SecureHash' || k === 'vnp_SecureHashType') return;
      if (v === null || v === undefined) return;
      clone[k] = String(v);
    });
    const rawData = Object.keys(clone)
      .sort()
      .map((k) => `${k}=${encodeURIComponent(clone[k]).replace(/%20/g, '+')}`)
      .join('&');
    const expected = createHmac('sha512', secret).update(rawData).digest('hex');
    const responseCode = String(payload.vnp_ResponseCode || '');

    return {
      verified: expected.toLowerCase() === secureHash.toLowerCase(),
      paymentStatus: responseCode === '00' ? 'SUCCESS' : 'FAILED',
      providerTxnId: payload.vnp_TransactionNo ? String(payload.vnp_TransactionNo) : undefined,
      providerOrderId: payload.vnp_TxnRef ? String(payload.vnp_TxnRef) : undefined,
      raw: payload,
    };
  }

  async queryPayment(): Promise<QueryPaymentResult> {
    return {
      paymentStatus: 'PROCESSING',
      raw: { note: 'VNPay query API not implemented yet' },
    };
  }

  async refund(): Promise<RefundResult> {
    return {
      status: 'FAILED',
      raw: { note: 'VNPay refund API not implemented yet' },
    };
  }
}
