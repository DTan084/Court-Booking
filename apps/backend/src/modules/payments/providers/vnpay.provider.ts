import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';
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
  private readonly version = '2.1.0';

  constructor(
    @Inject(paymentsConfig.KEY)
    private readonly paymentCfg: ConfigType<typeof paymentsConfig>,
  ) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const orderId = `VNPAY-${input.paymentId}`;
    const now = new Date();
    const createDate = this.toVnpDate(now);
    const expireDate = this.toVnpDate(
      new Date(now.getTime() + this.paymentCfg.vnpay.expireMinutes * 60_000),
    );
    const amount = Math.round(input.amount * 100);
    const params: Record<string, string> = {
      vnp_Version: this.version,
      vnp_Command: 'pay',
      vnp_TmnCode: this.paymentCfg.vnpay.tmnCode,
      vnp_Amount: String(amount),
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
      vnp_CurrCode: 'VND',
      vnp_IpAddr: input.clientIp || '127.0.0.1',
      vnp_Locale: this.paymentCfg.vnpay.locale || 'vn',
      vnp_OrderInfo: this.normalizeOrderInfo(`Thanh toan dat san ${input.bookingId}`),
      vnp_OrderType: this.paymentCfg.vnpay.orderType || 'other',
      vnp_ReturnUrl: input.returnUrl || this.paymentCfg.vnpay.returnUrl,
      vnp_TxnRef: orderId,
    };

    const paymentUrl =
      this.paymentCfg.vnpay.payUrl && this.paymentCfg.vnpay.hashSecret
        ? this.buildSignedPaymentUrl(params)
        : null;

    return {
      providerOrderId: orderId,
      paymentUrl,
      raw: {
        tmnCode: this.paymentCfg.vnpay.tmnCode || null,
        orderId,
        vnp_CreateDate: createDate,
        vnp_Amount: amount,
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
      paymentStatus: this.mapIpnStatus(responseCode),
      providerTxnId: payload.vnp_TransactionNo ? String(payload.vnp_TransactionNo) : undefined,
      providerOrderId: payload.vnp_TxnRef ? String(payload.vnp_TxnRef) : undefined,
      raw: payload,
    };
  }

  async queryPayment(paymentRef: {
    providerOrderId?: string | null;
    providerTxnId?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<QueryPaymentResult> {
    if (
      !this.paymentCfg.vnpay.queryUrl ||
      !paymentRef.providerOrderId ||
      !this.paymentCfg.vnpay.tmnCode ||
      !this.paymentCfg.vnpay.hashSecret
    ) {
      return {
        paymentStatus: 'PROCESSING',
        raw: { note: 'VNPay query API config missing' },
      };
    }

    const createDateFromMeta = paymentRef.metadata?.vnp_CreateDate;
    const txnDate = typeof createDateFromMeta === 'string' ? createDateFromMeta : null;
    if (!txnDate) {
      return {
        paymentStatus: 'PROCESSING',
        raw: { note: 'VNPay query API requires original vnp_CreateDate' },
      };
    }

    const requestId = randomUUID().replace(/-/g, '');
    const payload: Record<string, string> = {
      vnp_RequestId: requestId,
      vnp_Version: this.version,
      vnp_Command: 'querydr',
      vnp_TmnCode: this.paymentCfg.vnpay.tmnCode,
      vnp_TxnRef: paymentRef.providerOrderId,
      vnp_OrderInfo: `Query payment ${paymentRef.providerOrderId}`,
      vnp_TransactionDate: txnDate,
      vnp_CreateDate: this.toVnpDate(new Date()),
      vnp_IpAddr: '127.0.0.1',
    };
    payload.vnp_SecureHash = this.signPipe(payload, [
      'vnp_RequestId',
      'vnp_Version',
      'vnp_Command',
      'vnp_TmnCode',
      'vnp_TxnRef',
      'vnp_TransactionDate',
      'vnp_CreateDate',
      'vnp_IpAddr',
      'vnp_OrderInfo',
    ]);

    const response = await this.postJson(this.paymentCfg.vnpay.queryUrl, payload);
    const responseCode = String(response.vnp_ResponseCode || '');
    const transactionStatus = String(response.vnp_TransactionStatus || '');

    return {
      paymentStatus: this.mapVnpStatus(responseCode, transactionStatus),
      providerTxnId: response.vnp_TransactionNo ? String(response.vnp_TransactionNo) : undefined,
      raw: response,
    };
  }

  async refund(
    paymentRef: {
      providerOrderId?: string | null;
      providerTxnId?: string | null;
      metadata?: Record<string, unknown> | null;
    },
    amount?: number,
  ): Promise<RefundResult> {
    if (
      !this.paymentCfg.vnpay.refundUrl ||
      !paymentRef.providerOrderId ||
      !paymentRef.providerTxnId ||
      !this.paymentCfg.vnpay.tmnCode ||
      !this.paymentCfg.vnpay.hashSecret
    ) {
      return {
        status: 'FAILED',
        raw: { note: 'VNPay refund API config missing' },
      };
    }

    const createDateFromMeta = paymentRef.metadata?.vnp_CreateDate;
    const txnDate = typeof createDateFromMeta === 'string' ? createDateFromMeta : null;
    if (!txnDate) {
      return {
        status: 'FAILED',
        raw: { note: 'VNPay refund API requires original vnp_CreateDate' },
      };
    }

    const originalAmount = Number(paymentRef.metadata?.vnp_Amount || 0);
    const refundAmount = amount ? Math.round(amount * 100) : originalAmount;
    const requestId = randomUUID().replace(/-/g, '');
    const payload: Record<string, string> = {
      vnp_RequestId: requestId,
      vnp_Version: this.version,
      vnp_Command: 'refund',
      vnp_TmnCode: this.paymentCfg.vnpay.tmnCode,
      vnp_TransactionType: amount ? '03' : '02',
      vnp_TxnRef: paymentRef.providerOrderId,
      vnp_Amount: String(refundAmount),
      vnp_TransactionNo: paymentRef.providerTxnId,
      vnp_TransactionDate: txnDate,
      vnp_CreateBy: 'system',
      vnp_CreateDate: this.toVnpDate(new Date()),
      vnp_IpAddr: '127.0.0.1',
      vnp_OrderInfo: `Refund payment ${paymentRef.providerOrderId}`,
    };
    payload.vnp_SecureHash = this.signPipe(payload, [
      'vnp_RequestId',
      'vnp_Version',
      'vnp_Command',
      'vnp_TmnCode',
      'vnp_TransactionType',
      'vnp_TxnRef',
      'vnp_Amount',
      'vnp_TransactionNo',
      'vnp_TransactionDate',
      'vnp_CreateBy',
      'vnp_CreateDate',
      'vnp_IpAddr',
      'vnp_OrderInfo',
    ]);

    const response = await this.postJson(this.paymentCfg.vnpay.refundUrl, payload);
    const responseCode = String(response.vnp_ResponseCode || '');
    const txStatus = String(response.vnp_TransactionStatus || '');
    const success = responseCode === '00' && txStatus === '00';

    return {
      status: success ? (amount ? 'PARTIAL_REFUND' : 'REFUNDED') : 'FAILED',
      raw: response,
    };
  }

  private buildSignedPaymentUrl(params: Record<string, string>) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce<Record<string, string>>((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});
    const signData = Object.keys(sortedParams)
      .map((k) => `${k}=${encodeURIComponent(sortedParams[k]).replace(/%20/g, '+')}`)
      .join('&');
    const secureHash = createHmac('sha512', this.paymentCfg.vnpay.hashSecret)
      .update(signData)
      .digest('hex');
    const url = new URL(this.paymentCfg.vnpay.payUrl);
    Object.entries(sortedParams).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set('vnp_SecureHash', secureHash);
    return url.toString();
  }

  private toVnpDate(d: Date): string {
    const plus7 = new Date(d.getTime() + 7 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${plus7.getUTCFullYear()}${pad(plus7.getUTCMonth() + 1)}${pad(plus7.getUTCDate())}${pad(
      plus7.getUTCHours(),
    )}${pad(plus7.getUTCMinutes())}${pad(plus7.getUTCSeconds())}`;
  }

  private signPipe(payload: Record<string, string>, fields: string[]): string {
    const data = fields.map((f) => payload[f] || '').join('|');
    return createHmac('sha512', this.paymentCfg.vnpay.hashSecret).update(data).digest('hex');
  }

  private async postJson(url: string, payload: Record<string, string>) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const raw = (await res.json()) as Record<string, unknown>;
    return raw;
  }

  private mapVnpStatus(responseCode: string, transactionStatus: string) {
    if (responseCode !== '00') return 'PROCESSING' as const;
    if (transactionStatus === '00') return 'SUCCESS' as const;
    if (transactionStatus === '24') return 'CANCELLED' as const;
    if (transactionStatus) return 'FAILED' as const;
    return 'PROCESSING' as const;
  }

  private mapIpnStatus(responseCode: string) {
    if (responseCode === '00') return 'SUCCESS' as const;
    if (responseCode === '24') return 'CANCELLED' as const;
    if (!responseCode) return 'PROCESSING' as const;
    return 'FAILED' as const;
  }

  private normalizeOrderInfo(input: string): string {
    return input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 _.-]/g, '')
      .trim()
      .slice(0, 255);
  }
}
