import { z } from 'zod';

export const createBookingSchema = z
  .object({
    courtId: z.string().uuid('Invalid court ID'),
    startTime: z.string().datetime({ message: 'Invalid start time format (must be ISO 8601)' }),
    endTime: z.string().datetime({ message: 'Invalid end time format (must be ISO 8601)' }),
  })
  .refine((data) => new Date(data.startTime) < new Date(data.endTime), {
    message: 'Start time must be before end time',
    path: ['endTime'],
  });

export type CreateBookingDto = z.infer<typeof createBookingSchema>;
