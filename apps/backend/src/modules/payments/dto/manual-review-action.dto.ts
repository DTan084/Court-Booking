import { z } from 'zod';

export const manualReviewActionSchema = z.object({
  action: z.enum(['RESOLVE', 'REQUEUE']),
  note: z.string().trim().max(500).optional(),
});

export type ManualReviewActionDto = z.infer<typeof manualReviewActionSchema>;
