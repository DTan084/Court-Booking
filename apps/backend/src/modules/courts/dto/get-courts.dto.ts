import { z } from 'zod';
import { SportType } from '@court-booking/shared';

export const getCourtsSchema = z.object({
  page: z.preprocess((val) => Number(val ?? 1), z.number().min(1)).default(1),
  limit: z.preprocess((val) => Number(val ?? 10), z.number().min(1).max(50)).default(10),
  name: z.string().optional(),
  sportType: z.nativeEnum(SportType).optional(),
  address: z.string().optional(),
});

export type GetCourtsDto = z.infer<typeof getCourtsSchema>;
