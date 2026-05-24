import { registerAs } from '@nestjs/config';

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export default registerAs('payments', () => ({
  providersEnabled: (process.env.PAYMENT_PROVIDERS_ENABLED || 'VNPAY,MOMO,PAYPAL')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
  reconcileIntervalMinutes: parseInt(process.env.PAYMENT_RECONCILE_INTERVAL_MINUTES || '5', 10),
  reconcileStaleMinutes: parseInt(process.env.PAYMENT_RECONCILE_STALE_MINUTES || '10', 10),
  schedulerEnabled: parseBoolean(process.env.PAYMENT_JOB_SCHEDULER_ENABLED, true),
  schedulerInitLockTtlMs: parseInt(process.env.PAYMENT_JOB_SCHEDULER_LOCK_TTL_MS || '30000', 10),

  vnpay: {
    tmnCode: process.env.VNPAY_TMN_CODE || '',
    hashSecret: process.env.VNPAY_HASH_SECRET || '',
    payUrl: process.env.VNPAY_PAY_URL || '',
    queryUrl: process.env.VNPAY_QUERY_URL || '',
    refundUrl: process.env.VNPAY_REFUND_URL || '',
    returnUrl: process.env.VNPAY_RETURN_URL || '',
    locale: process.env.VNPAY_LOCALE || 'vn',
    orderType: process.env.VNPAY_ORDER_TYPE || 'other',
  },
  momo: {
    partnerCode: process.env.MOMO_PARTNER_CODE || '',
    accessKey: process.env.MOMO_ACCESS_KEY || '',
    secretKey: process.env.MOMO_SECRET_KEY || '',
    apiUrl: process.env.MOMO_API_URL || '',
    returnUrl: process.env.MOMO_RETURN_URL || '',
    ipnUrl: process.env.MOMO_IPN_URL || '',
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
    apiUrl: process.env.PAYPAL_API_URL || '',
    verifyStrict: parseBoolean(process.env.PAYPAL_WEBHOOK_VERIFY_STRICT, false),
  },
}));
