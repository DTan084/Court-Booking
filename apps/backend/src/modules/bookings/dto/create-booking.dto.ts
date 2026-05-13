import { z } from 'zod';

export const createBookingSchema = z
  .object({
    courtId: z.string().uuid('Invalid court ID'),
    // Accept both UTC (Z) and offset (+07:00) ISO 8601 formats
    startTime: z
      .string()
      .datetime({ offset: true, message: 'Invalid start time format (must be ISO 8601)' }),
    endTime: z
      .string()
      .datetime({ offset: true, message: 'Invalid end time format (must be ISO 8601)' }),
    note: z.string().max(500, 'Ghi chú không được vượt quá 500 ký tự').optional(),
  })
  .refine((data) => new Date(data.startTime) < new Date(data.endTime), {
    message: 'Start time must be before end time',
    path: ['endTime'],
  });

export type CreateBookingDto = z.infer<typeof createBookingSchema>;
