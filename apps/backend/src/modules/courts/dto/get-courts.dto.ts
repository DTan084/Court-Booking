import { z } from 'zod';
import { SportType, CourtType, FacilityFeature } from '@court-booking/shared';

const toArray = (value: unknown): unknown[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>);
  return [value];
};

export const getCourtsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  name: z.string().optional(),
  sportType: z.preprocess(toArray, z.array(z.nativeEnum(SportType)).optional()),
  courtType: z.nativeEnum(CourtType).optional(),
  features: z.preprocess(toArray, z.array(z.nativeEnum(FacilityFeature)).optional()),
  address: z.string().optional(),
  district: z.preprocess(toArray, z.array(z.string()).optional()), // REQ-21.2: exact match filter
  location: z.string().optional(), // REQ-21.2: ILIKE search in address
});

export type GetCourtsDto = z.infer<typeof getCourtsSchema>;
