import { z } from 'zod';

export const manualReviewListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['RECONCILING', 'SUCCESS', 'FAILED', 'CANCELLED']).optional(),
});

export type ManualReviewListDto = z.infer<typeof manualReviewListSchema>;
