import { z } from 'zod';
import { SportType, CourtType, FacilityFeature } from '@court-booking/shared';

export const getCourtsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  name: z.string().optional(),
  sportType: z.nativeEnum(SportType).optional(),
  courtType: z.nativeEnum(CourtType).optional(),
  features: z
    .union([z.nativeEnum(FacilityFeature), z.array(z.nativeEnum(FacilityFeature))])
    .optional()
    .transform((v) => (v ? (Array.isArray(v) ? v : [v]) : undefined)),
  address: z.string().optional(),
  district: z.string().optional(), // REQ-21.2: exact match filter
  location: z.string().optional(), // REQ-21.2: ILIKE search in address
});

export type GetCourtsDto = z.infer<typeof getCourtsSchema>;
