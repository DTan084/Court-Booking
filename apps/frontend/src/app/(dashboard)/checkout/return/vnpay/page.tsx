import { redirect } from 'next/navigation';

interface VNPayReturnPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const toSingle = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

const extractBookingIdFromOrderInfo = (orderInfo: string | null): string | null => {
  if (!orderInfo) return null;
  const normalized = orderInfo.replace(/\+/g, ' ');
  const matched = normalized.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  );
  return matched?.[0] ?? null;
};

const extractPaymentIdFromTxnRef = (txnRef: string | null): string | null => {
  if (!txnRef) return null;
  if (txnRef.startsWith('VNPAY-')) {
    return txnRef.slice('VNPAY-'.length) || null;
  }
  return null;
};

const getBackendBaseUrl = (): string => {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001';
  return fromEnv.replace(/\/$/, '');
};

const triggerWebhookFallback = async (params: Record<string, string | string[] | undefined>) => {
  const forward = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) continue;
    if (!key.startsWith('vnp_')) continue;
    forward.set(key, value);
  }

  if (!forward.get('vnp_TxnRef') || !forward.get('vnp_SecureHash')) {
    return;
  }

  const webhookUrl = `${getBackendBaseUrl()}/api/v1/payments/vnpay/ipn?${forward.toString()}`;
  try {
    await fetch(webhookUrl, {
      method: 'GET',
      cache: 'no-store',
      // keep server redirect fast; this is best-effort fallback when IPN is delayed/missing
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // ignore timeout/network errors; regular IPN/reconcile still handles final consistency
  }
};

export default async function VNPayReturnPage({ searchParams }: VNPayReturnPageProps) {
  const params = await searchParams;
  const txnRef = toSingle(params.vnp_TxnRef);
  const bookingIdFromQuery = toSingle(params.bookingId);
  const orderInfo = toSingle(params.vnp_OrderInfo);
  const responseCode = toSingle(params.vnp_ResponseCode);
  const transactionStatus = toSingle(params.vnp_TransactionStatus);

  const bookingId = bookingIdFromQuery || extractBookingIdFromOrderInfo(orderInfo);
  const paymentId = extractPaymentIdFromTxnRef(txnRef);

  await triggerWebhookFallback(params);

  if (!bookingId) {
    redirect('/bookings?paymentReturn=invalid_booking_ref');
  }

  const next = new URLSearchParams();
  if (paymentId) next.set('paymentId', paymentId);
  if (txnRef) next.set('vnp_TxnRef', txnRef);
  if (responseCode) next.set('vnp_ResponseCode', responseCode);
  if (transactionStatus) next.set('vnp_TransactionStatus', transactionStatus);

  const query = next.toString();
  redirect(`/checkout/${bookingId}${query ? `?${query}` : ''}`);
}
