import { z } from 'zod';
import { SportType, CourtType, FacilityFeature } from '@court-booking/shared';

export const createCourtSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long').max(150),
  sportType: z.nativeEnum(SportType, {
    errorMap: () => ({ message: 'Invalid sport type' }),
  }),
  courtType: z.nativeEnum(CourtType, {
    errorMap: () => ({ message: 'Loại sân không hợp lệ' }),
  }),
  address: z.string().min(5, 'Address must be at least 5 characters long'),
  pricePerHour: z.number().min(0, 'Price must be positive'),
  description: z.string().max(5000, 'Mô tả sân không được vượt quá 5000 ký tự').optional(),
  features: z
    .array(z.nativeEnum(FacilityFeature))
    .optional()
    .default([])
    .transform((arr) => [...new Set(arr)]),
  district: z.string().max(100).optional(), // REQ-21.8
});

export type CreateCourtDto = z.infer<typeof createCourtSchema>;
