import { z } from 'zod';
import { BookingStatus } from '@court-booking/shared';

export const getMyBookingsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  status: z.nativeEnum(BookingStatus).optional(),
  statusGroup: z.enum(['failed']).optional(),
  fromDate: z
    .string()
    .datetime({ message: 'Invalid fromDate format (must be ISO 8601)' })
    .optional(),
  toDate: z.string().datetime({ message: 'Invalid toDate format (must be ISO 8601)' }).optional(),
});

export type GetMyBookingsDto = z.infer<typeof getMyBookingsSchema>;
