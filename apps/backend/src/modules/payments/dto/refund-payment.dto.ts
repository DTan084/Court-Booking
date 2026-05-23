import { z } from 'zod';

export const refundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().max(255).optional(),
});

export type RefundPaymentDto = z.infer<typeof refundPaymentSchema>;
