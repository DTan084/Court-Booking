import { z } from 'zod';

export const paymentLookupSchema = z
  .object({
    providerOrderId: z.string().min(1).max(200).optional(),
    providerTxnId: z.string().min(1).max(200).optional(),
  })
  .refine((v) => Boolean(v.providerOrderId || v.providerTxnId), {
    message: 'providerOrderId or providerTxnId is required',
    path: ['providerOrderId'],
  });

export type PaymentLookupDto = z.infer<typeof paymentLookupSchema>;
