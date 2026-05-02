import { z } from 'zod';

export const getScheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export type GetScheduleDto = z.infer<typeof getScheduleSchema>;
