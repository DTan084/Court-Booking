import { z } from 'zod';

export const refundPaymentSchema = z
  .object({
    amount: z.number().positive().optional(),
    percent: z.number().positive().max(100).optional(),
    reason: z.string().max(255).optional(),
  })
  .refine((data) => !(data.amount && data.percent), {
    message: 'Provide either amount or percent, not both',
    path: ['percent'],
  });

export type RefundPaymentDto = z.infer<typeof refundPaymentSchema>;
