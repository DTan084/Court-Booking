import { createHmac } from 'crypto';
import { VNPayProvider } from './vnpay.provider';
import paymentsConfig from '../../../config/payments.config';

describe('VNPayProvider', () => {
  const cfg = {
    vnpay: {
      tmnCode: 'TESTCODE',
      hashSecret: 'secret',
      payUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      queryUrl: '',
      refundUrl: '',
      returnUrl: 'http://localhost:3000/checkout/return/vnpay',
      locale: 'vn',
      orderType: 'other',
    },
  };

  const provider = new VNPayProvider(cfg as any);
  const signPayload = (payload: Record<string, unknown>) => {
    const signData = Object.keys(payload)
      .sort()
      .map((k) => `${k}=${encodeURIComponent(String(payload[k])).replace(/%20/g, '+')}`)
      .join('&');
    return createHmac('sha512', cfg.vnpay.hashSecret).update(signData).digest('hex');
  };

  it('should create signed payment url', async () => {
    const result = await provider.createPayment({
      paymentId: 'payment-1',
      bookingId: 'booking-1',
      amount: 100000,
      currency: 'VND',
    });

    expect(result.providerOrderId).toBe('VNPAY-payment-1');
    expect(result.paymentUrl).toContain('vnp_TmnCode=TESTCODE');
    expect(result.paymentUrl).toContain('vnp_SecureHash=');
  });

  it('should verify valid webhook signature and map SUCCESS', async () => {
    const payload: Record<string, unknown> = {
      vnp_TxnRef: 'VNPAY-payment-1',
      vnp_TransactionNo: '123456',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
    };
    payload.vnp_SecureHash = signPayload(payload);

    const verification = await provider.verifyWebhook(payload);
    expect(verification.verified).toBe(true);
    expect(verification.paymentStatus).toBe('SUCCESS');
    expect(verification.providerOrderId).toBe('VNPAY-payment-1');
    expect((verification.raw.normalized as any).mappedPaymentStatus).toBe('SUCCESS');
  });

  it('should map cancel response to CANCELLED', async () => {
    const payload: Record<string, unknown> = {
      vnp_TxnRef: 'VNPAY-payment-2',
      vnp_TransactionNo: '123457',
      vnp_ResponseCode: '24',
      vnp_TransactionStatus: '24',
    };
    payload.vnp_SecureHash = signPayload(payload);

    const verification = await provider.verifyWebhook(payload);
    expect(verification.verified).toBe(true);
    expect(verification.paymentStatus).toBe('CANCELLED');
  });

  it('should map pending-like response to PROCESSING for reconcile retry', async () => {
    const payload: Record<string, unknown> = {
      vnp_TxnRef: 'VNPAY-payment-3',
      vnp_TransactionNo: '123458',
      vnp_ResponseCode: '09',
    };
    payload.vnp_SecureHash = signPayload(payload);

    const verification = await provider.verifyWebhook(payload);
    expect(verification.verified).toBe(true);
    expect(verification.paymentStatus).toBe('PROCESSING');
  });
});
