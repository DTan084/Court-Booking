import { z } from 'zod';
const timeSlotSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startHour: z.coerce.number().int().min(0).max(23),
    endHour: z.coerce.number().int().min(1).max(24),
    price: z.coerce.number().min(0),
  })
  .refine((s) => s.startHour < s.endHour, {
    message: 'startHour must be less than endHour',
    path: ['endHour'],
  });

export const upsertTimeSlotsSchema = z.object({
  slots: z.array(timeSlotSchema).min(1),
});

export type UpsertTimeSlotsDto = z.infer<typeof upsertTimeSlotsSchema>;
