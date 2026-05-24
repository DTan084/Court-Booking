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
    };

    const signData = Object.keys(payload)
      .sort()
      .map((k) => `${k}=${encodeURIComponent(String(payload[k])).replace(/%20/g, '+')}`)
      .join('&');
    payload.vnp_SecureHash = createHmac('sha512', cfg.vnpay.hashSecret)
      .update(signData)
      .digest('hex');

    const verification = await provider.verifyWebhook(payload);
    expect(verification.verified).toBe(true);
    expect(verification.paymentStatus).toBe('SUCCESS');
    expect(verification.providerOrderId).toBe('VNPAY-payment-1');
  });
});
