import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  bookingId: z.string().uuid(),
  provider: z.enum(['VNPAY', 'MOMO', 'PAYPAL']),
});

export type InitiatePaymentDto = z.infer<typeof initiatePaymentSchema>;
