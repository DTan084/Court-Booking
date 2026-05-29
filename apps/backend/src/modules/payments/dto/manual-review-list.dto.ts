import { z } from 'zod';

export const manualReviewListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['RECONCILING', 'SUCCESS', 'FAILED', 'CANCELLED']).optional(),
  providerOrderId: z.string().trim().min(1).max(200).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export type ManualReviewListDto = z.infer<typeof manualReviewListSchema>;
