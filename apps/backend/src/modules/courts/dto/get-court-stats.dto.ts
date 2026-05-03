import { z } from 'zod';

export const getCourtStatsSchema = z
  .object({
    fromDate: z.string().datetime({ message: 'Invalid fromDate format (must be ISO 8601)' }),
    toDate: z.string().datetime({ message: 'Invalid toDate format (must be ISO 8601)' }),
  })
  .refine((data) => new Date(data.fromDate) < new Date(data.toDate), {
    message: 'fromDate must be before toDate',
    path: ['fromDate'],
  });

export type GetCourtStatsDto = z.infer<typeof getCourtStatsSchema>;
