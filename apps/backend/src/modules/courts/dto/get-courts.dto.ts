import { z } from 'zod';
import { SportType } from '@court-booking/shared';

export const getCourtsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  name: z.string().optional(),
  sportType: z.nativeEnum(SportType).optional(),
  address: z.string().optional(),
  district: z.string().optional(), // REQ-21.2: exact match filter
  location: z.string().optional(), // REQ-21.2: ILIKE search in address
});

export type GetCourtsDto = z.infer<typeof getCourtsSchema>;
