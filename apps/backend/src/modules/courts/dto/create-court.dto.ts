import { z } from 'zod';
import { SportType } from '@court-booking/shared';

export const createCourtSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters long').max(150),
  sportType: z.nativeEnum(SportType, {
    errorMap: () => ({ message: 'Invalid sport type' }),
  }),
  address: z.string().min(5, 'Address must be at least 5 characters long'),
  pricePerHour: z.number().min(0, 'Price must be positive'),
  description: z.string().max(500).optional(),
});

export type CreateCourtDto = z.infer<typeof createCourtSchema>;
