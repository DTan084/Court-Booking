import { z } from 'zod';
import { CourtType } from '@court-booking/shared';

export const courtBaseSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long').max(150),
  sportTypeId: z.string().uuid(),
  courtType: z.nativeEnum(CourtType, {
    errorMap: () => ({
      message: 'Invalid court type, only INDOOR or OUTDOOR is accepted',
    }),
  }),
  address: z.string().min(5, 'Address must be at least 5 characters long'),
  pricePerHour: z.number().min(0, 'Price must be positive'),
  description: z.string().max(5000, 'Court description must not exceed 5000 characters').optional(),
  district: z.string().max(100).optional(),
  isFeatured: z.boolean().optional(),
  maxPlayers: z.number().int().min(1, 'Maximum players must be at least 1').optional().nullable(),
});
export const createCourtSchema = courtBaseSchema;

export type CreateCourtDto = z.infer<typeof createCourtSchema>;
